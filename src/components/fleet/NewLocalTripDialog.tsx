import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Truck, User, Building2, FileText } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { customersQuery, driversQuery, vehiclesQuery, contractsQuery } from "@/lib/queries";
import { fmtTZS } from "@/lib/format";
import { NewDriverDialog } from "./NewDriverDialog";

type NewLocalTripDialogProps = {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
};

export function NewLocalTripDialog({ trigger, onSuccess }: NewLocalTripDialogProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: vehicles } = useQuery({ ...vehiclesQuery, refetchOnMount: "always" });
  const { data: drivers } = useQuery({ ...driversQuery, refetchOnMount: "always" });
  const { data: customers } = useQuery({ ...customersQuery, refetchOnMount: "always" });
  const { data: contracts } = useQuery({ ...contractsQuery, refetchOnMount: "always" });

  const [vehicleId, setVehicleId] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [contractId, setContractId] = useState<string>("");
  const [route, setRoute] = useState("");
  const [plannedKm, setPlannedKm] = useState("");
  const [tripType, setTripType] = useState<"two_way" | "one_way">("two_way");
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");

  // Filter contracts: only local contracts for the selected customer
  const availableContracts = useMemo(() => {
    if (!customerId) return [];
    return (contracts ?? []).filter(
      (c) => c.customer_id === customerId && c.contract_type === "local"
    );
  }, [contracts, customerId]);

  // Auto-calculate subtotal (excl. VAT)
  const subtotal = useMemo(() => {
    const km = Number(plannedKm) || 0;
    const qty = Number(quantity) || 0;
    const r = Number(rate) || 0;
    if (tripType === "two_way") {
      return km * r * qty;
    } else {
      return r * qty;
    }
  }, [tripType, plannedKm, quantity, rate]);

  const vatAmount = subtotal * 0.18;
  const totalWithVat = subtotal + vatAmount;

  const createTrip = useMutation({
    mutationFn: async () => {
      const code = `LOCAL-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const { data: trip, error: e1 } = await supabase
        .from("trips")
        .insert({
          trip_code: code,
          origin_destination: route,
          vehicle_id: vehicleId || null,
          driver_id: driverId || null,
          customer_id: customerId || null,
          contract_id: contractId || null,
          planned_km: Number(plannedKm) || 0,
          dispatch_date: new Date().toISOString().slice(0, 10),
          status: "Dispatched",
          trip_type: "local",
          quantity: Number(quantity) || 0,
          rate_per_unit: Number(rate) || 0,
          local_calculation_type: tripType,
        })
        .select()
        .single();
      if (e1) throw e1;

      // Store only the subtotal in contract_amount (VAT is added at invoice level)
      const { error: e2 } = await supabase
        .from("trip_financials")
        .insert({
          trip_id: trip.id,
          contract_currency: "TZS",
          contract_amount: subtotal,
          fx_exchange_rate: 1,
          advance_input_type: "percentage",
          advance_value: 0,
          advance_paid_usd: 0,
          advance_paid_tzs: 0,
          customer_paid_tzs: 0,
        });
      if (e2) throw e2;

      return trip;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Local trip dispatched");
      setOpen(false);
      if (onSuccess) onSuccess();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
            <Plus className="h-4 w-4" />
            New Local Trip
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dispatch new local trip</DialogTitle>
          <DialogDescription>
            For domestic routes – fill in the details. The total will be auto‑calculated in TZS (excl. VAT).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" /> Vehicle
              </Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  {vehicles?.map((v) => (
                    <SelectItem key={v.id} value={v.id} disabled={v.status !== "Active"}>
                      {v.reg_number} · {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Driver
                </Label>
                <NewDriverDialog />
              </div>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                <SelectContent>
                  {drivers?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Customer
              </Label>
              <Select
                value={customerId}
                onValueChange={(v) => {
                  setCustomerId(v);
                  setContractId("");
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Local Contract
              </Label>
              <Select
                value={contractId}
                onValueChange={setContractId}
                disabled={!customerId || availableContracts.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !customerId
                        ? "Select a customer first"
                        : availableContracts.length === 0
                        ? "No local contracts"
                        : "Select contract"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableContracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.route} · {c.start_date ? new Date(c.start_date).toLocaleDateString() : "No start"} –{" "}
                      {c.end_date ? new Date(c.end_date).toLocaleDateString() : "No end"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Link to a master local contract (optional)
              </p>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Route / Origin → Destination</Label>
            <Input value={route} onChange={(e) => setRoute(e.target.value)} placeholder="e.g., Mbeya → Songea" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Trip type</Label>
              <RadioGroup
                value={tripType}
                onValueChange={(v) => setTripType(v as "two_way" | "one_way")}
                className="flex gap-4"
              >
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="two_way" /> Two‑way
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="one_way" /> One‑way
                </label>
              </RadioGroup>
            </div>
            <div className="grid gap-1.5">
              <Label>Planned KM</Label>
              <Input inputMode="numeric" value={plannedKm} onChange={(e) => setPlannedKm(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Quantity</Label>
              <Input
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={tripType === "two_way" ? "Number of crates" : "Tons"}
              />
              <span className="text-[11px] text-muted-foreground">
                {tripType === "two_way" ? "crates/bottles" : "tons"}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>
                {tripType === "two_way" ? "Rate per km (TZS)" : "Rate per ton (TZS)"}
              </Label>
              <Input
                inputMode="numeric"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder={tripType === "two_way" ? "e.g., 2.6" : "e.g., 94000"}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Subtotal (excl. VAT)</Label>
              <div className="rounded-md bg-muted/40 px-3 py-2 text-lg font-bold text-primary tabular">
                {fmtTZS(subtotal)}
              </div>
            </div>
          </div>

          {/* VAT breakdown */}
          {subtotal > 0 && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT (18%)</span>
                <span className="font-medium">{fmtTZS(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total with VAT</span>
                <span className="text-primary">{fmtTZS(totalWithVat)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                * VAT will be added at invoice level
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => createTrip.mutate()}
            disabled={!vehicleId || !driverId || !customerId || !route || !quantity || !rate || subtotal === 0 || createTrip.isPending}
            className="gap-2"
          >
            {createTrip.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Dispatch local trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
