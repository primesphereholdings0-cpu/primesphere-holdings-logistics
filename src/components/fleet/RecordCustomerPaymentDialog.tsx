import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Loader2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

type RecordCustomerPaymentDialogProps = {
  tripId: string;
  tripCode: string;
  currentPaid: number;
  contractAmount: number;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
};

export function RecordCustomerPaymentDialog({
  tripId,
  tripCode,
  currentPaid,
  contractAmount,
  trigger,
  onSuccess,
}: RecordCustomerPaymentDialogProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");

  const recordPayment = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      if (!amt || amt <= 0) throw new Error("Enter a valid amount");
      const newPaid = currentPaid + amt;
      if (newPaid > contractAmount) throw new Error("Payment exceeds contract amount");
      const { error } = await supabase
        .from("trip_financials")
        .update({ customer_paid_tzs: newPaid })
        .eq("trip_id", tripId);
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        action: "customer_payment",
        entity: "trip",
        entity_id: tripId,
        payload: { amount_tzs: amt, reference, payment_date: paymentDate, new_total: newPaid },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trip", tripId] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success(`Payment of ${Number(amount).toLocaleString()} TZS recorded`);
      setOpen(false);
      if (onSuccess) onSuccess();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Record Payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record customer payment</DialogTitle>
          <DialogDescription>
            For trip <span className="font-mono">{tripCode}</span> – total contract: {contractAmount.toLocaleString()} TZS.
            <br />
            Already paid: {currentPaid.toLocaleString()} TZS.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Amount (TZS)</Label>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Payment date</Label>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Reference / Invoice #</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="INV-001"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => recordPayment.mutate()}
            disabled={!amount || recordPayment.isPending}
            className="gap-2"
          >
            {recordPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
