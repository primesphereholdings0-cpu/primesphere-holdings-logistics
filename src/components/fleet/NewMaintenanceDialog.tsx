import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Wrench } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { vehiclesQuery } from "@/lib/queries";

const STATUSES = ["Planned", "In-Progress", "Completed"];

type NewMaintenanceDialogProps = {
  initialData?: any; // optional for edit
  trigger?: React.ReactNode;
  onSuccess?: () => void;
};

export function NewMaintenanceDialog({ initialData, trigger, onSuccess }: NewMaintenanceDialogProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: vehicles = [] } = useQuery(vehiclesQuery);

  const [vehicleId, setVehicleId] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [duration, setDuration] = useState("");
  const [status, setStatus] = useState("Planned");
  const [tripType, setTripType] = useState<"border" | "local" | "both">("both");

  useEffect(() => {
    if (initialData) {
      setVehicleId(initialData.vehicle_id);
      setDate(initialData.maintenance_date || new Date().toISOString().slice(0, 10));
      setDescription(initialData.description);
      setCost(String(initialData.cost_tzs));
      setDuration(initialData.duration_hours ? String(initialData.duration_hours) : "");
      setStatus(initialData.status);
      setTripType((initialData.trip_type as "border" | "local" | "both") || "both");
      setOpen(true);
    }
  }, [initialData]);

  const resetForm = () => {
    if (!initialData) {
      setVehicleId("");
      setDate(new Date().toISOString().slice(0, 10));
      setDescription("");
      setCost("");
      setDuration("");
      setStatus("Planned");
      setTripType("both");
    }
  };

  const createOrUpdate = useMutation({
    mutationFn: async () => {
      const payload = {
        vehicle_id: vehicleId,
        maintenance_date: date,
        description: description.trim(),
        cost_tzs: Number(cost || 0),
        duration_hours: duration ? Number(duration) : null,
        status,
        completed_at: status === "Completed" ? new Date().toISOString() : null,
        trip_type: tripType,
      };
      if (initialData?.id) {
        const { error } = await supabase
          .from("vehicle_maintenance")
          .update(payload)
          .eq("id", initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("vehicle_maintenance")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["finance", "overview"] });
      if (initialData?.vehicle_id) {
        qc.invalidateQueries({ queryKey: ["maintenance", "vehicle", initialData.vehicle_id] });
      }
      toast.success(initialData ? "Maintenance record updated" : "Maintenance record added");
      setOpen(false);
      if (onSuccess) onSuccess();
      if (!initialData) resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open && !initialData) resetForm();
  };

  const defaultTrigger = initialData ? (
    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit maintenance">
      <Wrench className="h-4 w-4" />
    </Button>
  ) : (
    <Button className="gap-2">
      <Plus className="h-4 w-4" />
      New Maintenance
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit maintenance" : "Log a maintenance event"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Update service details." : "Record service, repairs, or inspections."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Vehicle</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.reg_number} – {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Engine oil change, brake pad replacement..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Cost (TZS)</Label>
              <Input
                inputMode="decimal"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Duration (hours)</Label>
              <Input
                inputMode="decimal"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 2.5"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* NEW: Trip Type field */}
          <div className="grid gap-1.5">
            <Label>Trip type</Label>
            <Select value={tripType} onValueChange={(v) => setTripType(v as "border" | "local" | "both")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="border">Border</SelectItem>
                <SelectItem value="local">Local</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Determines which operations this maintenance cost is allocated to in finance reports.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => createOrUpdate.mutate()}
            disabled={!vehicleId || !description || !cost || createOrUpdate.isPending}
            className="gap-2"
          >
            {createOrUpdate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {initialData ? "Update record" : "Save record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
