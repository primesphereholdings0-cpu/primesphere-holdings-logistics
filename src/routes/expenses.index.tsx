import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Receipt, Wallet, CheckCircle2, Clock, XCircle, Search, ArrowUpRight, FileText,
} from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/fleet/AppHeader";
import { ReceiptViewer } from "@/components/fleet/ReceiptViewer";
import { StatusBadge } from "@/components/fleet/StatusBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { expensesQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { fmtTZS } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/expenses/")({
  head: () => ({
    meta: [
      { title: "Expenses — FleetPulse" },
      { name: "description", content: "Ledger of every trip expense — fuel, tolls, parking and more." },
      { property: "og:title", content: "Expenses — FleetPulse" },
      { property: "og:description", content: "Verify, filter and audit fleet expenses across every trip." },
    ],
  }),
  component: ExpensesPage,
});

const STATUSES = ["All", "Pending", "Verified", "Rejected"];

function ExpensesPage() {
  const qc = useQueryClient();
  const { data: expenses = [], isLoading } = useQuery(expensesQuery);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => {
    const set = new Set(expenses.map((e) => e.category));
    return ["All", ...Array.from(set).sort()];
  }, [expenses]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (status !== "All" && e.status !== status) return false;
      if (category !== "All" && e.category !== category) return false;
      if (!s) return true;
      return (
        e.trip_code.toLowerCase().includes(s) ||
        e.origin_destination.toLowerCase().includes(s) ||
        (e.driver_name ?? "").toLowerCase().includes(s) ||
        (e.vehicle_reg ?? "").toLowerCase().includes(s) ||
        (e.description ?? "").toLowerCase().includes(s) ||
        e.category.toLowerCase().includes(s)
      );
    });
  }, [expenses, search, status, category]);

  const totals = useMemo(() => {
    return expenses.reduce(
      (a, e) => {
        const amt = Number(e.amount_tzs);
        a.total += amt;
        if (e.status === "Verified") a.verified += amt;
        else if (e.status === "Pending") a.pending += amt;
        return a;
      },
      { total: 0, verified: 0, pending: 0 },
    );
  }, [expenses]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase.from("trip_expenses").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Expense updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b bg-gradient-to-br from-primary/8 via-background to-accent/20">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8">
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
            <Receipt className="h-3 w-3 text-primary" /> Expense audit
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">Expenses</h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            Every voucher and receipt from the field — filter, verify and audit fleet spend in one ledger.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard icon={<Wallet className="h-5 w-5" />} tone="primary" label="Total logged" value={fmtTZS(totals.total)} />
            <StatCard icon={<CheckCircle2 className="h-5 w-5" />} tone="success" label="Verified" value={fmtTZS(totals.verified)} />
            <StatCard icon={<Clock className="h-5 w-5" />} tone="warning" label="Pending review" value={fmtTZS(totals.pending)} />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] px-4 md:px-6 py-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search trip, driver, vehicle, description…"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Trip</th>
                  <th className="px-4 py-3 font-medium">Driver / Vehicle</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Receipt</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">Loading expenses…</td></tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    {expenses.length === 0 ? "No expenses logged yet." : "No expenses match these filters."}
                  </td></tr>
                )}
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 transition">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(e.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to="/trips/$tripId"
                        params={{ tripId: e.trip_id }}
                        className="inline-flex items-center gap-1 font-mono text-xs font-semibold hover:text-primary"
                      >
                        {e.trip_code}
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                        {e.origin_destination}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{e.driver_name ?? <span className="text-muted-foreground">—</span>}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{e.vehicle_reg ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[240px] truncate">
                      {e.description ?? "—"}
                      {e.volume_liters ? (
                        <span className="ml-1 text-[11px] text-muted-foreground">({e.volume_liters} L)</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right tabular font-semibold">{fmtTZS(Number(e.amount_tzs))}</td>
                    <td className="px-4 py-3">
                      {e.receipt_url ? (
                        <ReceiptViewer path={e.receipt_url} />
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <FileText className="h-3 w-3" /> None
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {e.status !== "Verified" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 text-success hover:text-success"
                            onClick={() => updateStatus.mutate({ id: e.id, newStatus: "Verified" })}
                            disabled={updateStatus.isPending}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Verify
                          </Button>
                        )}
                        {e.status !== "Rejected" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn("h-7 gap-1 text-destructive hover:text-destructive")}
                            onClick={() => updateStatus.mutate({ id: e.id, newStatus: "Rejected" })}
                            disabled={updateStatus.isPending}
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon, label, value, tone,
}: {
  icon: React.ReactNode; label: string; value: string; tone: "primary" | "success" | "warning";
}) {
  const toneMap = {
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/25 text-warning-foreground dark:text-warning",
  };
  return (
    <div className="metric-card p-5 shadow-sm">
      <div className={cn("grid h-10 w-10 place-items-center rounded-lg", toneMap[tone])}>{icon}</div>
      <div className="mt-4 text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl md:text-3xl font-bold tracking-tight tabular">{value}</div>
    </div>
  );
}
