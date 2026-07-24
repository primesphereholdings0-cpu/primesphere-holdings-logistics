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
    
    // Separate border and local trips
    const allTrips = data.trips.filter((t) => inRange(t.dispatch_date));
    const borderTrips = allTrips.filter((t) => t.trip_type !== "local");
    const localTrips = allTrips.filter((t) => t.trip_type === "local");
    
    const borderTripIds = new Set(borderTrips.map((t) => t.id));
    const localTripIds = new Set(localTrips.map((t) => t.id));
    
    const borderFins = data.financials.filter((f) => borderTripIds.has(f.trip_id));
    const localFins = data.financials.filter((f) => localTripIds.has(f.trip_id));
    
    const borderExps = data.expenses.filter((e) => borderTripIds.has(e.trip_id));
    const localExps = data.expenses.filter((e) => localTripIds.has(e.trip_id));
    
    const pays = data.payments.filter((p) => inRange(p.payment_date));

    // Border calculations (USD + TZS)
    const borderRevenueUsd = borderFins.reduce((s, f) => s + Number(f.contract_amount), 0);
    const borderRevenueTzs = borderFins.reduce((s, f) => s + Number(f.total_contract_tzs ?? Number(f.contract_amount) * Number(f.fx_exchange_rate)), 0);
    const borderExpensesTzs = borderExps.filter((e) => e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);
    const borderProfitTzs = borderRevenueTzs - borderExpensesTzs;
    const borderOutstandingAdv = borderFins.reduce((s, f) => s + Number(f.advance_paid_tzs), 0) -
      borderExps.filter((e) => e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);
    
    // Local calculations (TZS only)
    const localRevenueTzs = localFins.reduce((s, f) => s + Number(f.total_contract_tzs ?? Number(f.contract_amount) * Number(f.fx_exchange_rate)), 0);
    const localExpensesTzs = localExps.filter((e) => e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);
    const localProfitTzs = localRevenueTzs - localExpensesTzs;
    const localOutstandingAdv = localFins.reduce((s, f) => s + Number(f.advance_paid_tzs), 0) -
      localExps.filter((e) => e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);

    // Shared
    const salary = pays.filter((p) => p.payment_type === "Salary").reduce((s, p) => s + Number(p.amount_tzs), 0);
    const activeContracts = data.contracts.filter((c) => c.status === "Active").length;
    const maintenanceCost = data.maintenanceCost ?? 0;
    const borderProfitAfterMaintenance = borderProfitTzs - maintenanceCost;
    const localProfitAfterMaintenance = localProfitTzs - maintenanceCost;

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
        profitAfterMaintenance: borderProfitAfterMaintenance,
      },
      local: {
        trips: localTrips,
        fins: localFins,
        exps: localExps,
        revenueTzs: localRevenueTzs,
        expensesTzs: localExpensesTzs,
        profitTzs: localProfitTzs,
        outstandingAdv: localOutstandingAdv,
        profitAfterMaintenance: localProfitAfterMaintenance,
      },
      salary,
      activeContracts,
      maintenanceCost,
    };
  }, [data, from, to]);

  if (!data || !view) return <div className="min-h-screen bg-background"><div className="p-10 text-muted-foreground">Loading…</div></div>;

  const driverMap = new Map(data.drivers.map((d) => [d.id, d.full_name]));

  // Border profitability report
  const borderProfitability = view.border.trips.map((t) => {
    const f = view.border.fins.find((x) => x.trip_id === t.id);
    const rev = Number(f?.total_contract_tzs ?? 0);
    const exp = view.border.exps.filter((e) => e.trip_id === t.id && e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);
    return {
      trip_code: t.trip_code, route: t.origin_destination, status: t.status,
      revenue_tzs: rev, expenses_tzs: exp, profit_tzs: rev - exp,
      margin_pct: rev ? Number(((rev - exp) / rev * 100).toFixed(1)) : 0,
    };
  });

  // Local profitability report
  const localProfitability = view.local.trips.map((t) => {
    const f = view.local.fins.find((x) => x.trip_id === t.id);
    const rev = Number(f?.total_contract_tzs ?? 0);
    const exp = view.local.exps.filter((e) => e.trip_id === t.id && e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);
    return {
      trip_code: t.trip_code, route: t.origin_destination, status: t.status,
      revenue_tzs: rev, expenses_tzs: exp, profit_tzs: rev - exp,
      margin_pct: rev ? Number(((rev - exp) / rev * 100).toFixed(1)) : 0,
    };
  });

  const advanceRep = data.drivers.map((d) => {
    const dtrips = view.border.trips.filter((t) => t.driver_id === d.id);
    const adv = dtrips.reduce((s, t) => s + Number(view.border.fins.find((f) => f.trip_id === t.id)?.advance_paid_tzs ?? 0), 0);
    const spent = view.border.exps.filter((e) => e.status === "Verified" && dtrips.some((t) => t.id === e.trip_id)).reduce((s, e) => s + Number(e.amount_tzs), 0);
    return { driver: d.full_name, trips: dtrips.length, advance_tzs: adv, spent_tzs: spent, outstanding_tzs: adv - spent };
  });

  const salaryRep = data.drivers.map((d) => {
    const paid = view.border.trips.filter((t) => t.driver_id === d.id).length > 0 || view.local.trips.filter((t) => t.driver_id === d.id).length > 0
      ? view.border.pays?.filter((p) => p.driver_id === d.id && p.payment_type === "Salary").reduce((s, p) => s + Number(p.amount_tzs), 0) || 0
      : 0;
    // Using all trips for salary
    const allTripIds = [...view.border.trips.map(t => t.id), ...view.local.trips.map(t => t.id)];
    const allPays = data.payments.filter((p) => p.driver_id === d.id && p.payment_type === "Salary");
    const paid = allPays.reduce((s, p) => s + Number(p.amount_tzs), 0);
    return { driver: d.full_name, base_salary_tzs: d.monthly_salary_tzs, paid_tzs: paid };
  });

  const fuelRep = [...view.border.exps, ...view.local.exps].filter((e) => e.category === "Fuel").map((e) => ({
    trip_code: [...view.border.trips, ...view.local.trips].find((t) => t.id === e.trip_id)?.trip_code ?? "—",
    driver: driverMap.get([...view.border.trips, ...view.local.trips].find((t) => t.id === e.trip_id)?.driver_id ?? "") ?? "—",
    liters: Number(e.volume_liters ?? 0), amount_tzs: Number(e.amount_tzs), status: e.status, date: e.created_at.slice(0, 10),
  }));

  const revenueRep = [...view.border.trips, ...view.local.trips].map((t) => {
    const f = [...view.border.fins, ...view.local.fins].find((x) => x.trip_id === t.id);
    return { trip_code: t.trip_code, dispatch_date: t.dispatch_date, route: t.origin_destination,
      contract_usd: Number(f?.contract_amount ?? 0), contract_tzs: Number(f?.total_contract_tzs ?? 0), status: t.status };
  });

  const expenseRep = [...view.border.exps, ...view.local.exps].map((e) => ({
    trip_code: [...view.border.trips, ...view.local.trips].find((t) => t.id === e.trip_id)?.trip_code ?? "—",
    category: e.category, amount_tzs: Number(e.amount_tzs), status: e.status, date: e.created_at.slice(0, 10),
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

        {/* ===== BORDER SECTION ===== */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">Border Operations</h2>
            <span className="text-xs text-muted-foreground">Cross‑border freight (USD/TZS)</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KPI icon={<DollarSign className="h-4 w-4" />} label="Revenue" value={fmtUSD(view.border.revenueUsd)} sub={fmtTZS(view.border.revenueTzs)} tone="primary" />
            <KPI icon={<TrendingDown className="h-4 w-4" />} label="Expenses" value={fmtTZS(view.border.expensesTzs)} sub="Verified only" tone="warning" />
            <KPI icon={<TrendingUp className="h-4 w-4" />} label="Profit" value={fmtTZS(view.border.profitTzs)} sub="Revenue − expenses" tone={view.border.profitTzs >= 0 ? "success" : "destructive"} />
            <KPI icon={<Wrench className="h-4 w-4" />} label="Maintenance" value={fmtTZS(view.maintenanceCost)} sub="Completed jobs" tone="accent" />
            <KPI icon={<TrendingUp className="h-4 w-4" />} label="Net Profit" value={fmtTZS(view.border.profitAfterMaintenance)} sub="Profit − maintenance" tone={view.border.profitAfterMaintenance >= 0 ? "success" : "destructive"} />
            <KPI icon={<Wallet className="h-4 w-4" />} label="Outstanding Adv." value={fmtTZS(view.border.outstandingAdv)} sub="Advance − spent" tone="warning" />
          </div>
        </div>

        {/* ===== LOCAL SECTION ===== */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">Local Operations</h2>
            <span className="text-xs text-muted-foreground">Domestic routes (TZS)</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KPI icon={<DollarSign className="h-4 w-4" />} label="Revenue" value={fmtTZS(view.local.revenueTzs)} sub="Local trips" tone="primary" />
            <KPI icon={<TrendingDown className="h-4 w-4" />} label="Expenses" value={fmtTZS(view.local.expensesTzs)} sub="Verified only" tone="warning" />
            <KPI icon={<TrendingUp className="h-4 w-4" />} label="Profit" value={fmtTZS(view.local.profitTzs)} sub="Revenue − expenses" tone={view.local.profitTzs >= 0 ? "success" : "destructive"} />
            <KPI icon={<Wrench className="h-4 w-4" />} label="Maintenance" value={fmtTZS(view.maintenanceCost)} sub="Completed jobs" tone="accent" />
            <KPI icon={<TrendingUp className="h-4 w-4" />} label="Net Profit" value={fmtTZS(view.local.profitAfterMaintenance)} sub="Profit − maintenance" tone={view.local.profitAfterMaintenance >= 0 ? "success" : "destructive"} />
            <KPI icon={<Wallet className="h-4 w-4" />} label="Outstanding Adv." value={fmtTZS(view.local.outstandingAdv)} sub="Advance − spent" tone="warning" />
          </div>
        </div>

        {/* Shared salary & contracts */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          <KPI icon={<Users className="h-4 w-4" />} label="Salary costs" value={fmtTZS(view.salary)} sub="Payments in range" tone="accent" />
          <KPI icon={<FileText className="h-4 w-4" />} label="Active contracts" value={String(view.activeContracts)} sub="Signed & running" tone="primary" />
          <KPI icon={<Wrench className="h-4 w-4" />} label="Total maintenance" value={fmtTZS(view.maintenanceCost)} sub="All completed jobs" tone="accent" />
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
