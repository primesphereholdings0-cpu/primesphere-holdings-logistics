import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ImageIcon, Loader2 } from "lucide-react";

export function ReceiptViewer({ path }: { path: string | null }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !path) return;
    setLoading(true);
    supabase.storage.from("receipts").createSignedUrl(path, 600).then(({ data }) => {
      setUrl(data?.signedUrl ?? null);
      setLoading(false);
    });
  }, [open, path]);

  if (!path) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition"
      >
        <ImageIcon className="h-3 w-3" /> View
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>
          <div className="grid min-h-[300px] place-items-center">
            {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
            {!loading && url && <img src={url} alt="Receipt" className="max-h-[70vh] rounded-md" />}
            {!loading && !url && <div className="text-sm text-muted-foreground">Unable to load receipt</div>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
