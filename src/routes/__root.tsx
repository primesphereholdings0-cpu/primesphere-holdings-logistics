import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { supabase } from "@/integrations/supabase/client";

// ========== NOT FOUND COMPONENT ==========
function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

// ========== ERROR COMPONENT ==========
function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. Try refreshing or head back to the dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

// ========== ROOT SHELL ==========
function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// ========== AUTH GATE ==========
function AuthGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const [state, setState] = useState<"loading" | "in" | "out">("loading");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState(data.session ? "in" : "out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setState(session ? "in" : "out");
      if (!session && pathname !== "/auth") router.navigate({ to: "/auth" });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (pathname === "/auth") return <>{children}</>;
  if (state === "loading") {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (state === "out") {
    if (typeof window !== "undefined") router.navigate({ to: "/auth" });
    return null;
  }
  return <>{children}</>;
}

// ========== ROOT COMPONENT ==========
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </AuthGate>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

// ========== ROUTE DEFINITION ==========
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Primesphere Holdings Logistics – Fleet Management" },
      {
        name: "description",
        content:
          "Real-time fleet operations dashboard for Primesphere Holdings Logistics – track trips, driver advances, expenses, and settlements.",
      },
      { name: "author", content: "Primesphere Holdings Logistics" },
      { property: "og:title", content: "Primesphere Holdings Logistics – Fleet Ops" },
      {
        property: "og:description",
        content: "Replace manual Excel trip sheets with a live operations dashboard and driver expense audit for Primesphere Holdings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});
