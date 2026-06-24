import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Save, Printer, Download, Trash2, Upload, ImageOff, Wrench, Fuel, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { compressImage } from "@/lib/image-compress";
import { JOB_STATUSES, STATUS_LABEL, type JobStatus } from "./job-cards.index";

type JobCard = {
  id: string;
  job_number: string;
  job_date: string;
  job_time: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string | null;
  vehicle_reg: string;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vin: string | null;
  mileage_km: number | null;
  fuel_level: number | null;
  complaint: string | null;
  estimated_parts_cost: number | null;
  estimated_labour_cost: number | null;
  customer_approval: boolean;
  assigned_technician_id: string | null;
  assigned_date: string | null;
  work_done: string | null;
  parts_used: string | null;
  final_labour_charge: number | null;
  final_bill_amount: number | null;
  delivery_date: string | null;
  status: JobStatus;
};

type Employee = { id: string; name: string; role: string; phone: string };
type Photo = { id: string; job_card_id: string; storage_path: string; created_at: string };

export const Route = createFileRoute("/_authenticated/job-cards/$jobId")({
  component: JobCardDetailPage,
});

const NULLABLE_STR = ["customer_email","customer_address","vehicle_brand","vehicle_model","vin","complaint","work_done","parts_used","assigned_date","delivery_date","assigned_technician_id"] as const;
const NUM_FIELDS = ["vehicle_year","mileage_km","fuel_level","estimated_parts_cost","estimated_labour_cost","final_labour_charge","final_bill_amount"] as const;

function JobCardDetailPage() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<JobCard | null>(null);

  const { data: card, isLoading } = useQuery({
    queryKey: ["job_card", jobId],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_cards").select("*").eq("id", jobId).single();
      if (error) throw error;
      return data as JobCard;
    },
  });

  useEffect(() => { if (card) setForm(card); }, [card]);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("id,name,role,phone").order("name");
      if (error) throw error;
      return data as Employee[];
    },
  });
  const techName = employees.find((e) => e.id === form?.assigned_technician_id)?.name ?? "";

  const { data: photos = [] } = useQuery({
    queryKey: ["job_card_photos", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_card_photos").select("*").eq("job_card_id", jobId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Photo[];
    },
  });

  const photoUrls = useMemo(() => {
    return photos.map((p) => ({
      ...p,
      url: supabase.storage.from("car-photos").getPublicUrl(p.storage_path).data.publicUrl,
    }));
  }, [photos]);

  const saveMut = useMutation({
    mutationFn: async (patch: Partial<JobCard>) => {
      const { error } = await supabase.from("job_cards").update(patch).eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["job_card", jobId] });
      qc.invalidateQueries({ queryKey: ["job_cards"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      const paths = photos.map((p) => p.storage_path);
      if (paths.length) await supabase.storage.from("car-photos").remove(paths);
      const { error } = await supabase.from("job_cards").delete().eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job card deleted");
      qc.invalidateQueries({ queryKey: ["job_cards"] });
      navigate({ to: "/job-cards" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadPhotos = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const arr = Array.from(files);
    toast.message(`Uploading ${arr.length} photo${arr.length === 1 ? "" : "s"}...`);
    for (const file of arr) {
      try {
        const compressed = await compressImage(file);
        const path = `job-cards/${jobId}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("car-photos").upload(path, compressed, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        const { error: insErr } = await supabase
          .from("job_card_photos").insert({ job_card_id: jobId, storage_path: path });
        if (insErr) throw insErr;
      } catch (e) {
        toast.error(`Upload failed: ${(e as Error).message}`);
      }
    }
    qc.invalidateQueries({ queryKey: ["job_card_photos", jobId] });
    if (fileRef.current) fileRef.current.value = "";
  };

  const deletePhoto = async (p: Photo) => {
    await supabase.storage.from("car-photos").remove([p.storage_path]);
    await supabase.from("job_card_photos").delete().eq("id", p.id);
    qc.invalidateQueries({ queryKey: ["job_card_photos", jobId] });
  };

  if (isLoading || !form) return <p className="py-10 text-center text-muted-foreground">Loading...</p>;

  const set = <K extends keyof JobCard>(k: K, v: JobCard[K]) => setForm({ ...form, [k]: v });
  const num = (v: string) => (v === "" ? null : Number(v));

  const totalEstimate = (Number(form.estimated_parts_cost) || 0) + (Number(form.estimated_labour_cost) || 0);

  const onSave = () => {
    const patch: Partial<JobCard> = { ...form };
    for (const k of NULLABLE_STR) {
      const v = patch[k];
      if (typeof v === "string" && v.trim() === "") (patch as Record<string, unknown>)[k] = null;
    }
    for (const k of NUM_FIELDS) {
      const v = patch[k];
      if (v === undefined || (v as unknown) === "") (patch as Record<string, unknown>)[k] = null;
    }
    saveMut.mutate(patch);
  };

  return (
    <>
      <div className="print:hidden">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Button asChild variant="ghost" size="lg" className="gap-2">
            <Link to="/job-cards"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" variant="outline" onClick={() => window.print()} className="h-12 gap-2">
              <Printer className="h-4 w-4" /> Print Job Card
            </Button>
            <Button size="lg" variant="outline" onClick={() => window.print()} className="h-12 gap-2">
              <Download className="h-4 w-4" /> Download PDF
            </Button>
            <Button size="lg" onClick={onSave} disabled={saveMut.isPending} className="h-12 gap-2">
              <Save className="h-4 w-4" /> Save
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-mono text-sm text-primary">{form.job_number}</div>
            <h1 className="text-2xl font-bold sm:text-3xl">{form.customer_name || "Job Card"}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-base">Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as JobStatus)}>
              <SelectTrigger className="h-12 w-[200px] text-base"><SelectValue /></SelectTrigger>
              <SelectContent>
                {JOB_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Visit info */}
          <Card>
            <CardHeader><CardTitle>Visit</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Field label="Date"><Input type="date" value={form.job_date} onChange={(e) => set("job_date", e.target.value)} /></Field>
              <Field label="Time"><Input type="time" value={form.job_time?.slice(0,5) ?? ""} onChange={(e) => set("job_time", e.target.value)} /></Field>
              <Field label="Job Card #"><Input value={form.job_number} readOnly className="font-mono" /></Field>
            </CardContent>
          </Card>

          {/* Customer */}
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Customer Name"><Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} /></Field>
              <Field label="Phone Number"><Input value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} /></Field>
              <Field label="Email"><Input type="email" value={form.customer_email ?? ""} onChange={(e) => set("customer_email", e.target.value)} /></Field>
              <Field label="Address"><Input value={form.customer_address ?? ""} onChange={(e) => set("customer_address", e.target.value)} /></Field>
            </CardContent>
          </Card>

          {/* Vehicle */}
          <Card>
            <CardHeader><CardTitle>Vehicle</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Registration #"><Input value={form.vehicle_reg} onChange={(e) => set("vehicle_reg", e.target.value.toUpperCase())} /></Field>
              <Field label="Brand"><Input value={form.vehicle_brand ?? ""} onChange={(e) => set("vehicle_brand", e.target.value)} /></Field>
              <Field label="Model"><Input value={form.vehicle_model ?? ""} onChange={(e) => set("vehicle_model", e.target.value)} /></Field>
              <Field label="Year"><Input type="number" value={form.vehicle_year ?? ""} onChange={(e) => set("vehicle_year", num(e.target.value) as number | null)} /></Field>
              <Field label="VIN / Chassis #"><Input value={form.vin ?? ""} onChange={(e) => set("vin", e.target.value)} /></Field>
              <Field label="Mileage (km)"><Input type="number" value={form.mileage_km ?? ""} onChange={(e) => set("mileage_km", num(e.target.value) as number | null)} /></Field>
              <Field label="Fuel Level (1–5)">
                <div className="flex h-10 items-center gap-2 rounded-md border bg-background px-3">
                  <Fuel className="h-4 w-4 text-muted-foreground" />
                  {[1,2,3,4,5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set("fuel_level", n)}
                      className={`h-7 w-7 rounded-md border text-sm font-semibold ${form.fuel_level === n ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
                    >{n}</button>
                  ))}
                </div>
              </Field>
            </CardContent>
          </Card>

          {/* Complaint */}
          <Card>
            <CardHeader><CardTitle>Customer Complaint</CardTitle></CardHeader>
            <CardContent>
              <Textarea rows={4} value={form.complaint ?? ""} onChange={(e) => set("complaint", e.target.value)} placeholder="Describe the issue reported by the customer..." />
            </CardContent>
          </Card>

          {/* Estimate */}
          <Card>
            <CardHeader><CardTitle>Estimate</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Field label="Parts Cost (₹)"><Input type="number" step="0.01" value={form.estimated_parts_cost ?? ""} onChange={(e) => set("estimated_parts_cost", num(e.target.value) as number | null)} /></Field>
              <Field label="Labour Cost (₹)"><Input type="number" step="0.01" value={form.estimated_labour_cost ?? ""} onChange={(e) => set("estimated_labour_cost", num(e.target.value) as number | null)} /></Field>
              <Field label="Total Estimate"><Input value={`₹${totalEstimate.toFixed(2)}`} readOnly className="font-semibold" /></Field>
              <Field label="Customer Approval">
                <Select value={form.customer_approval ? "yes" : "no"} onValueChange={(v) => set("customer_approval", v === "yes")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>

          {/* Assignment & work */}
          <Card>
            <CardHeader><CardTitle>Repair Work</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Assigned Technician">
                <Select value={form.assigned_technician_id ?? "none"} onValueChange={(v) => set("assigned_technician_id", v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Choose technician" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name} — {e.role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Assigned Date"><Input type="date" value={form.assigned_date ?? ""} onChange={(e) => set("assigned_date", e.target.value || null)} /></Field>
              <Field label="Work Done Summary" full>
                <Textarea rows={3} value={form.work_done ?? ""} onChange={(e) => set("work_done", e.target.value)} />
              </Field>
              <Field label="Parts Used" full>
                <Textarea rows={3} value={form.parts_used ?? ""} onChange={(e) => set("parts_used", e.target.value)} />
              </Field>
            </CardContent>
          </Card>

          {/* Billing */}
          <Card>
            <CardHeader><CardTitle>Billing & Delivery</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Field label="Final Labour Charge (₹)"><Input type="number" step="0.01" value={form.final_labour_charge ?? ""} onChange={(e) => set("final_labour_charge", num(e.target.value) as number | null)} /></Field>
              <Field label="Final Bill Amount (₹)"><Input type="number" step="0.01" value={form.final_bill_amount ?? ""} onChange={(e) => set("final_bill_amount", num(e.target.value) as number | null)} /></Field>
              <Field label="Delivery Date"><Input type="date" value={form.delivery_date ?? ""} onChange={(e) => set("delivery_date", e.target.value || null)} /></Field>
            </CardContent>
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Vehicle Photos</CardTitle>
              <div>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadPhotos(e.target.files)} />
                <Button variant="outline" size="lg" onClick={() => fileRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" /> Upload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {photoUrls.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                  <ImageOff className="h-8 w-8" />
                  <span>No photos yet</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {photoUrls.map((p) => (
                    <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                      <img src={p.url} alt="" className="h-full w-full cursor-pointer object-cover" onClick={() => setViewIndex(photoUrls.findIndex((x) => x.id === p.id))} />
                      <button onClick={() => deletePhoto(p)} className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                        {format(new Date(p.created_at), "d MMM yyyy")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button variant="destructive" size="lg" onClick={() => setConfirmDelete(true)} className="gap-2">
              <Trash2 className="h-4 w-4" /> Delete Job Card
            </Button>
          </div>
        </div>
      </div>

      {/* Printable view */}
      <PrintableJobCard form={form} totalEstimate={totalEstimate} techName={techName} photoUrls={photoUrls.map((p) => p.url)} />

      <Lightbox
        photos={photoUrls.map((p) => p.url)}
        index={viewIndex}
        onClose={() => setViewIndex(null)}
        onChange={setViewIndex}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job card?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. All associated photos will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMut.mutate()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function Lightbox({
  photos, index, onClose, onChange,
}: {
  photos: string[];
  index: number | null;
  onClose: () => void;
  onChange: (i: number) => void;
}) {
  const open = index !== null && index >= 0 && index < photos.length;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index! > 0) onChange(index! - 1);
      if (e.key === "ArrowRight" && index! < photos.length - 1) onChange(index! + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, photos.length, onClose, onChange]);

  if (!open) return null;
  const i = index!;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>
      {i > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange(i - 1); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          aria-label="Previous"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
      )}
      {i < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange(i + 1); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          aria-label="Next"
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      )}
      <img
        src={photos[i]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[92vw] object-contain"
      />
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
          {i + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}

function PrintableJobCard({
  form, totalEstimate, techName, photoUrls,
}: {
  form: JobCard;
  totalEstimate: number;
  techName: string;
  photoUrls: string[];
}) {
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex border-b border-gray-300 py-1 text-sm">
      <div className="w-44 shrink-0 font-semibold text-gray-700">{label}</div>
      <div className="flex-1 break-words text-gray-900">{value || <span className="text-gray-400">—</span>}</div>
    </div>
  );

  return (
    <div className="print-area hidden print:block">
      <div className="mx-auto max-w-[800px] bg-white p-8 text-black">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b-4 border-orange-500 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-orange-500 text-white">
              <Wrench className="h-8 w-8" />
            </div>
            <div>
              <div className="text-2xl font-extrabold tracking-tight">Autoscanners</div>
              <div className="text-xs uppercase tracking-widest text-gray-500">Vehicle Repair Workshop</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">JOB CARD</div>
            <div className="font-mono text-sm">{form.job_number}</div>
            <div className="text-xs text-gray-600">
              {form.job_date} · {form.job_time?.slice(0,5)}
            </div>
          </div>
        </div>

        {/* Customer / Vehicle */}
        <div className="grid grid-cols-2 gap-6">
          <section>
            <h3 className="mb-1 border-b border-orange-300 pb-1 text-sm font-bold uppercase text-orange-700">Customer</h3>
            <Row label="Name" value={form.customer_name} />
            <Row label="Phone" value={form.customer_phone} />
            <Row label="Email" value={form.customer_email} />
            <Row label="Address" value={form.customer_address} />
          </section>
          <section>
            <h3 className="mb-1 border-b border-orange-300 pb-1 text-sm font-bold uppercase text-orange-700">Vehicle</h3>
            <Row label="Registration" value={form.vehicle_reg} />
            <Row label="Brand / Model" value={`${form.vehicle_brand ?? ""} ${form.vehicle_model ?? ""}`.trim()} />
            <Row label="Year" value={form.vehicle_year} />
            <Row label="VIN / Chassis" value={form.vin} />
            <Row label="Mileage" value={form.mileage_km ? `${form.mileage_km} km` : ""} />
            <Row label="Fuel Level" value={form.fuel_level ? `${form.fuel_level} / 5` : ""} />
          </section>
        </div>

        {/* Complaint */}
        <section className="mt-4">
          <h3 className="mb-1 border-b border-orange-300 pb-1 text-sm font-bold uppercase text-orange-700">Customer Complaint</h3>
          <p className="min-h-[40px] whitespace-pre-wrap py-1 text-sm">{form.complaint || "—"}</p>
        </section>

        {/* Estimate */}
        <section className="mt-4">
          <h3 className="mb-1 border-b border-orange-300 pb-1 text-sm font-bold uppercase text-orange-700">Estimate</h3>
          <Row label="Parts Cost" value={`₹${Number(form.estimated_parts_cost ?? 0).toFixed(2)}`} />
          <Row label="Labour Cost" value={`₹${Number(form.estimated_labour_cost ?? 0).toFixed(2)}`} />
          <Row label="Total Estimate" value={<span className="font-bold">₹{totalEstimate.toFixed(2)}</span>} />
          <Row label="Customer Approval" value={form.customer_approval ? "YES" : "NO"} />
        </section>

        {/* Repair */}
        <section className="mt-4">
          <h3 className="mb-1 border-b border-orange-300 pb-1 text-sm font-bold uppercase text-orange-700">Repair Details</h3>
          <Row label="Technician" value={techName} />
          <Row label="Assigned Date" value={form.assigned_date} />
          <Row label="Work Done" value={<span className="whitespace-pre-wrap">{form.work_done}</span>} />
          <Row label="Parts Used" value={<span className="whitespace-pre-wrap">{form.parts_used}</span>} />
        </section>

        {/* Billing */}
        <section className="mt-4">
          <h3 className="mb-1 border-b border-orange-300 pb-1 text-sm font-bold uppercase text-orange-700">Billing</h3>
          <Row label="Final Labour Charge" value={`₹${Number(form.final_labour_charge ?? 0).toFixed(2)}`} />
          <Row label="Final Bill Amount" value={<span className="font-bold">₹{Number(form.final_bill_amount ?? 0).toFixed(2)}</span>} />
          <Row label="Delivery Date" value={form.delivery_date} />
          <Row label="Status" value={STATUS_LABEL[form.status]} />
        </section>

        {photoUrls.length > 0 && (
          <section className="mt-4">
            <h3 className="mb-1 border-b border-orange-300 pb-1 text-sm font-bold uppercase text-orange-700">Vehicle Photos</h3>
            <div className="grid grid-cols-3 gap-2 pt-2">
              {photoUrls.slice(0, 6).map((u) => (
                <img key={u} src={u} alt="" className="h-28 w-full rounded border object-cover" />
              ))}
            </div>
          </section>
        )}

        {/* Signatures */}
        <div className="mt-10 grid grid-cols-2 gap-12">
          <div className="border-t border-gray-500 pt-1 text-center text-xs">Customer Signature</div>
          <div className="border-t border-gray-500 pt-1 text-center text-xs">Workshop Signature</div>
        </div>

        <div className="mt-6 text-center text-[10px] text-gray-500">
          Generated by Autoscanners Workshop Manager · {format(new Date(), "d MMM yyyy, HH:mm")}
        </div>
      </div>
    </div>
  );
}
