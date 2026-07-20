import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/format";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = statusTone(status);
  const map = {
    primary: "bg-primary/15 text-primary border-primary/30",
    success: "bg-success/15 text-success border-success/30",
    warning: "bg-warning/20 text-warning-foreground border-warning/40 dark:text-warning",
    destructive: "bg-destructive/15 text-destructive border-destructive/30",
    muted: "bg-muted text-muted-foreground border-border",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tabular",
        map[tone],
        className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", {
          "bg-primary animate-pulse": tone === "primary",
          "bg-success": tone === "success",
          "bg-warning": tone === "warning",
          "bg-destructive": tone === "destructive",
          "bg-muted-foreground": tone === "muted",
        })}
      />
      {status}
    </span>
  );
}
