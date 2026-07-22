import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { 
  ArrowLeft, 
  Truck, 
  Gauge, 
  Calendar, 
  Wrench, 
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

import { NewVehicleDialog } from "@/components/fleet/NewVehicleDialog"; // ← ADDED
import { NewMaintenanceDialog } from "@/components/fleet/NewMaintenanceDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fmtTZS } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vehicles/$vehicleId")({
  component: VehicleDetailPage,
  head: ({ params }) => ({
    meta: [
      { title: `Vehicle — Primesphere Holdings Logistics` },
      { name: "description", content: "View vehicle details, maintenance history, and performance." },
    ],
  }),
});

function VehicleDetailPage() {
  const { vehicleId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Fetch vehicle details
  const { data: vehicle, isLoading: vehicleLoading } = useQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", vehicleId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Vehicle not found");
      return data;
    },
  });

  // Fetch maintenance records for this vehicle
  const { data: maintenance = [], isLoading: maintenanceLoading } = useQuery({
    queryKey: ["maintenance", "vehicle", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_maintenance")
        .select(`
          *,
          vehicle:vehicles(reg_number, model)
        `)
        .eq("vehicle_id", vehicleId)
        .order("maintenance_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicle_maintenance").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance", "vehicle", vehicleId] });
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success("Maintenance record deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case "Completed": return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "In-Progress": return <Clock className="h-4 w-4 text-warning" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const totalMaintenanceCost = maintenance.reduce((sum, r) => sum + Number(r.cost_tzs), 0);

  if (vehicleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-muted-foreground">Loading vehicle details…</div>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Truck className="h-16 w-16 text-muted-foreground/30" />
          <h2 className="text-xl font-semibold">Vehicle not found</h2>
          <p className="text-sm text-muted-foreground">The vehicle you're looking for doesn't exist.</p>
          <Button onClick={() => navigate({ to: "/vehicles" })}>Back to vehicles</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-xl px-4 py-3 md:px-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/vehicles" })}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              {vehicle.reg_number}
            </h1>
            <p className="text-xs text-muted-foreground">{vehicle.model} · {vehicle.capacity_tons}t capacity</p>
          </div>
          <Badge variant={vehicle.status === "Active" ? "default" : vehicle.status === "Maintenance" ? "warning" : "secondary"}>
            {vehicle.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <NewVehicleDialog initialData={vehicle} /> {/* ← EDIT BUTTON */}
          <NewMaintenanceDialog />
        </div>
      </div>

      {/* ... the rest of the page stays exactly the same ... */}
      <main className="mx-auto max-w-[1400px] px-4 md:px-6 py-6">
        {/* Quick stats */}
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <div className="rounded-xl border bg-card p-4">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Total Trips</div>
            <div className="mt-1 text-2xl font-bold">—</div>
            <div className="text-xs text-muted-foreground">Coming soon</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Maintenance Records</div>
            <div className="mt-1 text-2xl font-bold">{maintenance.length}</div>
            <div className="text-xs text-muted-foreground">Total cost: {fmtTZS(totalMaintenanceCost)}</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Status</div>
            <div className="mt-1 text-2xl font-bold capitalize">{vehicle.status}</div>
            <div className="text-xs text-muted-foreground">
              {vehicle.status === "Active" ? "Available for dispatch" : vehicle.status === "Maintenance" ? "In service" : "Retired from fleet"}
            </div>
          </div>
        </div>

        {/* Tabs: Details | Maintenance */}
        <Tabs defaultValue="maintenance">
          <TabsList>
            <TabsTrigger value="details" className="gap-2">
              <Truck className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-2">
              <Wrench className="h-4 w-4" />
              Maintenance History
              {maintenance.length > 0 && (
                <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px]">
                  {maintenance.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-6">
            <div className="rounded-xl border bg-card p-6 max-w-2xl">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Registration</div>
                  <div className="mt-1 font-mono text-lg font-semibold">{vehicle.reg_number}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Model</div>
                  <div className="mt-1 text-lg font-semibold">{vehicle.model}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Capacity</div>
                  <div className="mt-1 text-lg font-semibold">{vehicle.capacity_tons} tons</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Status</div>
                  <div className="mt-1">
                    <Badge variant={vehicle.status === "Active" ? "default" : "warning"}>
                      {vehicle.status}
                    </Badge>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Added to fleet</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {new Date(vehicle.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {maintenance.length} record{maintenance.length !== 1 ? "s" : ""}
                {totalMaintenanceCost > 0 && (
                  <span className="ml-2 font-medium text-foreground">
                    · Total {fmtTZS(totalMaintenanceCost)}
                  </span>
                )}
              </div>
              <NewMaintenanceDialog />
            </div>

            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium text-right">Cost</th>
                      <th className="px-4 py-3 font-medium text-right">Duration</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenanceLoading && (
                      <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Loading records…</td></tr>
                    )}
                    {!maintenanceLoading && maintenance.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Wrench className="h-8 w-8 text-muted-foreground/30" />
                            <p>No maintenance records for this vehicle yet.</p>
                            <NewMaintenanceDialog />
                          </div>
                        </td>
                      </tr>
                    )}
                    {maintenance.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(r.maintenance_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 max-w-[240px] truncate">{r.description}</td>
                        <td className="px-4 py-3 text-right tabular">{fmtTZS(Number(r.cost_tzs))}</td>
                        <td className="px-4 py-3 text-right tabular text-muted-foreground">
                          {r.duration_hours ? `${r.duration_hours}h` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
                            r.status === "Completed" && "bg-success/15 text-success",
                            r.status === "In-Progress" && "bg-warning/25 text-warning-foreground dark:text-warning",
                            r.status === "Planned" && "bg-muted text-muted-foreground",
                          )}>
                            {statusIcon(r.status)}
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteRecord.mutate(r.id)}
                            disabled={deleteRecord.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
