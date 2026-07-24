import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, User, Pencil } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Driver } from "@/lib/queries";

type NewDriverDialogProps = {
  initialData?: Driver | null;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
};

export function NewDriverDialog({ initialData, trigger, onSuccess }: NewDriverDialogProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [license, setLicense] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [baseLocation, setBaseLocation] = useState("");
  const [driverType, setDriverType] = useState<"border" | "local" | "both">("both");

  useEffect(() => {
    if (initialData) {
      setFullName(initialData.full_name);
      setPhone(initialData.phone ?? "");
      setLicense(initialData.license_number ?? "");
      setMonthlySalary(String(initialData.monthly_salary_tzs || 0));
      setBaseLocation(initialData.base_location ?? "");
      setDriverType((initialData.driver_type as "border" | "local" | "both") || "both");
    }
  }, [initialData]);

  const resetForm = () => {
    if (!initialData) {
      setFullName("");
      setPhone("");
      setLicense("");
      setMonthlySalary("0");
      setBaseLocation("");
      setDriverType("both");
    }
  };

  const createOrUpdate = useMutation({
    mutationFn: async () => {
      const payload = {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        license_number: license.trim() || null,
        monthly_salary_tzs: Number(monthlySalary || 0),
        base_location: baseLocation.trim() || null,
        driver_type: driverType,
      };
      if (initialData?.id) {
        const { error } = await supabase
          .from("drivers")
          .update(payload)
          .eq("id", initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("drivers")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drivers"] });
      qc.invalidateQueries({ queryKey: ["drivers", "overview"] });
      qc.invalidateQueries({ queryKey: ["finance", "overview"] });
      if (initialData?.id) {
        qc.invalidateQueries({ queryKey: ["driver", initialData.id] });
      }
      toast.success(initialData ? "Driver updated" : "Driver added");
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
    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit driver">
      <Pencil className="h-4 w-4" />
    </Button>
  ) : (
    <Button className="gap-2">
      <User className="h-4 w-4" /> Add driver
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit driver" : "Add a new driver"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Update driver details." : "Register a new driver to the fleet."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+255 700 000 000" />
            </div>
            <div className="grid gap-1.5">
              <Label>License number</Label>
              <Input value={license} onChange={(e) => setLicense(e.target.value)} placeholder="TZ-DL-12345" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Monthly salary (TZS)</Label>
              <Input inputMode="decimal" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Base location</Label>
              <Input value={baseLocation} onChange={(e) => setBaseLocation(e.target.value)} placeholder="Dar es Salaam" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Driver type</Label>
            <Select value={driverType} onValueChange={(v) => setDriverType(v as "border" | "local" | "both")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="border">Border</SelectItem>
                <SelectItem value="local">Local</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Determines how driver salary is allocated in finance reports.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => createOrUpdate.mutate()}
            disabled={!fullName || createOrUpdate.isPending}
            className="gap-2"
          >
            {createOrUpdate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (initialData ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />)}
            {initialData ? "Update driver" : "Save driver"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
