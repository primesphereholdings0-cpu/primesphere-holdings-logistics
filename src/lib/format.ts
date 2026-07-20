export const fmtTZS = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(n ?? 0)) + " TZS";

export const fmtUSD = (n: number | null | undefined) =>
  "$" + new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(n ?? 0));

export const fmtNum = (n: number | null | undefined, d = 0) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: d }).format(Number(n ?? 0));

export const statusTone = (s: string): "primary" | "success" | "warning" | "muted" | "destructive" => {
  switch (s) {
    case "In-Transit":
    case "Dispatched":
      return "primary";
    case "Completed":
    case "Verified":
    case "Audited":
      return "success";
    case "Pending":
    case "Draft":
      return "warning";
    case "Rejected":
    case "Maintenance":
      return "destructive";
    default:
      return "muted";
  }
};
