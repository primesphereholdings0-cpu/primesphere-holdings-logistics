import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Banknote } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";

export function NewDriverPaymentDialog({
  driverId,
  suggestedSalary,
}: {
  driverId: string;
  suggestedSalary?: number;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"Salary" | "Advance">("Salary");
  const [amount, setAmount] = useState(String(suggestedSalary ?? 0));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [period, setPeriod] = useState("");
  const [notes, setNotes] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("driver_payments").insert({
        driver_id: driverId,
        payment_type: type,
        amount_tzs: Number(amount || 0),
        payment_date: date,
        period_label: period || null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["driver", driverId] });
      qc.invalidateQueries({ queryKey: ["drivers", "overview"] });
      toast.success(`${type} recorded`);
      setOpen(false);
      setNotes("");
      setPeriod("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Banknote className="h-4 w-4" /> Record payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record driver payment</DialogTitle>
          <DialogDescription>Log salary payout or an extra cash advance.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <RadioGroup
            value={type}
            onValueChange={(v) => setType(v as "Salary" | "Advance")}
            className="flex gap-4"
          >
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem value="Salary" /> Salary
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem value="Advance" /> Cash advance
            </label>
          </RadioGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Amount (TZS)</Label>
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          {type === "Salary" && (
            <div className="grid gap-1.5">
              <Label>Period (e.g. Jul 2026)</Label>
              <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Jul 2026" />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => save.mutate()}
            disabled={!amount || save.isPending}
            className="gap-2"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
