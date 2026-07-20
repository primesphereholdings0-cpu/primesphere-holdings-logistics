import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Camera } from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = ["Fuel", "Road Tolls", "Driver Millage", "Container Drop-off", "Miscellaneous"];

export function AddExpenseDrawer({
  tripId,
  trigger,
}: {
  tripId: string;
  trigger?: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Fuel");
  const [description, setDescription] = useState("");
  const [liters, setLiters] = useState("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const add = useMutation({
    mutationFn: async () => {
      let receipt_url: string | null = null;
      if (file) {
        const path = `${tripId}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`;
        const { error } = await supabase.storage.from("receipts").upload(path, file, { upsert: false });
        if (error) throw error;
        receipt_url = path;
      }
      const { error } = await supabase.from("trip_expenses").insert({
        trip_id: tripId,
        category,
        description: description || null,
        volume_liters: liters ? Number(liters) : null,
        amount_tzs: Number(amount || 0),
        receipt_url,
        status: "Pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trip", tripId] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Expense logged");
      setOpen(false);
      setDescription(""); setLiters(""); setAmount(""); setFile(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add expense
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader>
            <DrawerTitle>Log trip expense</DrawerTitle>
            <DrawerDescription>Capture fuel, tolls, allowances and attach a receipt photo.</DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-4 px-4 pb-2">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Description</Label>
              <Textarea
                rows={2}
                placeholder="e.g. Fuel Mbeya station, 850L"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Volume (Liters, optional)</Label>
                <Input inputMode="decimal" value={liters} onChange={(e) => setLiters(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Amount (TZS)</Label>
                <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5" /> Receipt photo
              </Label>
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && <div className="text-xs text-muted-foreground">{file.name}</div>}
            </div>
          </div>
          <DrawerFooter>
            <Button
              onClick={() => add.mutate()}
              disabled={!amount || add.isPending}
              className="gap-2"
            >
              {add.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit for audit
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
