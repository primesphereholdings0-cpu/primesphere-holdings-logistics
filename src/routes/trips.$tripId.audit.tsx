import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowLeft, Download, Printer, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/fleet/StatusBadge";
import { Button } from "@/components/ui/button";
import { tripDetailQuery } from "@/lib/queries";
import { fmtNum, fmtTZS, fmtUSD } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv } from "@/lib/export";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trips/$tripId/audit")({
  component: AuditPage,
  head: ({ params }) => ({
    meta: [
      { title: `Trip Audit — Primesphere Holdings Logistics` },
      { name: "description", content: "Trip settlement and financial audit view." },
    ],
  }),
});

const BREAKDOWN_CATS = ["Fuel", "Road Tolls", "Driver Millage", "Container Drop-off", "Miscellaneous"];

function AuditPage() {
  const { tripId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(tripDetailQuery(tripId));

  const totals = useMemo(() => {
    const exps = data?.expenses ?? [];
    const approved = exps.filter((e) => e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);
    const all = exps.reduce((s, e) => s + Number(e.amount_tzs), 0);
    const byCat = new Map<string, number>();
    for (const e of exps) {
      if (e.status !== "Verified") continue;
      byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount_tzs));
    }
    return { approved, all, byCat };
  }, [data]);

  const settle = useMutation({
    mutationFn: async (next: "Completed" | "Audited") => {
      const patch: { status: string; settled_at?: string; audited_at?: string } = { status: next };
      if (next === "Completed") patch.settled_at = new Date().toISOString();
      if (next === "Audited") patch.audited_at = new Date().toISOString();
      const { error } = await supabase.from("trips").update(patch).eq("id", tripId);
      if (error) throw error;
      await supabase.from("audit_logs").insert({ action: `trip.${next.toLowerCase()}`, entity: "trip", entity_id: tripId, payload: { status: next } });
    },
    onSuccess: (_d, next) => {
      qc.invalidateQueries({ queryKey: ["trip", tripId] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success(`Trip marked ${next}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="min-h-screen bg-background"><div className="p-10 text-muted-foreground">Loading…</div></div>;
  if (!data) return <div className="min-h-screen bg-background"><div className="p-10">Trip not found.</div></div>;

  const { trip, financial, vehicle, driver, expenses } = data;
  const contractUsd = Number(financial?.contract_amount ?? 0);
  const fxRate = Number(financial?.fx_exchange_rate ?? 1);
  const contractTzs = Number(financial?.total_contract_tzs ?? contractUsd * fxRate);
  const advanceTzs = Number(financial?.advance_paid_tzs ?? 0);
  const advanceUsd = Number(financial?.advance_paid_usd ?? 0);
  const driverCashRemaining = advanceTzs - totals.approved;
  const clientBalanceUsd = contractUsd - advanceUsd;
  const estProfit = contractTzs - totals.all;

  const exportCsv = () => {
    downloadCsv(`${trip.trip_code}-audit.csv`, expenses.map((e) => ({
      category: e.category, description: e.description ?? "",
      amount_tzs: e.amount_tzs, volume_liters: e.volume_liters ?? "", status: e.status, created_at: e.created_at,
    })));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Page header – no AppHeader */}
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-xl px-4 py-3 md:px-6 flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/trips" })}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{trip.trip_code}</span>
              <StatusBadge status={trip.status} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Trip Audit &amp; Settlement</h1>
            <div className="text-xs text-muted-foreground">
              {trip.origin_destination} · {vehicle?.reg_number ?? "—"} · Driver{" "}
              <span className="font-medium text-foreground">{driver?.full_name ?? "—"}</span> · {fmtNum(trip.planned_km)} km
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5"><Download className="h-4 w-4" />CSV</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5"><Printer className="h-4 w-4" />Print/PDF</Button>
          <Button variant="outline" size="sm" onClick={() => settle.mutate("Completed")} disabled={trip.status === "Audited"} className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" />Mark Settled
          </Button>
          <Button size="sm" onClick={() => settle.mutate("Audited")} disabled={trip.status === "Audited"} className="gap-1.5">
            <ShieldCheck className="h-4 w-4" />Mark Audited
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-[1200px] px-4 md:px-6 py-8 space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Financial summary</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SumCard label="Contract amount" primary={fmtUSD(contractUsd)} sub={`FX ${fmtNum(fxRate)} · ${fmtTZS(contractTzs)}`} />
            <SumCard label="Advance paid" primary={fmtTZS(advanceTzs)} sub={fmtUSD(advanceUsd)} />
            <SumCard label="Total approved expenses" primary={fmtTZS(totals.approved)} sub={`${fmtTZS(totals.all)} logged incl. pending`} />
            <SumCard label="Driver cash remaining" primary={fmtTZS(driverCashRemaining)} sub={driverCashRemaining < 0 ? "OVERSPENT" : "Advance − approved"} tone={driverCashRemaining < 0 ? "destructive" : "success"} />
            <SumCard label="Client balance due" primary={fmtUSD(clientBalanceUsd)} sub={`${fmtUSD(contractUsd)} − ${fmtUSD(advanceUsd)}`} tone="primary" />
            <SumCard label="Estimated profit" primary={fmtTZS(estProfit)} sub="Contract TZS − total expenses" tone={estProfit >= 0 ? "success" : "destructive"} />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Expense breakdown (approved)</h2>
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium text-right">Amount</th><th className="px-4 py-3 font-medium text-right">% of contract</th></tr>
              </thead>
              <tbody>
                {BREAKDOWN_CATS.map((c) => {
                  const amt = totals.byCat.get(c) ?? 0;
                  const pct = contractTzs ? (amt / contractTzs) * 100 : 0;
                  return (
                    <tr key={c} className="border-b last:border-0">
                      <td className="px-4 py-3">{c}</td>
                      <td className="px-4 py-3 text-right tabular">{fmtTZS(amt)}</td>
                      <td className="px-4 py-3 text-right tabular text-muted-foreground">{pct.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-muted/60">
                <tr>
                  <td className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Total approved</td>
                  <td className="px-4 py-3 text-right text-base font-bold tabular">{fmtTZS(totals.approved)}</td>
                  <td className="px-4 py-3 text-right tabular text-muted-foreground">
                    {contractTzs ? ((totals.approved / contractTzs) * 100).toFixed(1) : "0"}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function SumCard({ label, primary, sub, tone = "accent" }: { label: string; primary: string; sub: string; tone?: "primary" | "success" | "destructive" | "accent" }) {
  const map = {
    primary: "border-primary/30 bg-primary/8",
    success: "border-success/40 bg-success/10",
    destructive: "border-destructive/40 bg-destructive/10",
    accent: "border-border bg-card",
  };
  return (
    <div className={cn("rounded-xl border p-4", map[tone])}>
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold tabular">{primary}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground tabular">{sub}</div>
    </div>
  );
}
