import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Car, User, Phone, Calendar, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatDate } from "@/lib/utils";
import { CAR_STATUS_CLASS, CAR_STATUS_LABEL, type CarStatus } from "@/lib/workshop-status";

type CarRow = {
  id: string;
  owner_name: string;
  owner_phone: string;
  make_model: string;
  license_plate: string;
  date_in: string;
  status: CarStatus;
};

export const Route = createFileRoute("/_authenticated/cars/")({
  component: CarsPage,
});

function CarsPage() {
  const [filter, setFilter] = useState<"all" | CarRow["status"]>("all");
  const [open, setOpen] = useState(false);

  const { data: cars = [], isLoading } = useQuery({
    queryKey: ["cars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cars")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CarRow[];
    },
  });

  const visible = filter === "all" ? cars : cars.filter((c) => c.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Cars</h1>
          <p className="text-sm text-muted-foreground">Vehicles in the workshop</p>
        </div>
        <Button size="lg" onClick={() => setOpen(true)} className="h-12 gap-2 text-base">
          <Plus className="h-5 w-5" /> Add car
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "in_progress", "ready", "delivered"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="lg"
            onClick={() => setFilter(f)}
            className="h-11"
          >
            {f === "all" ? "All" : CAR_STATUS_LABEL[f]}
            <span className="ml-2 text-xs opacity-75">
              {f === "all" ? cars.length : cars.filter((c) => c.status === f).length}
            </span>
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-4 text-muted-foreground">No cars to show.</p>
            <Button size="lg" onClick={() => setOpen(true)} className="gap-2">
              <Plus className="h-5 w-5" /> Add a car
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <Link
              key={c.id}
              to="/cars/$carId"
              params={{ carId: c.id }}
              className="block"
            >
              <Card className="h-full transition-colors hover:border-primary">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Car className="h-5 w-5 shrink-0 text-primary" />
                        <h3 className="truncate text-lg font-semibold">{c.make_model}</h3>
                      </div>
                      <div className="mt-1 inline-block rounded-md border bg-muted px-2 py-0.5 font-mono text-sm">
                        {c.license_plate}
                      </div>
                      <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2"><User className="h-4 w-4 shrink-0" /><span className="truncate">{c.owner_name}</span></div>
                        <div className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" /><span className="truncate">{c.owner_phone}</span></div>
                        <div className="flex items-center gap-2"><Calendar className="h-4 w-4 shrink-0" /><span>In {formatDate(c.date_in, "dd MMM yyyy")}</span></div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className={`mt-4 inline-block rounded-full border px-3 py-1 text-xs font-semibold ${CAR_STATUS_CLASS[c.status]}`}>
                    {CAR_STATUS_LABEL[c.status]}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <AddCarDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function AddCarDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [makeModel, setMakeModel] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [dateIn, setDateIn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [status, setStatus] = useState<CarRow["status"]>("in_progress");

  useEffect(() => {
    if (open) {
      setOwnerName(""); setOwnerPhone(""); setMakeModel(""); setLicensePlate("");
      setDateIn(format(new Date(), "yyyy-MM-dd")); setStatus("in_progress");
    }
  }, [open]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        owner_name: ownerName.trim(),
        owner_phone: ownerPhone.trim(),
        make_model: makeModel.trim(),
        license_plate: licensePlate.trim(),
        date_in: dateIn,
        status,
      };
      if (!payload.owner_name || !payload.owner_phone || !payload.make_model || !payload.license_plate)
        throw new Error("All fields are required");
      const { error } = await supabase.from("cars").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Car added");
      qc.invalidateQueries({ queryKey: ["cars"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add car</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="owner_name">Owner name</Label>
              <Input id="owner_name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="h-12 text-base" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner_phone">Owner phone</Label>
              <Input id="owner_phone" inputMode="tel" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} className="h-12 text-base" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="make_model">Make / Model</Label>
              <Input id="make_model" placeholder="e.g. Toyota Corolla" value={makeModel} onChange={(e) => setMakeModel(e.target.value)} className="h-12 text-base" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plate">License plate</Label>
              <Input id="plate" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value.toUpperCase())} className="h-12 font-mono text-base" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_in">Date brought in</Label>
              <Input id="date_in" type="date" value={dateIn} onChange={(e) => setDateIn(e.target.value)} className="h-12 text-base" required />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CarRow["status"])}>
                <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="lg" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
