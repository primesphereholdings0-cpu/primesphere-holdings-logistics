import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save, Trash2, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/fleet/AppHeader";
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
  head: () => ({ meta: [{ title: "Settings — FleetPulse" }, { name: "description", content: "Company, financial and user administration." }] }),
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
      <AppHeader />
      <main className="mx-auto max-w-[1200px] px-4 md:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Settings &amp; Administration</h1>
          <p className="text-sm text-muted-foreground">Company profile, financial defaults, users and audit logs.</p>
        </div>
        <Tabs defaultValue="company">
          <TabsList>
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
  const [f, setF] = useState({ company_name: "", logo_url: "", address: "", phone: "", email: "" });

  useEffect(() => {
    if (data) setF({
      company_name: data.company_name ?? "", logo_url: data.logo_url ?? "",
      address: data.address ?? "", phone: data.phone ?? "", email: data.email ?? "",
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
        <div className="grid gap-1.5"><Label>Address</Label><Textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
        <div><Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2"><Save className="h-4 w-4" />Save</Button></div>
      </div>
    </div>
  );
}

function FinancialTab() {
  const qc = useQueryClient();
  const { data } = useQuery(companySettingsQuery);
  const [currency, setCurrency] = useState("USD");
  const [fx, setFx] = useState("2600");
  const [notif, setNotif] = useState(true);

  useEffect(() => {
    if (data) { setCurrency(data.default_currency); setFx(String(data.default_fx_rate)); setNotif(data.notifications_enabled); }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!data) return;
      const { error } = await supabase.from("company_settings").update({
        default_currency: currency, default_fx_rate: Number(fx || 0), notifications_enabled: notif,
        updated_at: new Date().toISOString(),
      }).eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["company_settings"] }); toast.success("Financial settings saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-xl border bg-card p-6 max-w-xl">
      <div className="grid gap-4">
        <div className="grid gap-1.5"><Label>Default currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="TZS">TZS</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5"><Label>Default exchange rate (1 USD = TZS)</Label>
          <Input inputMode="decimal" value={fx} onChange={(e) => setFx(e.target.value)} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div><div className="text-sm font-medium">Notifications</div><div className="text-xs text-muted-foreground">Send email alerts on trip settlement.</div></div>
          <Switch checked={notif} onCheckedChange={setNotif} />
        </div>
        <div><Button onClick={() => save.mutate()} className="gap-2"><Save className="h-4 w-4" />Save</Button></div>
      </div>
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const { data: roles = [] } = useQuery(userRolesQuery);
  const [f, setF] = useState({ display_name: "", role: "dispatcher" });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("user_roles").insert({
        user_id: crypto.randomUUID(), display_name: f.display_name, role: f.role as "admin" | "dispatcher" | "finance" | "driver",
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["user_roles"] }); toast.success("User added"); setF({ display_name: "", role: "dispatcher" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["user_roles"] }); toast.success("Removed"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Permissions</th><th className="w-10" /></tr>
          </thead>
          <tbody>
            {roles.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No users yet.</td></tr>}
            {roles.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{r.display_name ?? r.user_id.slice(0, 8)}</td>
                <td className="px-4 py-3"><StatusBadge status={r.role} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{ROLE_DESC[r.role]}</td>
                <td className="px-2 py-3"><Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 text-sm font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Add user</div>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>Display name</Label><Input value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label>Role</Label>
            <Select value={f.role} onValueChange={(v) => setF({ ...f, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
            <div className="text-[11px] text-muted-foreground">{ROLE_DESC[f.role]}</div>
          </div>
          <Button onClick={() => add.mutate()} disabled={!f.display_name || add.isPending} className="gap-2"><Plus className="h-4 w-4" />Add</Button>
        </div>
      </div>
    </div>
  );
}

function SystemTab() {
  const { data: logs = [] } = useQuery(auditLogsQuery);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Backup: nightly automatic snapshots managed by Lovable Cloud. Restore via support.
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="border-b bg-muted/40 px-4 py-3 text-sm font-semibold">Audit logs</div>
        <div className="max-h-[500px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/20 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-2 font-medium">When</th><th className="px-4 py-2 font-medium">Action</th><th className="px-4 py-2 font-medium">Entity</th></tr>
            </thead>
            <tbody>
              {logs.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">No audit events yet.</td></tr>}
              {logs.map((l) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="px-4 py-2 text-xs text-muted-foreground tabular">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono text-xs">{l.action}</td>
                  <td className="px-4 py-2 text-xs">{l.entity} {l.entity_id ? `· ${l.entity_id.slice(0, 8)}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
