import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, DollarSign, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { invoiceDetailQuery } from "@/lib/queries";
import { fmtTZS } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/fleet/StatusBadge";
import { useState } from "react";

export const Route = createFileRoute("/invoices/$invoiceId")({
  component: InvoiceDetailPage,
  head: ({ params }) => ({
    meta: [
      { title: `Invoice — Primesphere Holdings Logistics` },
      { name: "description", content: "Invoice details and payment tracking." },
    ],
  }),
});

function InvoiceDetailPage() {
  const { invoiceId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(invoiceDetailQuery(invoiceId));
  const [paymentAmount, setPaymentAmount] = useState("");

  const markSent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "Sent", sent_at: new Date().toISOString() })
        .eq("id", invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      toast.success("Invoice marked as Sent");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      if (!data) return;
      const amount = Number(paymentAmount);
      if (amount <= 0) throw new Error("Enter a valid amount");
      const newPaid = data.paid_amount_tzs + amount;
      if (newPaid > data.total_amount_tzs) throw new Error("Payment exceeds invoice total");
      const status = newPaid >= data.total_amount_tzs ? "Paid" : "Partially Paid";
      const { error } = await supabase
        .from("invoices")
        .update({
          paid_amount_tzs: newPaid,
          status,
          paid_at: newPaid >= data.total_amount_tzs ? new Date().toISOString() : null,
        })
        .eq("id", invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      toast.success("Payment recorded");
      setPaymentAmount("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="min-h-screen bg-background p-6">Loading invoice…</div>;
  if (!data) return <div className="min-h-screen bg-background p-6">Invoice not found.</div>;

  const { invoice_number, customer, trips, period_start, period_end, subtotal_tzs, vat_amount_tzs, total_amount_tzs, paid_amount_tzs, status } = data;
  const balance = total_amount_tzs - paid_amount_tzs;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-xl px-4 py-3 md:px-6 flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/invoices" })} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{invoice_number}</span>
              <StatusBadge status={status} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Invoice</h1>
            <p className="text-xs text-muted-foreground">
              {customer?.company_name} · {new Date(period_start).toLocaleDateString()} – {new Date(period_end).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {status === "Draft" && (
            <Button size="sm" onClick={() => markSent.mutate()} className="gap-2">
              <Send className="h-4 w-4" /> Mark Sent
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 md:px-6 py-6">
        {/* Invoice content – this is what gets printed */}
        <div className="invoice-container rounded-xl border bg-white p-8 shadow-sm print:shadow-none print:border-0">
          {/* Header with colors */}
          <div className="flex items-center justify-between border-b-4 pb-4" style={{ borderColor: "#011F7B" }}>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "#011F7B" }}>INVOICE</h1>
              <p className="text-sm text-muted-foreground">Primesphere Holdings Logistics</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold" style={{ color: "#011F7B" }}>{invoice_number}</p>
              <p className="text-xs text-muted-foreground">Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Customer & Period */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Bill to</p>
              <p className="font-semibold" style={{ color: "#011F7B" }}>{customer?.company_name || "—"}</p>
              {customer?.address && <p className="text-sm">{customer.address}</p>}
              {customer?.phone && <p className="text-sm">{customer.phone}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Period</p>
              <p className="font-medium">
                {new Date(period_start).toLocaleDateString()} – {new Date(period_end).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Trips table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2" style={{ borderColor: "#FFBA09" }}>
                  <th className="py-2 text-left font-semibold" style={{ color: "#011F7B" }}>Trip</th>
                  <th className="py-2 text-left font-semibold" style={{ color: "#011F7B" }}>Route</th>
                  <th className="py-2 text-left font-semibold" style={{ color: "#011F7B" }}>Vehicle</th>
                  <th className="py-2 text-right font-semibold" style={{ color: "#011F7B" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {trips?.map((t) => (
                  <tr key={t.id} className="border-b">
                    <td className="py-2 font-mono text-xs">{t.trip_code}</td>
                    <td className="py-2">{t.origin_destination}</td>
                    <td className="py-2">{t.vehicle?.reg_number || "—"}</td>
                    <td className="py-2 text-right">{fmtTZS(t.financial?.contract_amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="py-2 text-right font-medium">Subtotal</td>
                  <td className="py-2 text-right">{fmtTZS(subtotal_tzs)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-2 text-right">VAT (18%)</td>
                  <td className="py-2 text-right">{fmtTZS(vat_amount_tzs)}</td>
                </tr>
                <tr className="border-t-2" style={{ borderColor: "#011F7B" }}>
                  <td colSpan={3} className="py-2 text-right text-lg font-bold" style={{ color: "#011F7B" }}>Total</td>
                  <td className="py-2 text-right text-lg font-bold" style={{ color: "#011F7B" }}>{fmtTZS(total_amount_tzs)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment status */}
          <div className="mt-6 flex items-center justify-between border-t-2 pt-4" style={{ borderColor: "#FFBA09" }}>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Payment status</p>
              <p className="font-semibold" style={{ color: paid_amount_tzs >= total_amount_tzs ? "#10b981" : "#FFBA09" }}>
                {status}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Amount paid</p>
              <p className="font-semibold">{fmtTZS(paid_amount_tzs)}</p>
              <p className="text-xs text-muted-foreground">Balance: {fmtTZS(balance)}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground" style={{ borderColor: "#011F7B" }}>
            <p>Primesphere Holdings Logistics · Thank you for your business</p>
          </div>
        </div>
      </main>

      {/* Record payment – hidden when printing */}
      {status !== "Paid" && (
        <div className="mx-auto max-w-4xl px-4 md:px-6 pb-6 print:hidden">
          <div className="rounded-xl border bg-card p-4 max-w-md">
            <h3 className="text-sm font-semibold mb-3">Record payment</h3>
            <div className="flex gap-3">
              <div className="grid gap-1.5 flex-1">
                <Label>Amount (TZS)</Label>
                <Input
                  inputMode="decimal"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <Button
                onClick={() => recordPayment.mutate()}
                disabled={!paymentAmount || recordPayment.isPending}
                className="self-end gap-2"
              >
                <DollarSign className="h-4 w-4" /> Record
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
