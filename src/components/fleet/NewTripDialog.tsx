import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Truck, User } from "lucide-react";
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
import { driversQuery, vehiclesQuery } from "@/lib/queries";
import { fmtTZS, fmtUSD } from "@/lib/format";

export function NewTripDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: vehicles } = useQuery(vehiclesQuery);
  const { data: drivers } = useQuery(driversQuery);

  const [vehicleId, setVehicleId] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");
  const [route, setRoute] = useState("Dar es Salaam → Kasumbalesa");
  const [plannedKm, setPlannedKm] = useState("4000");
  const [contractUsd, setContractUsd] = useState("7200");
  const [fxRate, setFxRate] = useState("2600");
  const [advanceType, setAdvanceType] = useState<"percentage" | "fixed">("percentage");
  const [advanceValue, setAdvanceValue] = useState("70");

  const totalContractTzs = Number(contractUsd || 0) * Number(fxRate || 0);
  const advancePaidUsd = useMemo(() => {
    if (advanceType === "percentage") return (Number(contractUsd || 0) * Number(advanceValue || 0)) / 100;
    return Number(advanceValue || 0);
  }, [advanceType, advanceValue, contractUsd]);
  const advancePaidTzs = advancePaidUsd * Number(fxRate || 0);

  const dispatch = useMutation({
    mutationFn: async () => {
      const code = `TRIP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const { data: trip, error: e1 } = await supabase
        .from("trips")
        .insert({
          trip_code: code,
          origin_destination: route,
          vehicle_id: vehicleId || null,
          driver_id: driverId || null,
          planned_km: Number(plannedKm || 0),
          dispatch_date: new Date().toISOString().slice(0, 10),
          status: "Dispatched",
        })
        .select()
        .single();
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("trip_financials").insert({
        trip_id: trip.id,
        contract_currency: "USD",
        contract_amount: Number(contractUsd || 0),
        fx_exchange_rate: Number(fxRate || 0),
        advance_input_type: advanceType,
        advance_value: Number(advanceValue || 0),
        advance_paid_usd: advancePaidUsd,
        advance_paid_tzs: advancePaidTzs,
      });
      if (e2) throw e2;
      return trip;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Trip dispatched");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Trip
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dispatch new trip</DialogTitle>
          <DialogDescription>
            Assign vehicle and driver, log the freight contract, and pay the cash advance.
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
              <Label className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Driver
              </Label>
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

          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <div className="grid gap-1.5">
              <Label>Route / Origin → Destination</Label>
              <Input value={route} onChange={(e) => setRoute(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Planned KM</Label>
              <Input inputMode="numeric" value={plannedKm} onChange={(e) => setPlannedKm(e.target.value)} />
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
            Dispatch trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
