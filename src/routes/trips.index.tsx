import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, MoreHorizontal, Eye, FileCheck, Pencil, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { NewTripDialog } from "@/components/fleet/NewTripDialog";
import { StatusBadge } from "@/components/fleet/StatusBadge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { tripsQuery } from "@/lib/queries";
import { fmtTZS, fmtUSD } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/trips/")({
  component: TripsPage,
  head: () => ({
    meta: [
      { title: "Trips — Primesphere Holdings Logistics" },
      { name: "description", content: "Manage every trip from dispatch to audit and settlement." },
    ],
  }),
});

const STATUS_FLOW = ["Draft", "Dispatched", "In-Transit", "Completed", "Audited"];

function TripsPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: trips = [] } = useQuery(tripsQuery);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const advance = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: string }) => {
      const patch: { status: string; settled_at?: string; audited_at?: string } = { status: next };
      if (next === "Completed") patch.settled_at = new Date().toISOString();
      if (next === "Audited") patch.audited_at = new Date().toISOString();
      const { error } = await supabase.from("trips").update(patch).eq("id", id);
      if (error) throw error;
      await supabase.from("audit_logs").insert({ action: `trip.${next.toLowerCase()}`, entity: "trip", entity_id: id, payload: { status: next } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["trips"] }); toast.success("Trip updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = trips.filter((t) => {
    if (status !== "all" && t.status !== status) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      t.trip_code.toLowerCase().includes(s) ||
      t.origin_destination.toLowerCase().includes(s) ||
      t.driver?.full_name.toLowerCase().includes(s) ||
      t.vehicle?.reg_number.toLowerCase().includes(s)
    );
  });

  const nextStatus = (s: string) => {
    const i = STATUS_FLOW.indexOf(s);
    return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-xl px-4 py-3 md:px-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Trips</h1>
          <p className="text-xs text-muted-foreground">Manage every trip from dispatch to audit and settlement.</p>
        </div>
        <NewTripDialog />
      </div>

      <main className="mx-auto max-w-[1400px] px-4 md:px-6 py-6">
        {/* Search and filter bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search trip code, route, driver, vehicle…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={status} onValueChange={setStatus}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              {STATUS_FLOW.map((s) => <TabsTrigger key={s} value={s}>{s}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Trip Code</th>
                  <th className="px-4 py-3 font-medium">Route</th>
                  <th className="px-4 py-3 font-medium">Vehicle</th>
                  <th className="px-4 py-3 font-medium">Driver</th>
                  <th className="px-4 py-3 font-medium">Dispatch</th>
                  <th className="px-4 py-3 font-medium">Return</th>
                  <th className="px-4 py-3 font-medium text-right">Contract</th>
                  <th className="px-4 py-3 font-medium text-right">Advance</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">No trips found.</td></tr>
                )}
                {filtered.map((t) => {
                  const next = nextStatus(t.status);
                  return (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{t.trip_code}</td>
                      <td className="px-4 py-3">{t.origin_destination}</td>
                      <td className="px-4 py-3 font-mono text-xs">{t.vehicle?.reg_number ?? "—"}</td>
                      <td className="px-4 py-3">{t.driver?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 tabular text-xs">{t.dispatch_date ?? "—"}</td>
                      <td className="px-4 py-3 tabular text-xs">{t.return_date ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular">
                        {fmtUSD(t.financial?.contract_amount)}
                        <div className="text-[11px] text-muted-foreground">{fmtTZS(t.financial?.total_contract_tzs)}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular">{fmtTZS(t.financial?.advance_paid_tzs)}</td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-2 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => nav({ to: "/trips/$tripId", params: { tripId: t.id } })}>
                              <Eye className="h-4 w-4 mr-2" />View details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => nav({ to: "/trips/$tripId/audit", params: { tripId: t.id } })}>
                              <FileCheck className="h-4 w-4 mr-2" />Open audit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => nav({ to: "/trips/$tripId", params: { tripId: t.id } })}>
                              <Pencil className="h-4 w-4 mr-2" />Edit trip
                            </DropdownMenuItem>
                            {next && (
                              <DropdownMenuItem onClick={() => advance.mutate({ id: t.id, next })}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />Move to {next}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          Workflow: <Link to="/trips" className="underline">Draft → Dispatched → In-Transit → Completed → Audited</Link>
        </div>
      </main>
    </div>
  );
}
