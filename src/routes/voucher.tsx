import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Camera, Loader2, Send, Truck } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/fleet/AppHeader";
import { StatusBadge } from "@/components/fleet/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { tripsQuery } from "@/lib/queries";
import { fmtTZS } from "@/lib/format";

export const Route = createFileRoute("/voucher")({
  component: VoucherPage,
});

const CATEGORIES = [
  "Fuel",
  "Road Tolls",
  "Driver Millage",
  "Container Drop-off",
  "Miscellaneous",
];

function VoucherPage() {
  const qc = useQueryClient();
  const { data: trips = [] } = useQuery(tripsQuery);
  const active = trips.filter((t) => ["Dispatched", "In-Transit"].includes(t.status));

  const [tripId, setTripId] = useState<string>("");
  const [category, setCategory] = useState("Fuel");
  const [description, setDescription] = useState("");
  const [liters, setLiters] = useState("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      if (!tripId) throw new Error("Select an active trip");
      let receipt_url: string | null = null;
      if (file) {
        const path = `${tripId}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`;
        const { error } = await supabase.storage.from("receipts").upload(path, file);
        if (error) throw error;
        receipt_url = path;
      }
      const { error } = await supabase.from("trip_expenses").insert({
        trip_id: tripId,
        category,
        description: description || null,
        volume_liters: liters ? Number(liters) : null,
        amount_tzs: Number(amount || 0),
        receipt_url,
        status: "Pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["trip", tripId] });
      toast.success("Voucher submitted for audit");
      setDescription(""); setLiters(""); setAmount(""); setFile(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selected = active.find((t) => t.id === tripId);

  return (
    <div className="min-h-screen bg-background pb-safe">
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Driver voucher entry</h1>
            <p className="text-xs text-muted-foreground">Log a paper receipt in seconds.</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
          <div className="grid gap-1.5">
            <Label>Active trip</Label>
            <Select value={tripId} onValueChange={setTripId}>
              <SelectTrigger><SelectValue placeholder="Select your current trip" /></SelectTrigger>
              <SelectContent>
                {active.length === 0 && (
                  <div className="px-2 py-3 text-xs text-muted-foreground">No active trips</div>
                )}
                {active.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.trip_code} — {t.origin_destination}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && (
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <StatusBadge status={selected.status} />
                <span>Advance {fmtTZS(selected.financial?.advance_paid_tzs)}</span>
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label>Expense type</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Description (e.g. Mbeya Fuel 850L)</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Liters</Label>
              <Input inputMode="decimal" placeholder="850" value={liters} onChange={(e) => setLiters(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Amount (TZS)</Label>
              <Input inputMode="decimal" placeholder="3,761,250" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5" /> Snap receipt photo
            </Label>
            <Input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && <div className="text-xs text-muted-foreground">✓ {file.name}</div>}
          </div>

          <Button
            className="w-full gap-2 h-11 text-base"
            onClick={() => submit.mutate()}
            disabled={!tripId || !amount || submit.isPending}
          >
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit for audit
          </Button>
        </div>

        <p className="mt-4 px-2 text-[11px] text-center text-muted-foreground">
          Vouchers appear as <span className="font-medium">Pending</span> until the dispatcher verifies them.
        </p>
      </main>
    </div>
  );
}
