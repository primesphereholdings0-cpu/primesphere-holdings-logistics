import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save, Trash2, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { auditLogsQuery, companySettingsQuery, userRolesQuery } from "@/lib/queries";
import { StatusBadge } from "@/components/fleet/StatusBadge";

export const Route = createFileRoute("/settings/")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings — Primesphere Holdings Logistics" },
      { name: "description", content: "Company, financial and user administration." }
    ]
  }),
});

const ROLES = ["admin", "dispatcher", "finance", "driver"] as const;
const ROLE_DESC: Record<string, string> = {
  admin: "Full access to all modules",
  dispatcher: "Trips, Drivers, Vehicles",
  finance: "Expenses, Settlements, Reports",
  driver: "Driver Voucher only",
};

function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-xl px-4 py-3 md:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Settings &amp; Administration</h1>
          <p className="text-xs text-muted-foreground">Company profile, financial defaults, users and audit logs.</p>
        </div>
      </div>

      <main className="mx-auto max-w-[1200px] px-4 md:px-6 py-6">
        <Tabs defaultValue="company">
          <TabsList className="flex-wrap">
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="users">Users &amp; Roles</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
          <TabsContent value="company" className="mt-6"><CompanyTab /></TabsContent>
          <TabsContent value="financial" className="mt-6"><FinancialTab /></TabsContent>
          <TabsContent value="users" className="mt-6"><UsersTab /></TabsContent>
          <TabsContent value="system" className="mt-6"><SystemTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function CompanyTab() {
  const qc = useQueryClient();
  const { data } = useQuery(companySettingsQuery);
  const [f, setF] = useState({
    company_name: "",
    logo_url: "",
    address: "",
    phone: "",
    email: "",
    tin: "", // <-- ADDED
  });

  useEffect(() => {
    if (data) setF({
      company_name: data.company_name ?? "",
      logo_url: data.logo_url ?? "",
      address: data.address ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      tin: data.tin ?? "", // <-- ADDED
    });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!data) return;
      const { error } = await supabase.from("company_settings").update({ ...f, updated_at: new Date().toISOString() }).eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["company_settings"] }); toast.success("Company settings saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-xl border bg-card p-6 max-w-2xl">
      <div className="grid gap-4">
        <div className="grid gap-1.5"><Label>Company name</Label><Input value={f.company_name} onChange={(e) => setF({ ...f, company_name: e.target.value })} /></div>
        <div className="grid gap-1.5"><Label>Logo URL</Label><Input value={f.logo_url} onChange={(e) => setF({ ...f, logo_url: e.target.value })} placeholder="https://…" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5"><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label>Email</Label><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        </div>
        <div className="grid gap-1.5"><Label>TIN</Label><Input value={f.tin} onChange={(e) => setF({ ...f, tin: e.target.value })} /></div> {/* <-- ADDED */}
        <div className="grid gap-1.5"><Label>Address</Label><Textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
        <div><Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2"><Save className="h-4 w-4" />Save</Button></div>
      </div>
    </div>
  );
}

// ... the rest of the file (FinancialTab, UsersTab, SystemTab) remains unchanged ...
