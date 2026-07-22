import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/layout/Sidebar";

// ... (keep NotFoundComponent, ErrorComponent unchanged) ...

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

// ... (RootShell stays same) ...

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

// ... (AuthGate remains unchanged) ...
