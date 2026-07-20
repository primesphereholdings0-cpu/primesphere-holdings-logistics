import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Vehicle = {
  id: string;
  reg_number: string;
  model: string;
  capacity_tons: number;
  status: string;
};
export type Driver = { id: string; full_name: string; phone: string | null; license_number: string | null };
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
