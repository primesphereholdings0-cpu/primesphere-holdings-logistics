import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, DollarSign, TrendingDown, TrendingUp, Wallet, Users, FileText, Wrench } from "lucide-react";

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
      { name: "description", content: "Local operations finance dashboard – revenue, expenses, and profitability." },
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
    // 🔥 FILTER: only local trips
    const trips = data.trips.filter((t) => inRange(t.dispatch_date) && t.trip_type === "local");
    const tripIds = new Set(trips.map((t) => t.id));
    const fins = data.financials.filter((f) => tripIds.has(f.trip_id));
    const exps = data.expenses.filter((e) => tripIds.has(e.trip_id));
    const pays = data.payments.filter((p) => inRange(p.payment_date));

    const revenueTzs = fins.reduce((s, f) => s + Number(f.total_contract_tzs ?? Number(f.contract_amount) * Number(f.fx_exchange_rate)), 0);
    const revenueUsd = fins.reduce((s, f) => s + Number(f.contract_amount), 0);
    const expensesTzs = exps.filter((e) => e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);
    const profitTzs = revenueTzs - expensesTzs;
    const outstandingAdv = fins.reduce((s, f) => s + Number(f.advance_paid_tzs), 0) -
      exps.filter((e) => e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);
    const salary = pays.filter((p) => p.payment_type === "Salary").reduce((s, p) => s + Number(p.amount_tzs), 0);
    const activeContracts = data.contracts.filter((c) => c.status === "Active").length;

    const maintenanceCost = data.maintenanceCost ?? 0;
    const profitAfterMaintenance = profitTzs - maintenanceCost;

    return { trips, fins, exps, pays, revenueTzs, revenueUsd, expensesTzs, profitTzs, outstandingAdv, salary, activeContracts, maintenanceCost, profitAfterMaintenance };
  }, [data, from, to]);

  if (!data || !view) return <div className="min-h-screen bg-background"><div className="p-10 text-muted-foreground">Loading…</div></div>;

  const driverMap = new Map(data.drivers.map((d) => [d.id, d.full_name]));

  const profitability = view.trips.map((t) => {
    const f = view.fins.find((x) => x.trip_id === t.id);
    const rev = Number(f?.total_contract_tzs ?? 0);
    const exp = view.exps.filter((e) => e.trip_id === t.id && e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);
    return {
      trip_code: t.trip_code, route: t.origin_destination, status: t.status,
      revenue_tzs: rev, expenses_tzs: exp, profit_tzs: rev - exp,
      margin_pct: rev ? Number(((rev - exp) / rev * 100).toFixed(1)) : 0,
    };
  });

  const advanceRep = data.drivers.map((d) => {
    const dtrips = view.trips.filter((t) => t.driver_id === d.id);
    const adv = dtrips.reduce((s, t) => s + Number(view.fins.find((f) => f.trip_id === t.id)?.advance_paid_tzs ?? 0), 0);
    const spent = view.exps.filter((e) => e.status === "Verified" && dtrips.some((t) => t.id === e.trip_id)).reduce((s, e) => s + Number(e.amount_tzs), 0);
    return { driver: d.full_name, trips: dtrips.length, advance_tzs: adv, spent_tzs: spent, outstanding_tzs: adv - spent };
  });

  const salaryRep = data.drivers.map((d) => {
    const paid = view.pays.filter((p) => p.driver_id === d.id && p.payment_type === "Salary").reduce((s, p) => s + Number(p.amount_tzs), 0);
    return { driver: d.full_name, base_salary_tzs: d.monthly_salary_tzs, paid_tzs: paid };
  });

  const fuelRep = view.exps.filter((e) => e.category === "Fuel").map((e) => ({
    trip_code: view.trips.find((t) => t.id === e.trip_id)?.trip_code ?? "—",
    driver: driverMap.get(view.trips.find((t) => t.id === e.trip_id)?.driver_id ?? "") ?? "—",
    liters: Number(e.volume_liters ?? 0), amount_tzs: Number(e.amount_tzs), status: e.status, date: e.created_at.slice(0, 10),
  }));

  const revenueRep = view.trips.map((t) => {
    const f = view.fins.find((x) => x.trip_id === t.id);
    return { trip_code: t.trip_code, dispatch_date: t.dispatch_date, route: t.origin_destination,
      contract_usd: Number(f?.contract_amount ?? 0), contract_tzs: Number(f?.total_contract_tzs ?? 0), status: t.status };
  });

  const expenseRep = view.exps.map((e) => ({
    trip_code: view.trips.find((t) => t.id === e.trip_id)?.trip_code ?? "—",
    category: e.category, amount_tzs: Number(e.amount_tzs), status: e.status, date: e.created_at.slice(0, 10),
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-xl px-4 py-3 md:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Finance &amp; Reports</h1>
          <p className="text-xs text-muted-foreground">Local operations – revenue, expenses, and profitability.</p>
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] px-4 md:px-6 py-6">
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
          <div className="grid gap-1.5"><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
          <div className="grid gap-1.5"><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
          <Button variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); }}>Reset</Button>
        </div>

        {/* Main KPI row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 mb-8">
          <KPI icon={<DollarSign className="h-4 w-4" />} label="Local revenue" value={fmtTZS(view.revenueTzs)} sub={fmtUSD(view.revenueUsd)} tone="primary" />
          <KPI icon={<TrendingDown className="h-4 w-4" />} label="Local expenses" value={fmtTZS(view.expensesTzs)} sub="Verified only" tone="warning" />
          <KPI icon={<TrendingUp className="h-4 w-4" />} label="Local profit" value={fmtTZS(view.profitTzs)} sub="Revenue − expenses" tone={view.profitTzs >= 0 ? "success" : "destructive"} />
          <KPI icon={<Wrench className="h-4 w-4" />} label="Fleet maintenance" value={fmtTZS(view.maintenanceCost)} sub="Completed jobs" tone="accent" />
          <KPI icon={<TrendingUp className="h-4 w-4" />} label="Net profit" value={fmtTZS(view.profitAfterMaintenance)} sub="Profit − maintenance" tone={view.profitAfterMaintenance >= 0 ? "success" : "destructive"} />
          <KPI icon={<Wallet className="h-4 w-4" />} label="Outstanding advances" value={fmtTZS(view.outstandingAdv)} sub="Advance − spent" tone="warning" />
          <KPI icon={<Users className="h-4 w-4" />} label="Salary costs" value={fmtTZS(view.salary)} sub="Payments in range" tone="accent" />
        </div>

        {/* Local Report Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <ReportCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Revenue"
            value={fmtTZS(view.revenueTzs)}
            sub="Local trips"
            tone="primary"
          />
          <ReportCard
            icon={<TrendingDown className="h-5 w-5" />}
            label="Expenses"
            value={fmtTZS(view.expensesTzs)}
            sub="Local trip expenses"
            tone="warning"
          />
          <ReportCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Trip Profit"
            value={fmtTZS(view.profitTzs)}
            sub="Revenue − Expenses"
            tone={view.profitTzs >= 0 ? "success" : "destructive"}
          />
          <ReportCard
            icon={<Wallet className="h-5 w-5" />}
            label="Net Profit"
            value={fmtTZS(view.profitAfterMaintenance)}
            sub="After maintenance costs"
            tone={view.profitAfterMaintenance >= 0 ? "success" : "destructive"}
          />
        </div>

        <Tabs defaultValue="profit">
          <TabsList className="flex-wrap">
            <TabsTrigger value="profit">Trip Profitability</TabsTrigger>
            <TabsTrigger value="advance">Driver Advance</TabsTrigger>
            <TabsTrigger value="salary">Driver Salary</TabsTrigger>
            <TabsTrigger value="fuel">Fuel Consumption</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="expense">Expense</TabsTrigger>
          </TabsList>
          <TabsContent value="profit"><ReportTable name="local-trip-profitability" rows={profitability} /></TabsContent>
          <TabsContent value="advance"><ReportTable name="local-driver-advance" rows={advanceRep} /></TabsContent>
          <TabsContent value="salary"><ReportTable name="driver-salary" rows={salaryRep} /></TabsContent>
          <TabsContent value="fuel"><ReportTable name="local-fuel-consumption" rows={fuelRep} /></TabsContent>
          <TabsContent value="revenue"><ReportTable name="local-revenue" rows={revenueRep} /></TabsContent>
          <TabsContent value="expense"><ReportTable name="local-expense" rows={expenseRep} /></TabsContent>
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

function ReportCard({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone: "primary" | "success" | "warning" | "destructive" | "accent" }) {
  const borderMap = {
    primary: "border-primary/30",
    success: "border-success/40",
    warning: "border-warning/40",
    destructive: "border-destructive/40",
    accent: "border-border",
  };
  const iconMap = {
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/25 text-warning-foreground dark:text-warning",
    destructive: "bg-destructive/15 text-destructive",
    accent: "bg-muted text-foreground",
  };
  return (
    <div className={cn("rounded-xl border bg-card p-5 shadow-sm", borderMap[tone])}>
      <div className="flex items-center gap-2">
        <div className={cn("grid h-9 w-9 place-items-center rounded-lg", iconMap[tone])}>{icon}</div>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      </div>
      <div className="mt-2 text-2xl font-bold tabular">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
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
