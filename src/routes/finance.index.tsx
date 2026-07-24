import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, DollarSign, TrendingDown, TrendingUp, Wallet, Users, FileText, Wrench, Truck } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { financeOverviewQuery } from "@/lib/queries";
import { fmtTZS, fmtUSD, fmtNum } from "@/lib/format";
import { downloadCsv } from "@/lib/export";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/finance/")({
  component: FinancePage,
  head: () => ({
    meta: [
      { title: "Finance & Reports — Primesphere Holdings Logistics" },
      { name: "description", content: "Border and local operations finance dashboard." },
    ],
  }),
});

function FinancePage() {
  const { data } = useQuery(financeOverviewQuery);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const view = useMemo(() => {
    if (!data) return null;
    const inRange = (d: string | null) => {
      if (!d) return true;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    };

    // Use data directly – it already has separate border/local objects
    const border = data.border;
    const local = data.local;

    // Filter trips by date range if needed (the query already filters? No, we need to apply date filters here as well)
    // We'll filter trips inside each object, but they are already filtered in the query? 
    // The query doesn't accept date params, so we filter here.
    const filteredBorderTrips = border.trips.filter((t) => inRange(t.dispatch_date));
    const filteredLocalTrips = local.trips.filter((t) => inRange(t.dispatch_date));

    // Recalculate based on filtered trips
    const borderTripIds = new Set(filteredBorderTrips.map((t) => t.id));
    const localTripIds = new Set(filteredLocalTrips.map((t) => t.id));

    const borderFins = data.financials.filter((f) => borderTripIds.has(f.trip_id));
    const localFins = data.financials.filter((f) => localTripIds.has(f.trip_id));

    const borderExps = data.expenses.filter((e) => borderTripIds.has(e.trip_id));
    const localExps = data.expenses.filter((e) => localTripIds.has(e.trip_id));

    // We also need to filter payments by date
    const pays = data.payments.filter((p) => inRange(p.payment_date));

    // Recalculate metrics for border and local
    const borderRevenueUsd = borderFins.reduce((s, f) => s + Number(f.contract_amount), 0);
    const borderRevenueTzs = borderFins.reduce((s, f) => s + Number(f.total_contract_tzs ?? Number(f.contract_amount) * Number(f.fx_exchange_rate)), 0);
    const borderExpensesTzs = borderExps.filter((e) => e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);
    const borderProfitTzs = borderRevenueTzs - borderExpensesTzs;
    const borderOutstandingAdv = borderFins.reduce((s, f) => s + Number(f.advance_paid_tzs), 0) -
      borderExps.filter((e) => e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);

    // Salary and maintenance for border (we can use the precomputed from data, but we need to filter drivers by type?)
    // The query already splits salary based on driver_type and maintenance based on trip_type, but we need to filter by date? 
    // Salary and maintenance are not date-sensitive in the query, so we keep them as is.
    const borderSalary = data.border.salary; // already computed
    const borderMaintenance = data.border.maintenance; // already computed
    const borderNetProfit = borderProfitTzs - borderSalary - borderMaintenance;

    // Local
    const localRevenueTzs = localFins.reduce((s, f) => s + Number(f.total_contract_tzs ?? Number(f.contract_amount) * Number(f.fx_exchange_rate)), 0);
    const localExpensesTzs = localExps.filter((e) => e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);
    const localProfitTzs = localRevenueTzs - localExpensesTzs;
    const localOutstandingAdv = localFins.reduce((s, f) => s + Number(f.advance_paid_tzs), 0) -
      localExps.filter((e) => e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);

    const localSalary = data.local.salary;
    const localMaintenance = data.local.maintenance;
    const localNetProfit = localProfitTzs - localSalary - localMaintenance;

    // Shared
    const salary = pays.filter((p) => p.payment_type === "Salary").reduce((s, p) => s + Number(p.amount_tzs), 0);
    const activeContracts = data.contracts.filter((c) => c.status === "Active").length;
    const totalMaintenance = borderMaintenance + localMaintenance;

    return {
      border: {
        trips: filteredBorderTrips,
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
        trips: filteredLocalTrips,
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
      pays,
      salary,
      activeContracts,
      totalMaintenance,
    };
  }, [data, from, to]);

  if (!data || !view) return <div className="min-h-screen bg-background"><div className="p-10 text-muted-foreground">Loading…</div></div>;

  const driverMap = new Map(data.drivers.map((d) => [d.id, d.full_name]));

  // Border profitability
  const borderProfitability = view.border.trips.map((t) => {
    const f = view.border.fins.find((x) => x.trip_id === t.id);
    const rev = Number(f?.total_contract_tzs ?? 0);
    const exp = view.border.exps.filter((e) => e.trip_id === t.id && e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);
    return {
      trip_code: t.trip_code,
      route: t.origin_destination,
      status: t.status,
      revenue_tzs: rev,
      expenses_tzs: exp,
      profit_tzs: rev - exp,
      margin_pct: rev ? Number(((rev - exp) / rev * 100).toFixed(1)) : 0,
    };
  });

  // Local profitability
  const localProfitability = view.local.trips.map((t) => {
    const f = view.local.fins.find((x) => x.trip_id === t.id);
    const rev = Number(f?.total_contract_tzs ?? 0);
    const exp = view.local.exps.filter((e) => e.trip_id === t.id && e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);
    return {
      trip_code: t.trip_code,
      route: t.origin_destination,
      status: t.status,
      revenue_tzs: rev,
      expenses_tzs: exp,
      profit_tzs: rev - exp,
      margin_pct: rev ? Number(((rev - exp) / rev * 100).toFixed(1)) : 0,
    };
  });

  // Driver advance report – using all trips (border + local) because advances can be on any trip
  const allTrips = [...view.border.trips, ...view.local.trips];
  const allFins = [...view.border.fins, ...view.local.fins];
  const allExps = [...view.border.exps, ...view.local.exps];

  const advanceRep = data.drivers.map((d) => {
    const dtrips = allTrips.filter((t) => t.driver_id === d.id);
    const adv = dtrips.reduce((s, t) => s + Number(allFins.find((f) => f.trip_id === t.id)?.advance_paid_tzs ?? 0), 0);
    const spent = allExps.filter((e) => e.status === "Verified" && dtrips.some((t) => t.id === e.trip_id)).reduce((s, e) => s + Number(e.amount_tzs), 0);
    return { driver: d.full_name, trips: dtrips.length, advance_tzs: adv, spent_tzs: spent, outstanding_tzs: adv - spent };
  });

  // Salary report – all drivers
  const salaryRep = data.drivers.map((d) => {
    const paid = (view.pays || [])
      .filter((p) => p.driver_id === d.id && p.payment_type === "Salary")
      .reduce((s, p) => s + Number(p.amount_tzs), 0);
    return { driver: d.full_name, base_salary_tzs: d.monthly_salary_tzs, paid_tzs: paid };
  });

  // Fuel consumption
  const fuelRep = allExps.filter((e) => e.category === "Fuel").map((e) => ({
    trip_code: allTrips.find((t) => t.id === e.trip_id)?.trip_code ?? "—",
    driver: driverMap.get(allTrips.find((t) => t.id === e.trip_id)?.driver_id ?? "") ?? "—",
    liters: Number(e.volume_liters ?? 0),
    amount_tzs: Number(e.amount_tzs),
    status: e.status,
    date: e.created_at.slice(0, 10),
  }));

  // Revenue report
  const revenueRep = allTrips.map((t) => {
    const f = allFins.find((x) => x.trip_id === t.id);
    return {
      trip_code: t.trip_code,
      dispatch_date: t.dispatch_date,
      route: t.origin_destination,
      contract_usd: Number(f?.contract_amount ?? 0),
      contract_tzs: Number(f?.total_contract_tzs ?? 0),
      status: t.status,
    };
  });

  // Expense report
  const expenseRep = allExps.map((e) => ({
    trip_code: allTrips.find((t) => t.id === e.trip_id)?.trip_code ?? "—",
    category: e.category,
    amount_tzs: Number(e.amount_tzs),
    status: e.status,
    date: e.created_at.slice(0, 10),
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-xl px-4 py-3 md:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Finance &amp; Reports</h1>
          <p className="text-xs text-muted-foreground">Border (USD/TZS) and Local (TZS) operations.</p>
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] px-4 md:px-6 py-6">
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
          <div className="grid gap-1.5"><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
          <div className="grid gap-1.5"><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
          <Button variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); }}>Reset</Button>
        </div>

        {/* Border Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">Border Operations</h2>
            <span className="text-xs text-muted-foreground">Cross‑border freight (USD/TZS)</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
            <KPI icon={<DollarSign className="h-4 w-4" />} label="Revenue" value={fmtUSD(view.border.revenueUsd)} sub={fmtTZS(view.border.revenueTzs)} tone="primary" />
            <KPI icon={<TrendingDown className="h-4 w-4" />} label="Expenses" value={fmtTZS(view.border.expensesTzs)} sub="Verified" tone="warning" />
            <KPI icon={<TrendingUp className="h-4 w-4" />} label="Profit" value={fmtTZS(view.border.profitTzs)} sub="Revenue − expenses" tone={view.border.profitTzs >= 0 ? "success" : "destructive"} />
            <KPI icon={<Users className="h-4 w-4" />} label="Salary" value={fmtTZS(view.border.salary)} sub="Border drivers" tone="accent" />
            <KPI icon={<Wrench className="h-4 w-4" />} label="Maintenance" value={fmtTZS(view.border.maintenance)} sub="Border maintenance" tone="accent" />
            <KPI icon={<TrendingUp className="h-4 w-4" />} label="Net Profit" value={fmtTZS(view.border.netProfit)} sub="After salary & maintenance" tone={view.border.netProfit >= 0 ? "success" : "destructive"} />
            <KPI icon={<Wallet className="h-4 w-4" />} label="Outstanding Adv." value={fmtTZS(view.border.outstandingAdv)} sub="Advance − spent" tone="warning" />
          </div>
        </div>

        {/* Local Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">Local Operations</h2>
            <span className="text-xs text-muted-foreground">Domestic routes (TZS)</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
            <KPI icon={<DollarSign className="h-4 w-4" />} label="Revenue" value={fmtTZS(view.local.revenueTzs)} sub="Local trips" tone="primary" />
            <KPI icon={<TrendingDown className="h-4 w-4" />} label="Expenses" value={fmtTZS(view.local.expensesTzs)} sub="Verified" tone="warning" />
            <KPI icon={<TrendingUp className="h-4 w-4" />} label="Profit" value={fmtTZS(view.local.profitTzs)} sub="Revenue − expenses" tone={view.local.profitTzs >= 0 ? "success" : "destructive"} />
            <KPI icon={<Users className="h-4 w-4" />} label="Salary" value={fmtTZS(view.local.salary)} sub="Local drivers" tone="accent" />
            <KPI icon={<Wrench className="h-4 w-4" />} label="Maintenance" value={fmtTZS(view.local.maintenance)} sub="Local maintenance" tone="accent" />
            <KPI icon={<TrendingUp className="h-4 w-4" />} label="Net Profit" value={fmtTZS(view.local.netProfit)} sub="After salary & maintenance" tone={view.local.netProfit >= 0 ? "success" : "destructive"} />
            <KPI icon={<Wallet className="h-4 w-4" />} label="Outstanding Adv." value={fmtTZS(view.local.outstandingAdv)} sub="Advance − spent" tone="warning" />
          </div>
        </div>

        {/* Shared KPIs */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          <KPI icon={<Users className="h-4 w-4" />} label="Total Salary" value={fmtTZS(view.salary)} sub="All drivers" tone="accent" />
          <KPI icon={<FileText className="h-4 w-4" />} label="Active contracts" value={String(view.activeContracts)} sub="Signed & running" tone="primary" />
          <KPI icon={<Wrench className="h-4 w-4" />} label="Total maintenance" value={fmtTZS(view.totalMaintenance)} sub="All completed jobs" tone="accent" />
        </div>

        <Tabs defaultValue="border">
          <TabsList className="flex-wrap">
            <TabsTrigger value="border">Border Profitability</TabsTrigger>
            <TabsTrigger value="local">Local Profitability</TabsTrigger>
            <TabsTrigger value="advance">Driver Advance</TabsTrigger>
            <TabsTrigger value="salary">Driver Salary</TabsTrigger>
            <TabsTrigger value="fuel">Fuel Consumption</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="expense">Expense</TabsTrigger>
          </TabsList>
          <TabsContent value="border"><ReportTable name="border-profitability" rows={borderProfitability} /></TabsContent>
          <TabsContent value="local"><ReportTable name="local-profitability" rows={localProfitability} /></TabsContent>
          <TabsContent value="advance"><ReportTable name="driver-advance" rows={advanceRep} /></TabsContent>
          <TabsContent value="salary"><ReportTable name="driver-salary" rows={salaryRep} /></TabsContent>
          <TabsContent value="fuel"><ReportTable name="fuel-consumption" rows={fuelRep} /></TabsContent>
          <TabsContent value="revenue"><ReportTable name="revenue" rows={revenueRep} /></TabsContent>
          <TabsContent value="expense"><ReportTable name="expense" rows={expenseRep} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function KPI({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone: "primary" | "success" | "warning" | "destructive" | "accent" }) {
  const map = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/20 text-warning-foreground dark:text-warning",
    destructive: "bg-destructive/10 text-destructive",
    accent: "bg-muted text-foreground",
  };
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className={cn("mb-2 inline-grid h-8 w-8 place-items-center rounded", map[tone])}>{icon}</div>
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold tabular">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function ReportTable({ name, rows }: { name: string; rows: Record<string, unknown>[] }) {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => downloadCsv(`${name}.csv`, rows)} className="gap-1.5"><Download className="h-4 w-4" />CSV</Button>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5"><Download className="h-4 w-4" />PDF (print)</Button>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0">
              <tr>{headers.map((h) => <th key={h} className="px-4 py-3 font-medium">{h.replace(/_/g, " ")}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={Math.max(headers.length, 1)} className="px-4 py-10 text-center text-muted-foreground">No data.</td></tr>}
              {rows.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  {headers.map((h) => {
                    const v = r[h];
                    const isNum = typeof v === "number";
                    return <td key={h} className={cn("px-4 py-2", isNum && "text-right tabular")}>{isNum ? fmtNum(v as number) : String(v ?? "—")}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
