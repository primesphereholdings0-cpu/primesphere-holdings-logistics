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

const NAVY = "#011F7B";
const GOLD = "#FFBA09";

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
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .invoice-container, .invoice-container * { visibility: visible; }
          .invoice-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }
          .print-hidden { display: none !important; }
        }
        .invoice-container {
          font-size: 14px;
          line-height: 1.6;
        }
        .invoice-container th,
        .invoice-container td {
          padding: 10px 12px;
        }
        .invoice-container .text-muted {
          color: #4a5568 !important;
        }
        .invoice-container .text-dark {
          color: #1a202c !important;
        }
      `}</style>

      {/* Header – hidden when printing */}
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-xl px-4 py-3 md:px-6 flex items-center justify-between gap-3 flex-wrap print-hidden">
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
        <div className="flex gap-2 print-hidden">
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

      <main className="mx-auto max-w-4xl px-4 md:px-6 py-6 print:px-0 print:py-0">
        <div className="invoice-container relative overflow-hidden rounded-xl border bg-white shadow-sm print:shadow-none print:border-0 print:rounded-none">
          {/* Top banner */}
          <div
            className="relative px-8 pt-8 pb-14"
            style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #023296 55%, ${NAVY} 100%)` }}
          >
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-white">INVOICE</h1>
                <p className="mt-1 text-sm text-white/80">Primesphere Holdings Logistics</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: GOLD }}>{invoice_number}</p>
                <p className="text-sm text-white/80">Date: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
            <svg
              className="absolute bottom-0 left-0 w-full"
              viewBox="0 0 600 60"
              preserveAspectRatio="none"
              style={{ height: "48px" }}
            >
              <path d="M0,30 C150,60 450,0 600,28 L600,60 L0,60 Z" fill="white" />
            </svg>
          </div>

          <div className="px-8 pb-6">
            {/* Bill to & Period */}
            <div className="mt-2 grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bill to</p>
                <p className="mt-1 text-base font-semibold text-gray-800">{customer?.company_name || "—"}</p>
                {customer?.address && <p className="text-sm text-gray-700">{customer.address}</p>}
                {customer?.phone && <p className="text-sm text-gray-700">{customer.phone}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Period</p>
                <p className="mt-1 text-base font-medium text-gray-800">
                  {new Date(period_start).toLocaleDateString()} – {new Date(period_end).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Trips table */}
            <div className="mt-6 overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: NAVY }}>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-white">Trip</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-white">Route</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-white">Vehicle</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-white">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {trips?.map((t) => (
                    <tr key={t.id} className="border-b last:border-b-0">
                      <td className="py-2.5 px-4 font-mono text-xs text-gray-800">{t.trip_code}</td>
                      <td className="py-2.5 px-4 text-gray-800">{t.origin_destination}</td>
                      <td className="py-2.5 px-4 text-gray-800">{t.vehicle?.reg_number || "—"}</td>
                      <td className="py-2.5 px-4 text-right font-medium text-gray-800">{fmtTZS(t.financial?.contract_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 flex justify-end">
              <div className="w-72">
                <div className="rounded-md border">
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-800">{fmtTZS(subtotal_tzs)}</span>
                  </div>
                  <div className="flex justify-between border-t px-4 py-2.5 text-sm">
                    <span className="text-gray-600">VAT (18%)</span>
                    <span className="font-medium text-gray-800">{fmtTZS(vat_amount_tzs)}</span>
                  </div>
                </div>
                <div
                  className="mt-3 flex items-center justify-between rounded-md px-4 py-3"
                  style={{ backgroundColor: NAVY }}
                >
                  <span className="text-sm font-bold uppercase tracking-wider text-white">Total</span>
                  <span className="text-xl font-bold text-white">{fmtTZS(total_amount_tzs)}</span>
                </div>
              </div>
            </div>

            {/* Payment status */}
            <div className="mt-6 flex items-center justify-between rounded-md border-l-4 bg-gray-50 px-4 py-3" style={{ borderColor: GOLD }}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Payment status</p>
                <p className="text-base font-bold" style={{ color: paid_amount_tzs >= total_amount_tzs ? "#10b981" : GOLD }}>
                  {status}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Amount paid</p>
                <p className="text-base font-bold text-gray-800">{fmtTZS(paid_amount_tzs)}</p>
                <p className="text-sm text-gray-600">Balance: {fmtTZS(balance)}</p>
              </div>
            </div>
          </div>

          {/* Bottom footer with terms */}
          <div
            className="relative mt-2 pt-9 pb-5"
            style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #023296 55%, ${NAVY} 100%)` }}
          >
            <svg
              className="absolute top-0 left-0 w-full"
              viewBox="0 0 600 60"
              preserveAspectRatio="none"
              style={{ height: "40px", transform: "scaleY(-1)" }}
            >
              <path d="M0,30 C150,0 450,60 600,30 L600,0 L0,0 Z" fill="white" />
            </svg>
            <div className="relative z-10 text-center">
              <p className="text-xs text-white/80">Primesphere Holdings Logistics · Thank you for your business</p>
              <p className="mt-1 text-xs text-white/60">Payment is due within 30 days from the invoice date.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Record payment – hidden when printing */}
      {status !== "Paid" && (
        <div className="mx-auto max-w-4xl px-4 md:px-6 pb-6 print-hidden">
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
