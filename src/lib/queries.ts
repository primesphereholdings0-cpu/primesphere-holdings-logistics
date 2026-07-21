import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Vehicle = {
  id: string;
  reg_number: string;
  model: string;
  capacity_tons: number;
  status: string;
};
export type Driver = {
  id: string;
  full_name: string;
  phone: string | null;
  license_number: string | null;
  monthly_salary_tzs: number;
  base_location: string | null;
  created_at?: string;
};
export type DriverPayment = {
  id: string;
  driver_id: string;
  payment_type: string;
  amount_tzs: number;
  payment_date: string;
  period_label: string | null;
  reference_trip: string | null;
  notes: string | null;
  created_at: string;
};
export type Trip = {
  id: string;
  trip_code: string;
  origin_destination: string;
  vehicle_id: string | null;
  driver_id: string | null;
  planned_km: number;
  dispatch_date: string | null;
  return_date: string | null;
  status: string;
};
export type TripFinancial = {
  id: string;
  trip_id: string;
  contract_currency: string;
  contract_amount: number;
  fx_exchange_rate: number;
  total_contract_tzs: number;
  advance_input_type: string;
  advance_value: number;
  advance_paid_usd: number;
  advance_paid_tzs: number;
};
export type TripExpense = {
  id: string;
  trip_id: string;
  category: string;
  description: string | null;
  volume_liters: number | null;
  amount_tzs: number;
  receipt_url: string | null;
  status: string;
  created_at: string;
};

export type TripRow = Trip & {
  vehicle: Vehicle | null;
  driver: Driver | null;
  financial: TripFinancial | null;
  expenses_sum: number;
};

export const vehiclesQuery = queryOptions({
  queryKey: ["vehicles"],
  queryFn: async () => {
    const { data, error } = await supabase.from("vehicles").select("*").order("reg_number");
    if (error) throw error;
    return data as Vehicle[];
  },
});

export const driversQuery = queryOptions({
  queryKey: ["drivers"],
  queryFn: async () => {
    const { data, error } = await supabase.from("drivers").select("*").order("full_name");
    if (error) throw error;
    return data as Driver[];
  },
});

export const tripsQuery = queryOptions({
  queryKey: ["trips"],
  queryFn: async (): Promise<TripRow[]> => {
    const { data: trips, error } = await supabase
      .from("trips")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const ids = (trips ?? []).map((t) => t.id);
    if (ids.length === 0) return [];
    const [{ data: vehicles }, { data: drivers }, { data: fins }, { data: exps }] = await Promise.all([
      supabase.from("vehicles").select("*"),
      supabase.from("drivers").select("*"),
      supabase.from("trip_financials").select("*").in("trip_id", ids),
      supabase.from("trip_expenses").select("trip_id, amount_tzs, status").in("trip_id", ids),
    ]);
    const vMap = new Map((vehicles ?? []).map((v) => [v.id, v]));
    const dMap = new Map((drivers ?? []).map((d) => [d.id, d]));
    const fMap = new Map((fins ?? []).map((f) => [f.trip_id, f]));
    const eMap = new Map<string, number>();
    for (const e of exps ?? []) {
      if (e.status === "Verified") eMap.set(e.trip_id, (eMap.get(e.trip_id) ?? 0) + Number(e.amount_tzs));
    }
    return (trips as Trip[]).map((t) => ({
      ...t,
      vehicle: (vMap.get(t.vehicle_id ?? "") as Vehicle) ?? null,
      driver: (dMap.get(t.driver_id ?? "") as Driver) ?? null,
      financial: (fMap.get(t.id) as TripFinancial) ?? null,
      expenses_sum: eMap.get(t.id) ?? 0,
    }));
  },
});

export const tripDetailQuery = (tripId: string) =>
  queryOptions({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const [{ data: trip }, { data: fin }, { data: exps }] = await Promise.all([
        supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
        supabase.from("trip_financials").select("*").eq("trip_id", tripId).maybeSingle(),
        supabase
          .from("trip_expenses")
          .select("*")
          .eq("trip_id", tripId)
          .order("created_at", { ascending: false }),
      ]);
      if (!trip) return null;
      const [{ data: vehicle }, { data: driver }] = await Promise.all([
        trip.vehicle_id
          ? supabase.from("vehicles").select("*").eq("id", trip.vehicle_id).maybeSingle()
          : Promise.resolve({ data: null }),
        trip.driver_id
          ? supabase.from("drivers").select("*").eq("id", trip.driver_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return {
        trip: trip as Trip,
        financial: (fin as TripFinancial) ?? null,
        expenses: (exps ?? []) as TripExpense[],
        vehicle: (vehicle as Vehicle) ?? null,
        driver: (driver as Driver) ?? null,
      };
    },
  });

export type DriverRow = Driver & {
  active_trips: number;
  total_trips: number;
  trip_advance_tzs: number;
  salary_paid_tzs: number;
  extra_advance_tzs: number;
};

export const driversOverviewQuery = queryOptions({
  queryKey: ["drivers", "overview"],
  queryFn: async (): Promise<DriverRow[]> => {
    const [{ data: drivers, error }, { data: trips }, { data: fins }, { data: pays }] =
      await Promise.all([
        supabase.from("drivers").select("*").order("full_name"),
        supabase.from("trips").select("id, driver_id, status"),
        supabase.from("trip_financials").select("trip_id, advance_paid_tzs"),
        supabase.from("driver_payments").select("driver_id, payment_type, amount_tzs"),
      ]);
    if (error) throw error;
    const finMap = new Map((fins ?? []).map((f) => [f.trip_id, Number(f.advance_paid_tzs)]));
    return (drivers ?? []).map((d) => {
      const dtrips = (trips ?? []).filter((t) => t.driver_id === d.id);
      const active = dtrips.filter((t) => t.status === "In-Transit" || t.status === "Dispatched").length;
      const tripAdvance = dtrips.reduce((s, t) => s + (finMap.get(t.id) ?? 0), 0);
      const dpays = (pays ?? []).filter((p) => p.driver_id === d.id);
      const salary = dpays.filter((p) => p.payment_type === "Salary").reduce((s, p) => s + Number(p.amount_tzs), 0);
      const extra = dpays.filter((p) => p.payment_type === "Advance").reduce((s, p) => s + Number(p.amount_tzs), 0);
      return {
        ...(d as Driver),
        active_trips: active,
        total_trips: dtrips.length,
        trip_advance_tzs: tripAdvance,
        salary_paid_tzs: salary,
        extra_advance_tzs: extra,
      };
    });
  },
});

export const driverDetailQuery = (driverId: string) =>
  queryOptions({
    queryKey: ["driver", driverId],
    queryFn: async () => {
      const [{ data: driver }, { data: trips }, { data: payments }] = await Promise.all([
        supabase.from("drivers").select("*").eq("id", driverId).maybeSingle(),
        supabase
          .from("trips")
          .select("*")
          .eq("driver_id", driverId)
          .order("created_at", { ascending: false }),
        supabase
          .from("driver_payments")
          .select("*")
          .eq("driver_id", driverId)
          .order("payment_date", { ascending: false }),
      ]);
      if (!driver) return null;
      const tripIds = (trips ?? []).map((t) => t.id);
      const [{ data: fins }, { data: vehicles }] = await Promise.all([
        tripIds.length
          ? supabase.from("trip_financials").select("*").in("trip_id", tripIds)
          : Promise.resolve({ data: [] as TripFinancial[] }),
        supabase.from("vehicles").select("*"),
      ]);
      const fMap = new Map((fins ?? []).map((f) => [f.trip_id, f as TripFinancial]));
      const vMap = new Map((vehicles ?? []).map((v) => [v.id, v as Vehicle]));
      return {
        driver: driver as Driver,
        trips: (trips as Trip[]).map((t) => ({
          ...t,
          financial: fMap.get(t.id) ?? null,
          vehicle: (vMap.get(t.vehicle_id ?? "") as Vehicle) ?? null,
        })),
        payments: (payments ?? []) as DriverPayment[],
      };
    },
  });

export type VehicleRow = Vehicle & {
  active_trips: number;
  total_trips: number;
  total_km: number;
  revenue_tzs: number;
};

export const vehiclesOverviewQuery = queryOptions({
  queryKey: ["vehicles", "overview"],
  queryFn: async (): Promise<VehicleRow[]> => {
    const [{ data: vehicles, error }, { data: trips }, { data: fins }] = await Promise.all([
      supabase.from("vehicles").select("*").order("reg_number"),
      supabase.from("trips").select("id, vehicle_id, status, planned_km"),
      supabase.from("trip_financials").select("trip_id, total_contract_tzs, contract_amount, fx_exchange_rate"),
    ]);
    if (error) throw error;
    const finMap = new Map(
      (fins ?? []).map((f) => [
        f.trip_id,
        Number(f.total_contract_tzs ?? Number(f.contract_amount) * Number(f.fx_exchange_rate)),
      ]),
    );
    return (vehicles ?? []).map((v) => {
      const vtrips = (trips ?? []).filter((t) => t.vehicle_id === v.id);
      const active = vtrips.filter((t) => t.status === "In-Transit" || t.status === "Dispatched").length;
      const km = vtrips.reduce((s, t) => s + Number(t.planned_km ?? 0), 0);
      const rev = vtrips.reduce((s, t) => s + (finMap.get(t.id) ?? 0), 0);
      return {
        ...(v as Vehicle),
        active_trips: active,
        total_trips: vtrips.length,
        total_km: km,
        revenue_tzs: rev,
      };
    });
  },
});

