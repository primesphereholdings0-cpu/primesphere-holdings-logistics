import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

export function NewContractDialog({ customerId }: { customerId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    route: "",
    contract_currency: "USD",
    contract_amount: "",
    start_date: "",
    end_date: "",
    status: "Draft",
    contract_type: "border" as "border" | "local",
    renewal_date: "",
    termination_date: "",
    notice_period_days: "",
    auto_renew: false,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        customer_id: customerId,
        route: f.route,
        contract_currency: f.contract_currency,
        contract_amount: Number(f.contract_amount || 0),
        start_date: f.start_date || null,
        end_date: f.end_date || null,
        status: f.status,
        contract_type: f.contract_type,
        auto_renew: f.auto_renew,
        notice_period_days: f.notice_period_days ? Number(f.notice_period_days) : null,
      };
      if (f.renewal_date) payload.renewal_date = f.renewal_date;
      if (f.termination_date) payload.termination_date = f.termination_date;
      const { error } = await supabase.from("contracts").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer", customerId] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Contract created");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetForm = () => {
    setF({
      route: "",
      contract_currency: "USD",
      contract_amount: "",
      start_date: "",
      end_date: "",
      status: "Draft",
      contract_type: "border",
      renewal_date: "",
      termination_date: "",
      notice_period_days: "",
      auto_renew: false,
    });
  };

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2"><Plus className="h-4 w-4" />New contract</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New contract</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label>Route</Label><Input value={f.route} onChange={(e) => setF({ ...f, route: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
            <div className="grid gap-1.5"><Label>Currency</Label>
              <Select value={f.contract_currency} onValueChange={(v) => setF({ ...f, contract_currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="TZS">TZS</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>Amount</Label><Input inputMode="decimal" value={f.contract_amount} onChange={(e) => setF({ ...f, contract_amount: e.target.value })} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label>Start date</Label><Input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>End date</Label><Input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>Contract type</Label>
              <Select value={f.contract_type} onValueChange={(v) => setF({ ...f, contract_type: v as "border" | "local" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="border">Border</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Local contract specific fields */}
          {f.contract_type === "local" && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Local contract management
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5"><Label>Renewal date</Label><Input type="date" value={f.renewal_date} onChange={(e) => setF({ ...f, renewal_date: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label>Termination date</Label><Input type="date" value={f.termination_date} onChange={(e) => setF({ ...f, termination_date: e.target.value })} /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5"><Label>Notice period (days)</Label><Input inputMode="numeric" value={f.notice_period_days} onChange={(e) => setF({ ...f, notice_period_days: e.target.value })} placeholder="30" /></div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">Auto‑renew</div>
                    <div className="text-xs text-muted-foreground">Automatically renew when ended</div>
                  </div>
                  <Switch checked={f.auto_renew} onCheckedChange={(checked) => setF({ ...f, auto_renew: checked })} />
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!f.route || save.isPending} className="gap-2">
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
