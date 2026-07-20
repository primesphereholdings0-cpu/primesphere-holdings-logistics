import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  DollarSign,
  Fuel,
  Receipt,
  Wallet,
  MapPin,
} from "lucide-react";

import { AppHeader } from "@/components/fleet/AppHeader";
import { StatusBadge } from "@/components/fleet/StatusBadge";
import { AddExpenseDrawer } from "@/components/fleet/AddExpenseDrawer";
import { ReceiptViewer } from "@/components/fleet/ReceiptViewer";
import { tripDetailQuery } from "@/lib/queries";
import { fmtNum, fmtTZS, fmtUSD } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/trips/$tripId")({
  component: TripDetailPage,
});

const CATS = ["All", "Fuel", "Road Tolls", "Driver Millage", "Container Drop-off", "Miscellaneous"];

function TripDetailPage() {
  const { tripId } = Route.useParams();
  const { data, isLoading } = useQuery(tripDetailQuery(tripId));
  const [cat, setCat] = useState("All");

  const totals = useMemo(() => {
    const exps = data?.expenses ?? [];
    const verified = exps.filter((e) => e.status === "Verified").reduce((s, e) => s + Number(e.amount_tzs), 0);
    const pending = exps.filter((e) => e.status === "Pending").reduce((s, e) => s + Number(e.amount_tzs), 0);
    const all = exps.reduce((s, e) => s + Number(e.amount_tzs), 0);
    return { verified, pending, all };
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto max-w-[1200px] px-6 py-10 text-sm text-muted-foreground">Loading trip…</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto max-w-[1200px] px-6 py-10">
          <Link to="/" className="text-sm text-primary hover:underline">← Back to dashboard</Link>
          <div className="mt-6 text-lg font-semibold">Trip not found</div>
        </div>
      </div>
    );
  }

  const { trip, financial, vehicle, driver, expenses } = data;
  const advanceTzs = Number(financial?.advance_paid_tzs ?? 0);
  const cashRemaining = advanceTzs - totals.verified;
  const contractTzs = Number(financial?.total_contract_tzs ?? 0);

  const filtered = cat === "All" ? expenses : expenses.filter((e) => e.category === cat);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader right={<AddExpenseDrawer tripId={trip.id} />} />

      <div className="border-b bg-gradient-to-br from-primary/8 via-background to-accent/20">
        <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{trip.trip_code}</span>
                <StatusBadge status={trip.status} />
              </div>
              <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                <MapPin className="h-6 w-6 text-primary" />
                {trip.origin_destination}
              </h1>
              <div className="mt-1 text-sm text-muted-foreground">
                {vehicle?.reg_number ?? "—"} · {vehicle?.model ?? ""} · Driver{" "}
                <span className="font-medium text-foreground">{driver?.full_name ?? "—"}</span> ·{" "}
                {fmtNum(trip.planned_km)} km planned
              </div>
            </div>
          </div>

          {/* Financial banner */}
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <BannerCard
              icon={<DollarSign className="h-4 w-4" />}
              label="Contract total"
              primary={fmtUSD(financial?.contract_amount)}
              sub={fmtTZS(contractTzs)}
              tone="primary"
            />
            <BannerCard
              icon={<Wallet className="h-4 w-4" />}
              label="Advance paid"
              primary={fmtTZS(advanceTzs)}
              sub={`${fmtUSD(financial?.advance_paid_usd)} @ ${fmtNum(financial?.fx_exchange_rate)} TZS/USD`}
              tone="warning"
            />
            <BannerCard
              icon={<Receipt className="h-4 w-4" />}
              label="Expenses logged"
              primary={fmtTZS(totals.all)}
              sub={`${fmtTZS(totals.verified)} verified · ${fmtTZS(totals.pending)} pending`}
              tone="accent"
            />
            <BannerCard
              icon={<Banknote className="h-4 w-4" />}
              label="Driver cash remaining"
              primary={fmtTZS(cashRemaining)}
              sub={cashRemaining < 0 ? "OVERSPENT" : "Advance − verified expenses"}
              tone={cashRemaining < 0 ? "destructive" : "success"}
              emphasis
            />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1200px] px-4 md:px-6 py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Itemized expenses</h2>
            <p className="text-xs text-muted-foreground">Filter by category, review receipts, and audit the driver cash-flow.</p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={cat} onValueChange={setCat}>
              <TabsList>
                {CATS.map((c) => (
                  <TabsTrigger key={c} value={c} className="text-xs">{c}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <AddExpenseDrawer tripId={trip.id} />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium text-right">Volume</th>
                  <th className="px-4 py-3 font-medium text-right">Amount (TZS)</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No expenses in this category yet.
                    </td>
                  </tr>
                )}
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        {e.category === "Fuel" && <Fuel className="h-3.5 w-3.5 text-primary" />}
                        <span className="font-medium">{e.category}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{e.description || "—"}</td>
                    <td className="px-4 py-3 text-right tabular">
                      {e.volume_liters ? `${fmtNum(e.volume_liters)} L` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular">{fmtTZS(e.amount_tzs)}</td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-3"><ReceiptViewer path={e.receipt_url} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/60">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-muted-foreground">
                    Total expenses
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold tabular">{fmtTZS(totals.all)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function BannerCard({
  icon,
  label,
  primary,
  sub,
  tone,
  emphasis,
}: {
  icon: React.ReactNode;
  label: string;
  primary: string;
  sub: string;
  tone: "primary" | "success" | "warning" | "accent" | "destructive";
  emphasis?: boolean;
}) {
  const toneMap = {
    primary: "border-primary/30 bg-primary/8",
    success: "border-success/40 bg-success/10",
    warning: "border-warning/40 bg-warning/15",
    accent: "border-border bg-card",
    destructive: "border-destructive/40 bg-destructive/10",
  };
  const iconTone = {
    primary: "bg-primary/20 text-primary",
    success: "bg-success/20 text-success",
    warning: "bg-warning/25 text-warning-foreground dark:text-warning",
    accent: "bg-muted text-foreground",
    destructive: "bg-destructive/20 text-destructive",
  };
  return (
    <div className={cn("rounded-xl border p-4", toneMap[tone], emphasis && "ring-2 ring-primary/20")}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        <span className={cn("grid h-6 w-6 place-items-center rounded", iconTone[tone])}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-xl md:text-2xl font-bold tabular">{primary}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground tabular">{sub}</div>
    </div>
  );
}
