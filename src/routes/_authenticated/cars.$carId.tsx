import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Trash2, Upload, Car, User, Phone, Calendar, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";
import { formatDate } from "@/lib/utils";
import { STATUS_LABEL, STATUS_CLASS } from "./cars.index";

type CarRow = {
  id: string;
  owner_name: string;
  owner_phone: string;
  make_model: string;
  license_plate: string;
  date_in: string;
  status: "in_progress" | "ready" | "delivered";
};

type Task = {
  id: string;
  car_id: string;
  description: string;
  done: boolean;
  assigned_employee_id: string | null;
  created_at: string;
};

type Photo = {
  id: string;
  car_id: string;
  storage_path: string;
  created_at: string;
};

type Employee = { id: string; name: string };

export const Route = createFileRoute("/_authenticated/cars/$carId")({
  component: CarDetailPage,
});

function CarDetailPage() {
  const { carId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: car, isLoading, isError, error } = useQuery({
    queryKey: ["car", carId],
    queryFn: async () => {
      const { data, error } = await supabase.from("cars").select("*").eq("id", carId).maybeSingle();
      if (error) throw error;
      return data as CarRow | null;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: CarRow["status"]) => {
      const { error } = await supabase.from("cars").update({ status }).eq("id", carId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["car", carId] });
      qc.invalidateQueries({ queryKey: ["cars"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const delCar = useMutation({
    mutationFn: async () => {
      const { data: photos } = await supabase.from("car_photos").select("storage_path").eq("car_id", carId);
      if (photos && photos.length > 0) {
        await supabase.storage.from("car-photos").remove(photos.map((p) => p.storage_path));
      }
      const { error } = await supabase.from("cars").delete().eq("id", carId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Car deleted");
      qc.invalidateQueries({ queryKey: ["cars"] });
      navigate({ to: "/cars" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  if (isError) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="font-medium">Unable to load this car.</p>
        <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Please try again."}</p>
        <Button asChild size="lg"><Link to="/cars">Back to cars</Link></Button>
      </div>
    );
  }
  if (!car) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">Car not found.</p>
        <Button asChild size="lg"><Link to="/cars">Back to cars</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="lg" className="gap-2 -ml-2">
        <Link to="/cars"><ArrowLeft className="h-4 w-4" /> Back to cars</Link>
      </Button>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Car className="h-6 w-6 text-primary" />
                <h1 className="truncate text-2xl font-bold">{car.make_model}</h1>
              </div>
              <div className="mt-2 inline-block rounded-md border bg-muted px-2 py-1 font-mono text-base">
                {car.license_plate}
              </div>
              <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <div className="flex items-center gap-2"><User className="h-4 w-4" /> {car.owner_name}</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {car.owner_phone}</div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Brought in {formatDate(car.date_in, "dd MMM yyyy")}</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_CLASS[car.status]}`}>
                {STATUS_LABEL[car.status]}
              </div>
              <Select value={car.status} onValueChange={(v) => updateStatus.mutate(v as CarRow["status"])}>
                <SelectTrigger className="h-11 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" /> Delete car
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <TasksSection carId={carId} />
      <PhotosSection carId={carId} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this car?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the car, its checklist, and all uploaded photos. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => delCar.mutate()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TasksSection({ carId }: { carId: string }) {
  const qc = useQueryClient();
  const [newTask, setNewTask] = useState("");

  const { data: tasks = [] } = useQuery({
    queryKey: ["car-tasks", carId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("car_tasks").select("*").eq("car_id", carId).order("created_at");
      if (error) throw error;
      return data as Task[];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").order("name");
      if (error) throw error;
      return data as Employee[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const desc = newTask.trim();
      if (!desc) throw new Error("Task is empty");
      const { error } = await supabase.from("car_tasks").insert({ car_id: carId, description: desc });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewTask("");
      qc.invalidateQueries({ queryKey: ["car-tasks", carId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (vars: { id: string; patch: Partial<Task> }) => {
      const { error } = await supabase.from("car_tasks").update(vars.patch).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["car-tasks", carId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("car_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["car-tasks", carId] }),
  });

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Checklist</span>
          <span className="text-sm font-normal text-muted-foreground">{doneCount} / {tasks.length} done</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={(e) => { e.preventDefault(); add.mutate(); }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <Input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="e.g. Replace brake pads"
            className="h-12 text-base"
          />
          <Button type="submit" size="lg" disabled={add.isPending} className="h-12 gap-2">
            <Plus className="h-5 w-5" /> Add task
          </Button>
        </form>

        {tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No tasks yet.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <Checkbox
                  checked={t.done}
                  onCheckedChange={(v) => update.mutate({ id: t.id, patch: { done: !!v } })}
                  className="h-5 w-5"
                />
                <span className={`min-w-0 flex-1 text-base ${t.done ? "text-muted-foreground line-through" : ""}`}>
                  {t.description}
                </span>
                <Select
                  value={t.assigned_employee_id ?? "unassigned"}
                  onValueChange={(v) =>
                    update.mutate({
                      id: t.id,
                      patch: { assigned_employee_id: v === "unassigned" ? null : v },
                    })
                  }
                >
                  <SelectTrigger className="h-10 w-44"><SelectValue placeholder="Assign" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => del.mutate(t.id)}
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PhotosSection({ carId }: { carId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<{ url: string; date: string } | null>(null);
  const [toDelete, setToDelete] = useState<Photo | null>(null);

  const { data: photos = [] } = useQuery({
    queryKey: ["car-photos", carId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("car_photos").select("*").eq("car_id", carId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Photo[];
    },
  });

  const paths = useMemo(() => photos.map((p) => p.storage_path), [photos]);
  const { data: urls = {} } = useQuery({
    queryKey: ["car-photo-urls", carId, paths.join("|")],
    enabled: paths.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("car-photos").createSignedUrls(paths, 60 * 60);
      if (error) throw error;
      const map: Record<string, string> = {};
      data.forEach((d, i) => { if (d.signedUrl) map[paths[i]] = d.signedUrl; });
      return map;
    },
  });

  const onPickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`);
          continue;
        }
        const blob = await compressImage(file, { maxBytes: 500 * 1024 });
        const path = `${carId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("car-photos")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        const { error: insErr } = await supabase
          .from("car_photos").insert({ car_id: carId, storage_path: path });
        if (insErr) throw insErr;
      }
      toast.success("Photos uploaded");
      qc.invalidateQueries({ queryKey: ["car-photos", carId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const del = useMutation({
    mutationFn: async (p: Photo) => {
      await supabase.storage.from("car-photos").remove([p.storage_path]);
      const { error } = await supabase.from("car_photos").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Photo deleted");
      qc.invalidateQueries({ queryKey: ["car-photos", carId] });
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Photos</span>
          <span className="text-sm font-normal text-muted-foreground">{photos.length} uploaded</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onPickFiles(e.target.files)}
          />
          <Button
            size="lg"
            className="h-12 gap-2"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-5 w-5" />
            {uploading ? "Uploading..." : "Upload photos"}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Photos are automatically compressed to about 500 KB before saving.
          </p>
        </div>

        {photos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <ImageOff className="h-8 w-8" />
            <p className="text-sm">No photos yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((p) => {
              const url = urls[p.storage_path];
              return (
                <div key={p.id} className="group relative overflow-hidden rounded-lg border bg-muted">
                  <button
                    type="button"
                    className="block aspect-square w-full"
                    onClick={() => url && setViewer({ url, date: p.created_at })}
                  >
                    {url ? (
                      <img src={url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Loading...</div>
                    )}
                  </button>
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-2 py-1 text-[11px] text-white">
                    <span>{formatDate(p.created_at, "dd MMM, HH:mm")}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setToDelete(p); }}
                      className="rounded p-1 hover:bg-white/20"
                      aria-label="Delete photo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!viewer} onOpenChange={(o) => !o && setViewer(null)}>
        <DialogContent className="max-w-4xl p-2">
          {viewer && (
            <div className="space-y-2">
              <img src={viewer.url} alt="" className="max-h-[80vh] w-full rounded object-contain" />
              <p className="text-center text-xs text-muted-foreground">
                Uploaded {formatDate(viewer.date, "dd MMM yyyy 'at' HH:mm")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => toDelete && del.mutate(toDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
