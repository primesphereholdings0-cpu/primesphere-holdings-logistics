import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Activity,
  Banknote,
  Fuel,
  DollarSign,
  ArrowUpRight,
  MapPin,
  Truck,
  Plus,
} from "lucide-react";

import { NewTripDialog } from "@/components/fleet/NewTripDialog";
import { StatusBadge } from "@/components/fleet/StatusBadge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { tripsQuery } from "@/lib/queries";
import { fmtNum, fmtTZS, fmtUSD } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

type Filter = "all" | "in-transit" | "pending" | "completed";

function DashboardPage() {
  const { data: trips = [], isLoading } = useQuery(tripsQuery);
  const [filter, setFilter] = useState<Filter>("all");

  const metrics = useMemo(() => {
    const inTransit = trips.filter((t) => t.status === "In-Transit" || t.status === "Dispatched").length;
    const revenueUsd = trips.reduce((s, t) => s + Number(t.financial?.contract_amount ?? 0), 0);
    const cashTzs = trips.reduce((s, t) => s + Number(t.financial?.advance_paid_tzs ?? 0), 0);
    return { inTransit, revenueUsd, cashTzs };
  }, [trips]);

  const { data: fuelLiters = 0 } = useQuery({
    queryKey: ["fuel-liters"],
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_expenses")
        .select("volume_liters, category")
        .eq("category", "Fuel");
      return (data ?? []).reduce((s, r) => s + Number(r.volume_liters ?? 0), 0);
    },
  });

  const filtered = trips.filter((t) => {
    if (filter === "all") return true;
    if (filter === "in-transit") return t.status === "In-Transit" || t.status === "Dispatched";
    if (filter === "pending") return t.status === "Completed" && t.expenses_sum > 0;
    if (filter === "completed") return t.status === "Completed" || t.status === "Audited";
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Page header with title and actions */}
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-xl px-4 py-3 md:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground">Real-time fleet overview</p>
        </div>
        <NewTripDialog>
          <Button size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            New Trip
          </Button>
        </NewTripDialog>
      </div>

      {/* Hero band with metrics – now without the hero text (moved to header) */}
      <div className="relative border-b bg-gradient-to-br from-primary/8 via-background to-accent/20">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={<Truck className="h-5 w-5" />}
              label="Active in-transit trips"
              value={isLoading ? "—" : String(metrics.inTransit)}
              hint="Currently on the road"
              tone="primary"
            />
            <MetricCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Total revenue locked"
              value={fmtUSD(metrics.revenueUsd)}
              hint="Across all contracted trips"
              tone="success"
            />
            <MetricCard
              icon={<Banknote className="h-5 w-5" />}
              label="Cash disbursed"
              value={fmtTZS(metrics.cashTzs)}
              hint="Driver advances paid"
              tone="warning"
            />
            <MetricCard
              icon={<Fuel className="h-5 w-5" />}
              label="Fuel volume logged"
              value={`${fmtNum(fuelLiters)} L`}
              hint="All trips combined"
              tone="accent"
            />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] px-4 md:px-6 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Trips</h2>
            <p className="text-xs text-muted-foreground">Click any trip to view detailed cash audit.</p>
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              <TabsTrigger value="all">All trips</TabsTrigger>
              <TabsTrigger value="in-transit">In-transit</TabsTrigger>
              <TabsTrigger value="pending">Pending settlement</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Table (same as before) */}
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Trip</th>
                  <th className="px-4 py-3 font-medium">Route</th>
                  <th className="px-4 py-3 font-medium">Vehicle</th>
                  <th className="px-4 py-3 font-medium">Driver</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Contract</th>
                  <th className="px-4 py-3 font-medium text-right">Advance</th>
                  <th className="px-4 py-3 font-medium text-right">Cash remaining</th>
                  <th className="px-4 py-3 font-medium text-right">Net margin</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No trips match this filter.
                    </td>
                  </tr>
                )}
                {filtered.map((t) => {
                  const contractTzs = Number(t.financial?.total_contract_tzs ?? 0);
                  const advanceTzs = Number(t.financial?.advance_paid_tzs ?? 0);
                  const cashRemaining = advanceTzs - t.expenses_sum;
                  const margin = contractTzs - t.expenses_sum;
                  const marginPct = contractTzs ? (margin / contractTzs) * 100 : 0;
                  return (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition">
                      <td className="px-4 py-3 font-mono text-xs">{t.trip_code}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{t.origin_destination}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground tabular">
                          {fmtNum(t.planned_km)} km planned
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{t.vehicle?.reg_number ?? "—"}</td>
                      <td className="px-4 py-3">{t.driver?.full_name ?? "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-4 py-3 text-right tabular">
                        {fmtUSD(t.financial?.contract_amount)}
                        <div className="text-[11px] text-muted-foreground">{fmtTZS(contractTzs)}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular">{fmtTZS(advanceTzs)}</td>
                      <td className={cn("px-4 py-3 text-right font-semibold tabular", cashRemaining < 0 ? "text-destructive" : "text-foreground")}>
                        {fmtTZS(cashRemaining)}
                      </td>
                      <td className="px-4 py-3 text-right tabular">
                        <span className={cn("font-semibold", margin >= 0 ? "text-success" : "text-destructive")}>
                          {fmtTZS(margin)}
                        </span>
                        <div className="text-[11px] text-muted-foreground">{marginPct.toFixed(1)}%</div>
                      </td>
                      <td className="px-2 py-3">
                        <Link
                          to="/trips/$tripId"
                          params={{ tripId: t.id }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                          aria-label="Open trip"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

// MetricCard (unchanged)
function MetricCard({ ... }) { ... } // keep the same as before
