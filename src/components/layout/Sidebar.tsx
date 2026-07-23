import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Smartphone,
  Moon,
  Sun,
  Users,
  Receipt,
  Route as RouteIcon,
  LineChart,
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  Wrench,
  User,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/trips", label: "Trips", icon: RouteIcon },
  { to: "/vehicles", label: "Vehicles", icon: Wrench },
  { to: "/drivers", label: "Drivers", icon: Users },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/customers", label: "Customers", icon: Building2 },
  { to: "/finance", label: "Finance", icon: LineChart },
  { to: "/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/voucher", label: "Voucher", icon: Smartphone },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("fp-theme");
    const isDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("fp-theme", next ? "dark" : "light");
  };

  const SignOutButton = () => {
    const router = useRouter();
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn("w-full justify-start gap-3", collapsed && "justify-center")}
        onClick={async () => {
          await supabase.auth.signOut();
          router.navigate({ to: "/auth" });
        }}
      >
        <LogOut className="h-4 w-4" />
        {!collapsed && <span>Sign out</span>}
      </Button>
    );
  };

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => {
    const initial = userEmail ? userEmail.charAt(0).toUpperCase() : "?";
    const displayName = userEmail ? userEmail.split("@")[0] : "User";

    return (
      <div className="flex h-full flex-col">
        {/* Profile card */}
        <div className={cn(
          "mx-3 mt-3 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-background p-4 shadow-sm border border-primary/10",
          collapsed && "mx-2 mt-2 p-3"
        )}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/20">
                <span className="text-lg font-bold">{initial}</span>
              </div>
              {/* Online status dot */}
              <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500 ring-2 ring-emerald-500/30" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate">{displayName}</span>
                <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
              </div>
            )}
          </div>
          {/* Optional: small badge or extra info – we can leave as is */}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-2 py-4">
          {navItems.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => mobile && setMobileOpen(false)}
                className={cn(
                  "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="ml-3">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom controls */}
        <div className="border-t p-2">
          <div className={cn("flex items-center gap-1", collapsed && "flex-col")}>
            <Button
              variant="ghost"
              size="sm"
              className={cn("flex-1 justify-start gap-3", collapsed && "justify-center flex-1 w-full")}
              onClick={toggleTheme}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {!collapsed && <span>{dark ? "Light" : "Dark"}</span>}
            </Button>
            <SignOutButton />
          </div>
          {!mobile && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full justify-center"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? "→" : "←"}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile hamburger */}
      <div className="fixed left-4 top-4 z-50 md:hidden">
        <Button variant="outline" size="icon" onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform bg-background transition-transform duration-300 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="absolute right-2 top-2">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <SidebarContent mobile />
      </div>

      <aside
        className={cn(
          "hidden md:flex h-screen sticky top-0 flex-col border-r bg-background transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
