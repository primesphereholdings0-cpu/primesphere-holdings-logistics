import { useEffect, useMemo, useState } from "react";
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
import { contractsQuery, customersQuery, driversQuery, vehiclesQuery } from "@/lib/queries";
import { fmtTZS, fmtUSD } from "@/lib/format";
import { NewDriverDialog } from "./NewDriverDialog";
import { TripRow } from "@/lib/queries";

type NewTripDialogProps = {
  initialData?: TripRow | null;
  onClose?: () => void;
  trigger?: React.ReactNode;
};

export function NewTripDialog({ initialData, onClose, trigger }: NewTripDialogProps) {
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
  const [route, setRoute] = useState("Dar es Salaam → Kasumbalesa");
  const [plannedKm, setPlannedKm] = useState("4000");
  const [contractUsd, setContractUsd] = useState("7200");
  const [fxRate, setFxRate] = useState("2600");
  const [advanceType, setAdvanceType] = useState<"percentage" | "fixed">("percentage");
  const [advanceValue, setAdvanceValue] = useState("70");

  // --- FUEL ESTIMATION (0.5 L/km) for border trips ---
  const estimatedFuel = useMemo(() => {
    const km = Number(plannedKm || 0);
    return km * 0.5; // 0.5 L per km
  }, [plannedKm]);

  // Pre-fill when initialData is provided (edit mode)
  useEffect(() => {
    if (initialData) {
      setVehicleId(initialData.vehicle_id ?? "");
      setDriverId(initialData.driver_id ?? "");
      setCustomerId(initialData.customer_id ?? "");
      setContractId(initialData.contract_id ?? "");
      setRoute(initialData.origin_destination);
      setPlannedKm(String(initialData.planned_km));
      const fin = initialData.financial;
      if (fin) {
        setContractUsd(String(fin.contract_amount));
        setFxRate(String(fin.fx_exchange_rate));
        setAdvanceType(fin.advance_input_type as "percentage" | "fixed");
        setAdvanceValue(String(fin.advance_value));
      }
      setOpen(true);
    }
  }, [initialData]);

  const resetForm = () => {
    if (!initialData) {
      setVehicleId("");
      setDriverId("");
      setCustomerId("");
      setContractId("");
      setRoute("Dar es Salaam → Kasumbalesa");
      setPlannedKm("4000");
      setContractUsd("7200");
      setFxRate("2600");
      setAdvanceType("percentage");
      setAdvanceValue("70");
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
      if (onClose) onClose();
    }
    setOpen(open);
  };

  const availableContracts = useMemo(
    () => (contracts ?? []).filter((c) => !customerId || c.customer_id === customerId),
    [contracts, customerId],
  );
  const selectedContract = useMemo(
    () => (contracts ?? []).find((c) => c.id === contractId) ?? null,
    [contracts, contractId],
  );

  useEffect(() => {
    if (!selectedContract) return;
    setContractUsd(String(selectedContract.contract_amount));
    if (selectedContract.route) setRoute(selectedContract.route);
    if (selectedContract.customer_id) setCustomerId(selectedContract.customer_id);
  }, [selectedContract]);

  const totalContractTzs = Number(contractUsd || 0) * Number(fxRate || 0);
  const advancePaidUsd = useMemo(() => {
    if (advanceType === "percentage") return (Number(contractUsd || 0) * Number(advanceValue || 0)) / 100;
    return Number(advanceValue || 0);
  }, [advanceType, advanceValue, contractUsd]);
  const advancePaidTzs = advancePaidUsd * Number(fxRate || 0);

  const dispatch = useMutation({
    mutationFn: async () => {
      const code = initialData ? initialData.trip_code : `TRIP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const tripPayload = {
        trip_code: code,
        origin_destination: route,
        vehicle_id: vehicleId || null,
        driver_id: driverId || null,
        customer_id: customerId || null,
        contract_id: contractId || null,
        planned_km: Number(plannedKm || 0),
        dispatch_date: new Date().toISOString().slice(0, 10),
        status: initialData ? initialData.status : "Dispatched",
        trip_type: "border",
        quantity: 0,
        rate_per_unit: 0,
        local_calculation_type: "",
      };
      let tripId: string;
      if (initialData) {
        const { error } = await supabase
          .from("trips")
          .update(tripPayload)
          .eq("id", initialData.id);
        if (error) throw error;
        tripId = initialData.id;
      } else {
        const { data, error } = await supabase
          .from("trips")
          .insert(tripPayload)
          .select()
          .single();
        if (error) throw error;
        tripId = data.id;
      }

      const finPayload = {
        trip_id: tripId,
        contract_currency: "USD",
        contract_amount: Number(contractUsd || 0),
        fx_exchange_rate: Number(fxRate || 0),
        advance_input_type: advanceType,
        advance_value: Number(advanceValue || 0),
        advance_paid_usd: advancePaidUsd,
        advance_paid_tzs: advancePaidTzs,
      };
      if (initialData?.financial) {
        const { error } = await supabase
          .from("trip_financials")
          .update(finPayload)
          .eq("trip_id", tripId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("trip_financials")
          .insert(finPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success(initialData ? "Trip updated" : "Trip dispatched");
      setOpen(false);
      if (onClose) onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const defaultTrigger = (
    <Button className="gap-2">
      <Plus className="h-4 w-4" />
      New Trip
    </Button>
  );

  const isControlled = initialData !== undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || defaultTrigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit trip" : "Dispatch new trip"}</DialogTitle>
          <DialogDescription>
            {initialData
              ? "Update trip details, vehicle, driver, and financials."
              : "Assign vehicle and driver, log the freight contract, and pay the cash advance."}
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
                      {v.reg_number} · {v.model} {v.status !== "Active" && `(${v.status})`}
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
                <FileText className="h-3.5 w-3.5" /> Contract
              </Label>
              <Select value={contractId} onValueChange={setContractId} disabled={!availableContracts.length}>
                <SelectTrigger>
                  <SelectValue placeholder={availableContracts.length ? "Link a contract" : "No contracts available"} />
                </SelectTrigger>
                <SelectContent>
                  {availableContracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.route} · {c.contract_currency} {Number(c.contract_amount).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <div className="grid gap-1.5">
              <Label>Route / Origin → Destination</Label>
              <Input value={route} onChange={(e) => setRoute(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Planned KM</Label>
              <Input
                inputMode="numeric"
                value={plannedKm}
                onChange={(e) => setPlannedKm(e.target.value)}
              />
              <div className="text-[11px] text-muted-foreground mt-1">
                Estimated fuel: <span className="font-medium text-foreground">{estimatedFuel.toFixed(1)} L</span> (0.5 L/km)
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Freight contract
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Total contract (USD)</Label>
                <Input inputMode="decimal" value={contractUsd} onChange={(e) => setContractUsd(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>FX rate (1 USD = TZS)</Label>
                <Input inputMode="decimal" value={fxRate} onChange={(e) => setFxRate(e.target.value)} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md bg-background px-3 py-2 text-sm">
              <span className="text-muted-foreground">Total contract in TZS</span>
              <span className="font-semibold tabular">{fmtTZS(totalContractTzs)}</span>
            </div>
          </div>

          <div className="rounded-lg border bg-primary/5 p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Driver cash advance
            </div>
            <RadioGroup
              value={advanceType}
              onValueChange={(v) => setAdvanceType(v as "percentage" | "fixed")}
              className="mb-3 flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="percentage" /> Percentage of contract
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="fixed" /> Fixed USD amount
              </label>
            </RadioGroup>
            <div className="grid gap-1.5">
              <Label>{advanceType === "percentage" ? "Advance %" : "Advance (USD)"}</Label>
              <Input
                inputMode="decimal"
                value={advanceValue}
                onChange={(e) => setAdvanceValue(e.target.value)}
              />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-md bg-background px-3 py-2">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Advance USD</div>
                <div className="text-lg font-bold tabular text-primary">{fmtUSD(advancePaidUsd)}</div>
              </div>
              <div className="rounded-md bg-background px-3 py-2">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Advance TZS</div>
                <div className="text-lg font-bold tabular text-primary">{fmtTZS(advancePaidTzs)}</div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => dispatch.mutate()}
            disabled={!vehicleId || !driverId || dispatch.isPending}
            className="gap-2"
          >
            {dispatch.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {initialData ? "Update trip" : "Dispatch trip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
