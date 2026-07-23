import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Calendar, FileText, Building2 } from "lucide-react";
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
import { customersQuery, tripsQuery } from "@/lib/queries";
import { fmtTZS, generateInvoiceNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function NewInvoiceDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: customers } = useQuery(customersQuery);
  const { data: allTrips } = useQuery(tripsQuery);

  const [customerId, setCustomerId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrips = async () => {
    if (!customerId || !periodStart || !periodEnd) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("trips")
      .select("*, vehicle:vehicles(*), driver:drivers(*), financial:trip_financials(*)")
      .eq("customer_id", customerId)
      .eq("trip_type", "local")
      .is("invoice_id", null)
      .gte("dispatch_date", periodStart)
      .lte("dispatch_date", periodEnd);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setTrips(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (customerId && periodStart && periodEnd) {
      fetchTrips();
    } else {
      setTrips([]);
    }
  }, [customerId, periodStart, periodEnd]);

  const totalSubtotal = trips.reduce((sum, t) => sum + Number(t.financial?.contract_amount ?? 0), 0);
  const vatAmount = totalSubtotal * 0.18;
  const totalAmount = totalSubtotal + vatAmount;

  const createInvoice = useMutation({
    mutationFn: async () => {
      const invoiceNumber = generateInvoiceNumber();
      const { data: invoice, error: e1 } = await supabase
        .from("invoices")
        .insert({
          customer_id: customerId,
          invoice_number: invoiceNumber,
          period_start: periodStart,
          period_end: periodEnd,
          subtotal_tzs: totalSubtotal,
          vat_percent: 18,
          vat_amount_tzs: vatAmount,
          total_amount_tzs: totalAmount,
          status: "Draft",
        })
        .select()
        .single();
      if (e1) throw e1;
      // Link trips to invoice
      const tripIds = trips.map((t) => t.id);
      const { error: e2 } = await supabase
        .from("trips")
        .update({ invoice_id: invoice.id })
        .in("id", tripIds);
      if (e2) throw e2;
      return invoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Invoice created");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <FileText className="h-4 w-4" />
          New Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Invoice</DialogTitle>
          <DialogDescription>
            Select customer and period. All un-invoiced trips will be included.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Period start</Label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Period end</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading trips…</div>
          ) : (
            <>
              {trips.length > 0 && (
                <div className="rounded-xl border bg-card">
                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Trip</th>
                          <th className="px-3 py-2">Route</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trips.map((t) => (
                          <tr key={t.id} className="border-b last:border-0">
                            <td className="px-3 py-2 text-muted-foreground">{t.dispatch_date}</td>
                            <td className="px-3 py-2 font-mono text-xs">{t.trip_code}</td>
                            <td className="px-3 py-2">{t.origin_destination}</td>
                            <td className="px-3 py-2 text-right">{fmtTZS(t.financial?.contract_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {!loading && customerId && periodStart && periodEnd && trips.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No un-invoiced trips in this period for this customer.
                </div>
              )}
            </>
          )}

          {trips.length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold">{fmtTZS(totalSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT (18%)</span>
                <span className="font-semibold">{fmtTZS(vatAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-lg font-bold">
                <span>Total</span>
                <span>{fmtTZS(totalAmount)}</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => createInvoice.mutate()}
            disabled={!customerId || !periodStart || !periodEnd || trips.length === 0 || createInvoice.isPending}
            className="gap-2"
          >
            {createInvoice.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Generate Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
