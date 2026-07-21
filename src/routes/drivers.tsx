import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Users, Wallet, Banknote, Activity } from "lucide-react";

import { AppHeader } from "@/components/fleet/AppHeader";
import { NewDriverDialog } from "@/components/fleet/NewDriverDialog";
import { driversOverviewQuery } from "@/lib/queries";
import { fmtTZS } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/drivers")({
  head: () => ({
    meta: [
      { title: "Drivers — FleetPulse" },
      { name: "description", content: "Manage drivers, salaries and cash advances across the fleet." },
      { property: "og:title", content: "Drivers — FleetPulse" },
      { property: "og:description", content: "Payroll and advance ledger for every driver in the fleet." },
    ],
  }),
  component: DriversPage,
});

function DriversPage() {
  const { data: drivers = [], isLoading } = useQuery(driversOverviewQuery);

  const totals = drivers.reduce(
    (a, d) => ({
      salary: a.salary + d.salary_paid_tzs,
      advance: a.advance + d.trip_advance_tzs + d.extra_advance_tzs,
      active: a.active + d.active_trips,
    }),
    { salary: 0, advance: 0, active: 0 },
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader right={<NewDriverDialog />} />

      <div className="border-b bg-gradient-to-br from-primary/8 via-background to-accent/20">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8">
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
            <Users className="h-3 w-3 text-primary" /> Payroll & advances
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">Drivers</h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            Every driver you dispatch appears here — track trips, salary payouts and cash advances in one ledger.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard icon={<Users className="h-5 w-5" />} tone="primary" label="Drivers on payroll" value={String(drivers.length)} />
            <StatCard icon={<Wallet className="h-5 w-5" />} tone="warning" label="Total advances (all-time)" value={fmtTZS(totals.advance)} />
            <StatCard icon={<Banknote className="h-5 w-5" />} tone="success" label="Salaries paid" value={fmtTZS(totals.salary)} />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] px-4 md:px-6 py-8">
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Driver</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">License</th>
                  <th className="px-4 py-3 font-medium text-right">Monthly salary</th>
                  <th className="px-4 py-3 font-medium text-right">Active / Total trips</th>
                  <th className="px-4 py-3 font-medium text-right">Trip advances</th>
                  <th className="px-4 py-3 font-medium text-right">Extra advances</th>
                  <th className="px-4 py-3 font-medium text-right">Salary paid</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">Loading drivers…</td></tr>
                )}
                {!isLoading && drivers.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No drivers yet. Add your first driver above.</td></tr>
                )}
                {drivers.map((d) => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium">{d.full_name}</div>
                      {d.base_location && (
                        <div className="text-[11px] text-muted-foreground">{d.base_location}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{d.phone ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{d.license_number ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular">{fmtTZS(d.monthly_salary_tzs)}</td>
                    <td className="px-4 py-3 text-right tabular">
                      <span className="inline-flex items-center gap-1">
                        {d.active_trips > 0 && <Activity className="h-3 w-3 text-primary" />}
                        <span className={cn("font-semibold", d.active_trips > 0 && "text-primary")}>
                          {d.active_trips}
                        </span>
                        <span className="text-muted-foreground"> / {d.total_trips}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular">{fmtTZS(d.trip_advance_tzs)}</td>
                    <td className="px-4 py-3 text-right tabular">{fmtTZS(d.extra_advance_tzs)}</td>
                    <td className="px-4 py-3 text-right tabular">{fmtTZS(d.salary_paid_tzs)}</td>
                    <td className="px-2 py-3">
                      <Link
                        to="/drivers/$driverId"
                        params={{ driverId: d.id }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                        aria-label="Open driver"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
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
