import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowLeft, Phone, IdCard, MapPin, Wallet, Banknote, Briefcase, TrendingUp } from "lucide-react";

import { AppHeader } from "@/components/fleet/AppHeader";
import { StatusBadge } from "@/components/fleet/StatusBadge";
import { NewDriverPaymentDialog } from "@/components/fleet/NewDriverPaymentDialog";
import { driverDetailQuery } from "@/lib/queries";
import { fmtNum, fmtTZS } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/drivers/$driverId")({
  component: DriverDetailPage,
});

function DriverDetailPage() {
  const { driverId } = Route.useParams();
  const { data, isLoading } = useQuery(driverDetailQuery(driverId));

  const totals = useMemo(() => {
    if (!data) return { tripAdvance: 0, salary: 0, extraAdvance: 0, active: 0 };
    const tripAdvance = data.trips.reduce((s, t) => s + Number(t.financial?.advance_paid_tzs ?? 0), 0);
    const salary = data.payments.filter((p) => p.payment_type === "Salary").reduce((s, p) => s + Number(p.amount_tzs), 0);
    const extraAdvance = data.payments.filter((p) => p.payment_type === "Advance").reduce((s, p) => s + Number(p.amount_tzs), 0);
    const active = data.trips.filter((t) => t.status === "In-Transit" || t.status === "Dispatched").length;
    return { tripAdvance, salary, extraAdvance, active };
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto max-w-[1200px] px-6 py-10 text-sm text-muted-foreground">Loading driver…</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto max-w-[1200px] px-6 py-10">
          <Link to="/drivers" className="text-sm text-primary hover:underline">← Back to drivers</Link>
          <div className="mt-6 text-lg font-semibold">Driver not found</div>
        </div>
      </div>
    );
  }

  const { driver, trips, payments } = data;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader right={<NewDriverPaymentDialog driverId={driver.id} suggestedSalary={driver.monthly_salary_tzs} />} />

      <div className="border-b bg-gradient-to-br from-primary/8 via-background to-accent/20">
        <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-6">
          <Link to="/drivers" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Drivers
          </Link>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{driver.full_name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {driver.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{driver.phone}</span>}
                {driver.license_number && <span className="inline-flex items-center gap-1.5"><IdCard className="h-3.5 w-3.5" />{driver.license_number}</span>}
                {driver.base_location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{driver.base_location}</span>}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <StatCard tone="primary" icon={<Briefcase className="h-4 w-4" />} label="Trips" primary={String(trips.length)} sub={`${totals.active} active`} />
            <StatCard tone="warning" icon={<Wallet className="h-4 w-4" />} label="Trip advances" primary={fmtTZS(totals.tripAdvance)} sub="Paid on dispatch" />
            <StatCard tone="accent" icon={<TrendingUp className="h-4 w-4" />} label="Extra advances" primary={fmtTZS(totals.extraAdvance)} sub="Outside contracts" />
            <StatCard tone="success" icon={<Banknote className="h-4 w-4" />} label="Salary paid" primary={fmtTZS(totals.salary)} sub={`Monthly ${fmtTZS(driver.monthly_salary_tzs)}`} />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1200px] px-4 md:px-6 py-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Trips */}
        <section>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Trips driven</h2>
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Trip</th>
                    <th className="px-4 py-3 font-medium">Route</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Advance</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No trips assigned yet.</td></tr>
                  )}
                  {trips.map((t) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link to="/trips/$tripId" params={{ tripId: t.id }} className="font-mono text-xs text-primary hover:underline">
                          {t.trip_code}
                        </Link>
                        <div className="text-[11px] text-muted-foreground">{t.vehicle?.reg_number ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{t.origin_destination}</div>
                        <div className="text-[11px] text-muted-foreground tabular">{fmtNum(t.planned_km)} km</div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-4 py-3 text-right tabular">{fmtTZS(t.financial?.advance_paid_tzs ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Payments ledger */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Payment ledger</h2>
            <NewDriverPaymentDialog driverId={driver.id} suggestedSalary={driver.monthly_salary_tzs} />
          </div>
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">No payments recorded.</td></tr>
                )}
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 tabular">{p.payment_date}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        p.payment_type === "Salary" ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground dark:text-warning",
                      )}>
                        {p.payment_type}
                      </span>
                      {p.period_label && <div className="mt-0.5 text-[11px] text-muted-foreground">{p.period_label}</div>}
                      {p.notes && <div className="mt-0.5 text-[11px] text-muted-foreground">{p.notes}</div>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular">{fmtTZS(p.amount_tzs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  primary,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  primary: string;
  sub: string;
  tone: "primary" | "success" | "warning" | "accent";
}) {
  const toneMap = {
    primary: "border-primary/30 bg-primary/8",
    success: "border-success/40 bg-success/10",
    warning: "border-warning/40 bg-warning/15",
    accent: "border-border bg-card",
  };
  const iconTone = {
    primary: "bg-primary/20 text-primary",
    success: "bg-success/20 text-success",
    warning: "bg-warning/25 text-warning-foreground dark:text-warning",
    accent: "bg-muted text-foreground",
  };
  return (
    <div className={cn("rounded-xl border p-4", toneMap[tone])}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        <span className={cn("grid h-6 w-6 place-items-center rounded", iconTone[tone])}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-xl md:text-2xl font-bold tabular">{primary}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground tabular">{sub}</div>
    </div>
  );
}
