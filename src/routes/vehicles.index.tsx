import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Truck, Activity, Wallet, Gauge } from "lucide-react";

import { AppHeader } from "@/components/fleet/AppHeader";
import { NewVehicleDialog } from "@/components/fleet/NewVehicleDialog";
import { vehiclesOverviewQuery } from "@/lib/queries";
import { fmtTZS } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vehicles/")({
  head: () => ({
    meta: [
      { title: "Vehicles — FleetPulse" },
      { name: "description", content: "Manage trucks, capacity and status across the fleet." },
      { property: "og:title", content: "Vehicles — FleetPulse" },
      { property: "og:description", content: "Every truck in your fleet, with utilization and revenue at a glance." },
    ],
  }),
  component: VehiclesPage,
});

function VehiclesPage() {
  const { data: vehicles = [], isLoading } = useQuery(vehiclesOverviewQuery);

  const totals = vehicles.reduce(
    (a, v) => ({
      active: a.active + v.active_trips,
      km: a.km + v.total_km,
      revenue: a.revenue + v.revenue_tzs,
    }),
    { active: 0, km: 0, revenue: 0 },
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader right={<NewVehicleDialog />} />

      <div className="border-b bg-gradient-to-br from-primary/8 via-background to-accent/20">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8">
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
            <Truck className="h-3 w-3 text-primary" /> Fleet inventory
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">Vehicles</h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            Every truck in your fleet — track status, capacity, utilization and revenue generated.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard icon={<Truck className="h-5 w-5" />} tone="primary" label="Vehicles in fleet" value={String(vehicles.length)} />
            <StatCard icon={<Activity className="h-5 w-5" />} tone="warning" label="Currently on trips" value={String(totals.active)} />
            <StatCard icon={<Wallet className="h-5 w-5" />} tone="success" label="Total revenue booked" value={fmtTZS(totals.revenue)} />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] px-4 md:px-6 py-8">
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Registration</th>
                  <th className="px-4 py-3 font-medium">Model</th>
                  <th className="px-4 py-3 font-medium text-right">Capacity</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Active / Total trips</th>
                  <th className="px-4 py-3 font-medium text-right">Total KM</th>
                  <th className="px-4 py-3 font-medium text-right">Revenue booked</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Loading vehicles…</td></tr>
                )}
                {!isLoading && vehicles.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No vehicles yet. Add your first truck above.</td></tr>
                )}
                {vehicles.map((v) => (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30 transition">
                    <td className="px-4 py-3 font-mono font-semibold">{v.reg_number}</td>
                    <td className="px-4 py-3">{v.model}</td>
                    <td className="px-4 py-3 text-right tabular">{v.capacity_tons} t</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        v.status === "Active" && "bg-success/15 text-success",
                        v.status === "Maintenance" && "bg-warning/25 text-warning-foreground dark:text-warning",
                        v.status === "Retired" && "bg-muted text-muted-foreground",
                      )}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular">
                      <span className="inline-flex items-center gap-1">
                        {v.active_trips > 0 && <Activity className="h-3 w-3 text-primary" />}
                        <span className={cn("font-semibold", v.active_trips > 0 && "text-primary")}>
                          {v.active_trips}
                        </span>
                        <span className="text-muted-foreground"> / {v.total_trips}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Gauge className="h-3 w-3" />
                        {v.total_km.toLocaleString()} km
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular font-medium">{fmtTZS(v.revenue_tzs)}</td>
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
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "primary" | "success" | "warning";
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
