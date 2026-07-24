import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ========== TYPES ==========
export type Vehicle = {
  id: string;
  reg_number: string;
  model: string;
  capacity_tons: number;
  status: string;
  created_at: string;
};

export type Driver = {
  id: string;
  full_name: string;
  phone: string | null;
  license_number: string | null;
  monthly_salary_tzs: number;
  base_location: string | null;
  created_at?: string;
  driver_type: string; // 'border' | 'local' | 'both'
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
  customer_id: string | null;
  contract_id: string | null;
  settled_at: string | null;
  audited_at: string | null;
  created_at: string;
  trip_type: string;
  quantity: number;
  rate_per_unit: number;
  local_calculation_type: string;
  invoice_id: string | null;
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
  created_at: string;
  customer_paid_tzs: number;
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

export type Customer = {
  id: string;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string;
  created_at: string;
};

export type Contract = {
  id: string;
  customer_id: string;
  route: string;
  contract_currency: string;
  contract_amount: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  contract_type?: string;
  renewal_date?: string | null;
  termination_date?: string | null;
  notice_period_days?: number | null;
  auto_renew?: boolean;
};

export type CompanySettings = {
  id: string;
  company_name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  tin: string | null;
  default_currency: string;
  default_fx_rate: number;
  notifications_enabled: boolean;
  updated_at: string;
};

export type UserRole = {
  id: string;
  user_id: string;
  display_name: string | null;
  role: "admin" | "dispatcher" | "finance" | "driver";
  created_at: string;
};

export type AuditLog = {
  id: string;
  actor: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  payload: unknown;
  created_at: string;
};

export type TripRow = Trip & {
  vehicle: Vehicle | null;
  driver: Driver | null;
  financial: TripFinancial | null;
  expenses_sum: number;
};

export type VehicleRow = Vehicle & {
  active_trips: number;
  total_trips: number;
  total_km: number;
  revenue_tzs: number;
};

export type DriverRow = Driver & {
  active_trips: number;
  total_trips: number;
  trip_advance_tzs: number;
  salary_paid_tzs: number;
  extra_advance_tzs: number;
};

export type ExpenseRow = TripExpense & {
  trip_code: string;
  origin_destination: string;
  driver_name: string | null;
  vehicle_reg: string | null;
};

export type CustomerRow = Customer & {
  trip_count: number;
  contract_count: number;
  revenue_usd: number;
};

export type Invoice = {
  id: string;
  customer_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  subtotal_tzs: number;
  vat_percent: number;
  vat_amount_tzs: number;
  total_amount_tzs: number;
  paid_amount_tzs: number;
  status: "Draft" | "Sent" | "Partially Paid" | "Paid";
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer | null;
  trips?: TripRow[] | null;
};

export type VehicleMaintenance = {
  id: string;
  vehicle_id: string;
  maintenance_date: string;
  description: string;
  cost_tzs: number;
  duration_hours: number | null;
  status: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  trip_type: string; // 'border' | 'local' | 'both'
  vehicle?: { reg_number: string; model: string } | null;
};

// ========== QUERIES ==========

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

export const expensesQuery = queryOptions({
  queryKey: ["expenses", "all"],
  queryFn: async (): Promise<ExpenseRow[]> => {
    const [{ data: exps, error }, { data: trips }, { data: drivers }, { data: vehicles }] =
      await Promise.all([
        supabase.from("trip_expenses").select("*").order("created_at", { ascending: false }),
        supabase.from("trips").select("id, trip_code, origin_destination, driver_id, vehicle_id"),
        supabase.from("drivers").select("id, full_name"),
        supabase.from("vehicles").select("id, reg_number"),
      ]);
    if (error) throw error;
    const tMap = new Map((trips ?? []).map((t) => [t.id, t]));
    const dMap = new Map((drivers ?? []).map((d) => [d.id, d.full_name]));
    const vMap = new Map((vehicles ?? []).map((v) => [v.id, v.reg_number]));
    return (exps ?? []).map((e) => {
      const t = tMap.get(e.trip_id);
      return {
        ...(e as TripExpense),
        trip_code: t?.trip_code ?? "—",
        origin_destination: t?.origin_destination ?? "—",
        driver_name: t?.driver_id ? dMap.get(t.driver_id) ?? null : null,
        vehicle_reg: t?.vehicle_id ? vMap.get(t.vehicle_id) ?? null : null,
      };
    });
  },
});

export const customersQuery = queryOptions({
  queryKey: ["customers"],
  queryFn: async () => {
    const { data, error } = await supabase.from("customers").select("*").order("company_name");
    if (error) throw error;
    return data as Customer[];
  },
});

export const customersOverviewQuery = queryOptions({
  queryKey: ["customers", "overview"],
  queryFn: async (): Promise<CustomerRow[]> => {
    const [{ data: customers, error }, { data: trips }, { data: fins }, { data: contracts }] = await Promise.all([
      supabase.from("customers").select("*").order("company_name"),
      supabase.from("trips").select("id, customer_id"),
      supabase.from("trip_financials").select("trip_id, contract_amount"),
      supabase.from("contracts").select("customer_id"),
    ]);
    if (error) throw error;
    const finMap = new Map((fins ?? []).map((f) => [f.trip_id, Number(f.contract_amount)]));
    return (customers ?? []).map((c) => {
      const ctrips = (trips ?? []).filter((t) => t.customer_id === c.id);
      const rev = ctrips.reduce((s, t) => s + (finMap.get(t.id) ?? 0), 0);
      return {
        ...(c as Customer),
        trip_count: ctrips.length,
        contract_count: (contracts ?? []).filter((x) => x.customer_id === c.id).length,
        revenue_usd: rev,
      };
    });
  },
});

export const customerDetailQuery = (customerId: string) =>
  queryOptions({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const [{ data: customer }, { data: contracts }, { data: trips }] = await Promise.all([
        supabase.from("customers").select("*").eq("id", customerId).maybeSingle(),
        supabase.from("contracts").select("*").eq("customer_id", customerId).order("created_at", { ascending: false }),
        supabase.from("trips").select("*").eq("customer_id", customerId).order("created_at", { ascending: false }),
      ]);
      if (!customer) return null;
      const tripIds = (trips ?? []).map((t) => t.id);
      const { data: fins } = tripIds.length
        ? await supabase.from("trip_financials").select("*").in("trip_id", tripIds)
        : { data: [] as TripFinancial[] };
      const fMap = new Map((fins ?? []).map((f) => [f.trip_id, f as TripFinancial]));
      return {
        customer: customer as Customer,
        contracts: (contracts ?? []) as Contract[],
        trips: (trips as Trip[]).map((t) => ({ ...t, financial: fMap.get(t.id) ?? null })),
      };
    },
  });

export const companySettingsQuery = queryOptions({
  queryKey: ["company_settings"],
  queryFn: async () => {
    const { data } = await supabase.from("company_settings").select("*").limit(1).maybeSingle();
    return data as CompanySettings | null;
  },
});

export const userRolesQuery = queryOptions({
  queryKey: ["user_roles"],
  queryFn: async () => {
    const { data, error } = await supabase.from("user_roles").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data as UserRole[];
  },
});

export const auditLogsQuery = queryOptions({
  queryKey: ["audit_logs"],
  queryFn: async () => {
    const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data as AuditLog[];
  },
});

// ===== INVOICE QUERIES =====
export const invoicesQuery = queryOptions({
  queryKey: ["invoices"],
  queryFn: async (): Promise<Invoice[]> => {
    const { data, error } = await supabase
      .from("invoices")
      .select("*, customer:customers(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Invoice[];
  },
});

export const invoiceDetailQuery = (invoiceId: string) =>
  queryOptions({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const { data: invoice, error } = await supabase
        .from("invoices")
        .select("*, customer:customers(*)")
        .eq("id", invoiceId)
        .maybeSingle();
      if (error) throw error;
      if (!invoice) return null;
      const { data: trips } = await supabase
        .from("trips")
        .select("*, vehicle:vehicles(*), driver:drivers(*), financial:trip_financials(*)")
        .eq("invoice_id", invoiceId);
      return { ...invoice, trips: trips ?? [] } as Invoice & { trips: TripRow[] };
    },
  });

// ===== UPDATED FINANCE OVERVIEW =====
export const financeOverviewQuery = queryOptions({
  queryKey: ["finance", "overview"],
  queryFn: async () => {
    const [
      { data: trips },
      { data: fins },
      { data: exps },
      { data: pays },
      { data: drivers },
      { data: contracts },
      { data: maintenance },
    ] = await Promise.all([
      supabase.from("trips").select("*"),
      supabase.from("trip_financials").select("*"),
      supabase.from("trip_expenses").select("*"),
      supabase.from("driver_payments").select("*"),
      supabase.from("drivers").select("*"),
      supabase.from("contracts").select("*"),
      supabase.from("vehicle_maintenance").select("*"), // now includes trip_type
    ]);

    // Separate border and local trips
    const borderTrips = (trips ?? []).filter((t) => t.trip_type !== "local");
    const localTrips = (trips ?? []).filter((t) => t.trip_type === "local");

    const borderTripIds = new Set(borderTrips.map((t) => t.id));
    const localTripIds = new Set(localTrips.map((t) => t.id));

    const borderFins = (fins ?? []).filter((f) => borderTripIds.has(f.trip_id));
    const localFins = (fins ?? []).filter((f) => localTripIds.has(f.trip_id));

    const borderExps = (exps ?? []).filter((e) => borderTripIds.has(e.trip_id));
    const localExps = (exps ?? []).filter((e) => localTripIds.has(e.trip_id));

    // Border Revenue (USD + TZS)
    const borderRevenueUsd = borderFins.reduce((s, f) => s + Number(f.contract_amount), 0);
    const borderRevenueTzs = borderFins.reduce((s, f) => s + Number(f.total_contract_tzs ?? Number(f.contract_amount) * Number(f.fx_exchange_rate)), 0);
    const borderExpensesTzs = borderExps.filter((e) => e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);
    const borderProfitTzs = borderRevenueTzs - borderExpensesTzs;
    const borderOutstandingAdv = borderFins.reduce((s, f) => s + Number(f.advance_paid_tzs), 0) -
      borderExps.filter((e) => e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);

    // Local Revenue (TZS only)
    const localRevenueTzs = localFins.reduce((s, f) => s + Number(f.total_contract_tzs ?? Number(f.contract_amount) * Number(f.fx_exchange_rate)), 0);
    const localExpensesTzs = localExps.filter((e) => e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);
    const localProfitTzs = localRevenueTzs - localExpensesTzs;
    const localOutstandingAdv = localFins.reduce((s, f) => s + Number(f.advance_paid_tzs), 0) -
      localExps.filter((e) => e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);

    // Driver Salary – split by driver_type
    const driverTypeMap = new Map((drivers ?? []).map((d) => [d.id, d.driver_type || "both"]));
    const borderDrivers = (drivers ?? []).filter((d) => driverTypeMap.get(d.id) === "border" || driverTypeMap.get(d.id) === "both");
    const localDrivers = (drivers ?? []).filter((d) => driverTypeMap.get(d.id) === "local" || driverTypeMap.get(d.id) === "both");

    const allPayments = pays ?? [];
    const borderSalary = allPayments
      .filter((p) => p.payment_type === "Salary" && borderDrivers.some((d) => d.id === p.driver_id))
      .reduce((s, p) => s + Number(p.amount_tzs), 0);
    const localSalary = allPayments
      .filter((p) => p.payment_type === "Salary" && localDrivers.some((d) => d.id === p.driver_id))
      .reduce((s, p) => s + Number(p.amount_tzs), 0);

    // Maintenance – split by trip_type
    const borderMaintenance = (maintenance ?? [])
      .filter((m) => m.status === "Completed" && (m.trip_type === "border" || m.trip_type === "both"))
      .reduce((s, m) => s + Number(m.cost_tzs), 0);
    const localMaintenance = (maintenance ?? [])
      .filter((m) => m.status === "Completed" && (m.trip_type === "local" || m.trip_type === "both"))
      .reduce((s, m) => s + Number(m.cost_tzs), 0);

    // Net profits
    const borderNetProfit = borderProfitTzs - borderSalary - borderMaintenance;
    const localNetProfit = localProfitTzs - localSalary - localMaintenance;

    const activeContracts = (contracts ?? []).filter((c) => c.status === "Active").length;

    return {
      border: {
        trips: borderTrips,
        fins: borderFins,
        exps: borderExps,
        revenueUsd: borderRevenueUsd,
        revenueTzs: borderRevenueTzs,
        expensesTzs: borderExpensesTzs,
        profitTzs: borderProfitTzs,
        outstandingAdv: borderOutstandingAdv,
        salary: borderSalary,
        maintenance: borderMaintenance,
        netProfit: borderNetProfit,
      },
      local: {
        trips: localTrips,
        fins: localFins,
        exps: localExps,
        revenueTzs: localRevenueTzs,
        expensesTzs: localExpensesTzs,
        profitTzs: localProfitTzs,
        outstandingAdv: localOutstandingAdv,
        salary: localSalary,
        maintenance: localMaintenance,
        netProfit: localNetProfit,
      },
      activeContracts,
      totalInvoiced: 0, // can be added separately
      totalPaid: 0,
    };
  },
});

export const contractsQuery = queryOptions({
  queryKey: ["contracts"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Contract[];
  },
});

// ========== MAINTENANCE QUERIES ==========
export const maintenanceQuery = queryOptions({
  queryKey: ["maintenance"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("vehicle_maintenance")
      .select(`
        *,
        vehicle:vehicles(reg_number, model)
      `)
      .order("maintenance_date", { ascending: false });
    if (error) throw error;
    return data as (VehicleMaintenance & { vehicle: { reg_number: string; model: string } | null })[];
  },
});

export const vehicleMaintenanceQuery = (vehicleId: string) =>
  queryOptions({
    queryKey: ["maintenance", "vehicle", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_maintenance")
        .select(`
          *,
          vehicle:vehicles(reg_number, model)
        `)
        .eq("vehicle_id", vehicleId)
        .order("maintenance_date", { ascending: false });
      if (error) throw error;
      return data as (VehicleMaintenance & { vehicle: { reg_number: string; model: string } | null })[];
    },
  });
