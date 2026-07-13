import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Save, Printer, Download, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import carDiagramAsset from "@/assets/car-diagram.jpeg.asset.json";
import { JOB_STATUSES, STATUS_LABEL, type JobStatus } from "./job-cards.index";

type LineItem = { desc: string; amount: number };

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
  engine_no: string | null;
  chassis_no: string | null;
  mileage_km: number | null;
  fuel_level: number | null;
  fuel_qty: string | null;
  delivery_promised: string | null;
  complaint: string | null;
  primary_jobs: string | null;
  secondary_jobs: string | null;
  additional_jobs: string | null;
  technical_advice: string | null;
  body_damage_notes: string | null;
  checklist: Record<string, "yes" | "no">;
  spares: LineItem[];
  labour_items: LineItem[];
  estimated_parts_cost: number | null;
  estimated_labour_cost: number | null;
  advance_amount: number | null;
  actual_cost: number | null;
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

export const Route = createFileRoute("/_authenticated/job-cards/$jobId")({
  component: JobCardDetailPage,
});

const CHECKLIST_ITEMS = [
  "Service Pack", "Tool Kit", "Spare Wheel", "Jack & Handle", "Maths",
  "Mud Flaps", "Stereo", "Wheel Caps", "Cigarette Lighter", "Show Piece",
  "Perfume", "Speaker F/R", "Side View Mirror", "Side Bedding", "Safety Guard",
] as const;




function JobCardDetailPage() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<JobCard | null>(null);

  const { data: card, isLoading } = useQuery({
    queryKey: ["job_card", jobId],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_cards").select("*").eq("id", jobId).single();
      if (error) throw error;
      const c = data as unknown as JobCard;
      return {
        ...c,
        checklist: (c.checklist ?? {}) as Record<string, "yes" | "no">,
        spares: Array.isArray(c.spares) ? c.spares : [],
        labour_items: Array.isArray(c.labour_items) ? c.labour_items : [],
      } as JobCard;
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

  if (isLoading || !form) return <p className="py-10 text-center text-muted-foreground">Loading...</p>;

  const set = <K extends keyof JobCard>(k: K, v: JobCard[K]) => setForm({ ...form, [k]: v });
  const num = (v: string) => (v === "" ? null : Number(v));

  const sparesTotal = form.spares.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const labourTotal = form.labour_items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const estimatedTotal = sparesTotal + labourTotal;

  const setChecklist = (item: string, v: "yes" | "no") =>
    set("checklist", { ...form.checklist, [item]: v });

  const updateSpare = (i: number, patch: Partial<LineItem>) => {
    const next = form.spares.map((row, idx) => idx === i ? { ...row, ...patch } : row);
    set("spares", next);
  };
  const updateLabour = (i: number, patch: Partial<LineItem>) => {
    const next = form.labour_items.map((row, idx) => idx === i ? { ...row, ...patch } : row);
    set("labour_items", next);
  };

  const onSave = () => {
    const patch: Partial<JobCard> = { ...form };
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
          <Card>
            <CardHeader><CardTitle>Repair Order Header</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Field label="Sr. No / Job Card #"><Input value={form.job_number} readOnly className="font-mono" /></Field>
              <Field label="Date"><Input type="date" value={form.job_date} onChange={(e) => set("job_date", e.target.value)} /></Field>
              <Field label="Time"><Input type="time" value={form.job_time?.slice(0,5) ?? ""} onChange={(e) => set("job_time", e.target.value)} /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Vehicle</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Registration No."><Input value={form.vehicle_reg} onChange={(e) => set("vehicle_reg", e.target.value.toUpperCase())} /></Field>
              <Field label="Engine No."><Input value={form.engine_no ?? ""} onChange={(e) => set("engine_no", e.target.value)} /></Field>
              <Field label="Chassis No."><Input value={form.chassis_no ?? ""} onChange={(e) => set("chassis_no", e.target.value)} /></Field>
              <Field label="Mileage"><Input type="number" value={form.mileage_km ?? ""} onChange={(e) => set("mileage_km", num(e.target.value) as number | null)} /></Field>
              <Field label="Delivery Promised"><Input value={form.delivery_promised ?? ""} onChange={(e) => set("delivery_promised", e.target.value)} placeholder="e.g. 5 PM tomorrow" /></Field>
              <Field label="Brand"><Input value={form.vehicle_brand ?? ""} onChange={(e) => set("vehicle_brand", e.target.value)} /></Field>
              <Field label="Model / V. Name"><Input value={form.vehicle_model ?? ""} onChange={(e) => set("vehicle_model", e.target.value)} /></Field>
              <Field label="Year"><Input type="number" value={form.vehicle_year ?? ""} onChange={(e) => set("vehicle_year", num(e.target.value) as number | null)} /></Field>
              <Field label="Fuel Qty (E / H / F)">
                <Select value={form.fuel_qty ?? "H"} onValueChange={(v) => set("fuel_qty", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="E">E (Empty)</SelectItem>
                    <SelectItem value="H">H (Half)</SelectItem>
                    <SelectItem value="F">F (Full)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Owner</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Vehicle Owner"><Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} /></Field>
              <Field label="Mob."><Input value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} /></Field>
              <Field label="Address"><Input value={form.customer_address ?? ""} onChange={(e) => set("customer_address", e.target.value)} /></Field>
              <Field label="Email"><Input value={form.customer_email ?? ""} onChange={(e) => set("customer_email", e.target.value)} /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Jobs</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Primary Jobs" full><Textarea rows={5} value={form.primary_jobs ?? ""} onChange={(e) => set("primary_jobs", e.target.value)} /></Field>
              <Field label="Secondary Jobs" full><Textarea rows={5} value={form.secondary_jobs ?? ""} onChange={(e) => set("secondary_jobs", e.target.value)} /></Field>
              <Field label="Additional Jobs" full><Textarea rows={5} value={form.additional_jobs ?? ""} onChange={(e) => set("additional_jobs", e.target.value)} /></Field>
              <Field label="Technical Advice" full><Textarea rows={5} value={form.technical_advice ?? ""} onChange={(e) => set("technical_advice", e.target.value)} /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Cost</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Field label="Estimated Cost (₹)"><Input value={estimatedTotal.toFixed(2)} readOnly className="font-semibold" /></Field>
              <Field label="Advance 80% (₹)"><Input type="number" step="0.01" value={form.advance_amount ?? ""} onChange={(e) => set("advance_amount", num(e.target.value) as number | null)} /></Field>
              <Field label="Actual Cost (₹)"><Input type="number" step="0.01" value={form.actual_cost ?? ""} onChange={(e) => set("actual_cost", num(e.target.value) as number | null)} /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Spares</CardTitle>
              <Button variant="outline" size="sm" onClick={() => set("spares", [...form.spares, { desc: "", amount: 0 }])} className="gap-1"><Plus className="h-4 w-4" /> Add row</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {form.spares.length === 0 && <p className="text-sm text-muted-foreground">No spares yet.</p>}
                {form.spares.map((r, i) => (
                  <div key={i} className="grid grid-cols-[1fr_140px_auto] gap-2">
                    <Input value={r.desc} placeholder="Description" onChange={(e) => updateSpare(i, { desc: e.target.value })} />
                    <Input type="number" step="0.01" value={r.amount || ""} placeholder="Amount" onChange={(e) => updateSpare(i, { amount: Number(e.target.value) || 0 })} />
                    <Button variant="ghost" size="icon" onClick={() => set("spares", form.spares.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <div className="flex justify-end pt-2 text-sm font-semibold">Total: ₹{sparesTotal.toFixed(2)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Labour</CardTitle>
              <Button variant="outline" size="sm" onClick={() => set("labour_items", [...form.labour_items, { desc: "", amount: 0 }])} className="gap-1"><Plus className="h-4 w-4" /> Add row</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {form.labour_items.length === 0 && <p className="text-sm text-muted-foreground">No labour items yet.</p>}
                {form.labour_items.map((r, i) => (
                  <div key={i} className="grid grid-cols-[1fr_140px_auto] gap-2">
                    <Input value={r.desc} placeholder="Description" onChange={(e) => updateLabour(i, { desc: e.target.value })} />
                    <Input type="number" step="0.01" value={r.amount || ""} placeholder="Amount" onChange={(e) => updateLabour(i, { amount: Number(e.target.value) || 0 })} />
                    <Button variant="ghost" size="icon" onClick={() => set("labour_items", form.labour_items.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <div className="flex justify-end pt-2 text-sm font-semibold">Total: ₹{labourTotal.toFixed(2)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Body / Paint Damages</CardTitle></CardHeader>
            <CardContent>
              <Textarea rows={3} value={form.body_damage_notes ?? ""} onChange={(e) => set("body_damage_notes", e.target.value)} placeholder="C-Crack, D-Dent, S-Scratch — note damages here" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Inventory Checklist</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {CHECKLIST_ITEMS.map((item) => {
                  const v = form.checklist[item] ?? "no";
                  return (
                    <div key={item} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span className="text-sm">{item}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setChecklist(item, "yes")}
                          className={`h-8 w-12 rounded border text-xs font-semibold ${v === "yes" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
                        >YES</button>
                        <button
                          type="button"
                          onClick={() => setChecklist(item, "no")}
                          className={`h-8 w-12 rounded border text-xs font-semibold ${v === "no" ? "bg-foreground text-background border-foreground" : "hover:bg-accent"}`}
                        >NO</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Assignment</CardTitle></CardHeader>
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
              <Field label="Delivery Date"><Input type="date" value={form.delivery_date ?? ""} onChange={(e) => set("delivery_date", e.target.value || null)} /></Field>
            </CardContent>
          </Card>


          <div className="flex justify-end">
            <Button variant="destructive" size="lg" onClick={() => setConfirmDelete(true)} className="gap-2">
              <Trash2 className="h-4 w-4" /> Delete Job Card
            </Button>
          </div>
        </div>
      </div>

      <PrintableJobCard
        form={form}
        estimatedTotal={estimatedTotal}
        sparesTotal={sparesTotal}
        labourTotal={labourTotal}
        techName={techName}
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
    <div className={`space-y-1.5 ${full ? "sm:col-span-2 lg:col-span-4" : ""}`}>
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}


/* ============================================================
   PRINTABLE JOB CARD — faithful recreation of the paper form
   ============================================================ */

function PrintableJobCard({
  form, estimatedTotal, sparesTotal, labourTotal, techName,
}: {
  form: JobCard;
  estimatedTotal: number;
  sparesTotal: number;
  labourTotal: number;
  techName: string;
}) {
  // pad spares / labour rows to a fixed count so the grid looks like the paper form
  const SPARES_ROWS = 10;
  const LABOUR_ROWS = 5;
  const spares = [...form.spares, ...Array(Math.max(0, SPARES_ROWS - form.spares.length)).fill({ desc: "", amount: 0 })].slice(0, SPARES_ROWS);
  const labour = [...form.labour_items, ...Array(Math.max(0, LABOUR_ROWS - form.labour_items.length)).fill({ desc: "", amount: 0 })].slice(0, LABOUR_ROWS);
  const dateStr = form.job_date ? format(new Date(form.job_date), "dd/MM/yy") : "";
  const timeStr = form.job_time?.slice(0, 5) ?? "";

  return (
    <div className="print-jc hidden print:block">
      <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        @media print {
          html, body { background: white !important; }
          .print-jc { color: black; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; }
          .print-jc * { box-sizing: border-box; }
        }
        .jc-box { border: 2px solid #000; }
        .jc-cell { border: 1px solid #000; padding: 2px 4px; }
        .jc-title { font-weight: 700; text-transform: uppercase; font-size: 9pt; letter-spacing: 0.02em; }
        .jc-h { font-weight: 700; }
        .jc-line { min-height: 16px; }
        .jc-underline { border-bottom: 1px solid #000; min-height: 12px; padding: 0 2px; }
        .jc-check-yes, .jc-check-no { display: inline-block; width: 16px; text-align: center; font-weight: 700; }
        .jc-marked { background: #000; color: #fff; }
      `}</style>

      <div className="jc-box" style={{ width: "194mm" }}>
        {/* Top strip: REPAIR ORDER / JOB CARD  +  Sr. No */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 40mm", borderBottom: "2px solid #000" }}>
          <div className="jc-cell" style={{ textAlign: "center", fontWeight: 700, textDecoration: "underline", fontSize: "11pt", padding: "3px" }}>
            REPAIR ORDER / JOB CARD
          </div>
          <div className="jc-cell" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span className="jc-h">Sr. No</span>
            <span style={{ flex: 1, borderBottom: "1px solid #000", textAlign: "center" }}>{form.job_number.replace(/^JC-0*/, "")}</span>
          </div>
        </div>




        {/* Workshop banner + Time/Date */}
        <div style={{ display: "grid", gridTemplateColumns: "60mm 1fr 40mm", borderTop: "2px solid #000" }}>
          <div className="jc-cell" style={{ padding: "3px 6px" }}>
            <div style={{ fontSize: "15pt", fontWeight: 800, fontStyle: "italic", lineHeight: 1 }}>Auto Scanners</div>
            <div style={{ fontSize: "7pt", marginTop: 2, fontWeight: 600 }}>ISO : 9001 Paint Booth &amp;</div>
            <div style={{ fontSize: "7pt", fontWeight: 600 }}>Computerized Auto Workshop</div>
          </div>
          <div className="jc-cell" style={{ textAlign: "center", padding: "4px 4px", fontWeight: 700, fontSize: "9pt", lineHeight: 1.25 }}>
            NEAR BENIGANJ RAILWAY CROSSING,<br />
            DEOKALI MANDIR ROAD<br />
            FAIZABAD (U.P.) MOB. : 9795225926
          </div>
          <div style={{ display: "grid", gridTemplateRows: "1fr 1fr" }}>
            <div className="jc-cell" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span className="jc-h">TIME :</span>
              <span style={{ flex: 1, textAlign: "center" }}>{timeStr}</span>
            </div>
            <div className="jc-cell" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span className="jc-h">DATE</span>
              <span style={{ flex: 1, textAlign: "center" }}>{dateStr}</span>
            </div>
          </div>
        </div>

        {/* Registration / Engine / Chassis / Mileage / Delivery Promised */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", borderTop: "1px solid #000" }}>
          {[
            { l: "Registration No.", v: form.vehicle_reg },
            { l: "Engine No.", v: form.engine_no },
            { l: "Chassis No.", v: form.chassis_no },
            { l: "Mileage", v: form.mileage_km ? String(form.mileage_km) : "" },
            { l: "Delivery Promised", v: form.delivery_promised },
          ].map((c) => (
            <div key={c.l} className="jc-cell">
              <div className="jc-h" style={{ fontSize: "8pt" }}>{c.l}</div>
              <div className="jc-line">{c.v || ""}</div>
            </div>
          ))}
        </div>

        {/* Owner / Address / V. Name / Mob */}
        <div style={{ display: "grid", gridTemplateColumns: "60mm 1fr 40mm" }}>
          <div className="jc-cell">
            <div className="jc-h">Vehicle Owner</div>
            <div className="jc-line">{form.customer_name}</div>
          </div>
          <div className="jc-cell">
            <div className="jc-h">Address :</div>
            <div className="jc-line">{form.customer_address ?? ""}</div>
          </div>
          <div style={{ display: "grid", gridTemplateRows: "1fr 1fr" }}>
            <div className="jc-cell">
              <div className="jc-h">V. Name</div>
              <div className="jc-line">{[form.vehicle_brand, form.vehicle_model].filter(Boolean).join(" ")}</div>
            </div>
            <div className="jc-cell">
              <div className="jc-h">Mob.</div>
              <div className="jc-line">{form.customer_phone}</div>
            </div>
          </div>
        </div>

        {/* Jobs 4-column table */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: "1px solid #000" }}>
          {[
            { l: "PRIMARY JOBS", v: form.primary_jobs },
            { l: "SECONDARY JOBS", v: form.secondary_jobs },
            { l: "ADDITIONAL JOBS", v: form.additional_jobs },
            { l: "TECHNICAL ADVICE", v: form.technical_advice },
          ].map((c) => (
            <div key={c.l} className="jc-cell" style={{ minHeight: "36mm", padding: 0 }}>
              <div className="jc-title" style={{ textAlign: "center", borderBottom: "1px solid #000", padding: "3px" }}>{c.l}</div>
              <div style={{ padding: "3px 4px", whiteSpace: "pre-wrap", fontSize: "9pt", lineHeight: "16px", backgroundImage: "repeating-linear-gradient(transparent, transparent 15px, #000 15px, #000 16px)", minHeight: "32mm" }}>
                {c.v || ""}
              </div>
            </div>
          ))}
        </div>

        {/* Estimated / Advance / Actual */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid #000" }}>
          <div className="jc-cell">
            <div className="jc-h">ESTIMATED COST</div>
            <div className="jc-line">₹{estimatedTotal.toFixed(2)}</div>
          </div>
          <div className="jc-cell">
            <div className="jc-h">ADVANCE 80%</div>
            <div className="jc-line">₹{Number(form.advance_amount ?? 0).toFixed(2)}</div>
          </div>
          <div className="jc-cell">
            <div className="jc-h">ACTUAL COST</div>
            <div className="jc-line">₹{Number(form.actual_cost ?? 0).toFixed(2)}</div>
          </div>
        </div>

        {/* Payment terms banner */}
        <div className="jc-cell" style={{ textAlign: "center", fontWeight: 700, padding: "3px", borderTop: "1px solid #000" }}>
          <span style={{ textDecoration: "underline", marginRight: 6 }}>PAYMENT TERMS</span>
          ONLY CASH / DEMAND DRAFT / PAY ORDER
        </div>

        {/* Middle grid: Spares/Labour  |  Body diagram  |  Checklist */}
        <div style={{ display: "grid", gridTemplateColumns: "70mm 55mm 1fr", borderTop: "1px solid #000" }}>
          {/* LEFT: Spares + Labour */}
          <div style={{ borderRight: "1px solid #000" }}>
            <div className="jc-title" style={{ textAlign: "center", padding: "3px", borderBottom: "1px solid #000" }}>SPARES</div>
            {spares.map((r, i) => (
              <div key={`s${i}`} style={{ display: "grid", gridTemplateColumns: "1fr 20mm", borderBottom: "1px solid #000", minHeight: "22px" }}>
                <div className="jc-cell" style={{ borderLeft: "none", borderRight: "1px solid #000", borderTop: "none", borderBottom: "none", padding: "1px 3px" }}>{r.desc}</div>
                <div className="jc-cell" style={{ border: "none", padding: "1px 3px", textAlign: "right" }}>{r.amount ? Number(r.amount).toFixed(0) : ""}</div>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 20mm", borderBottom: "1px solid #000", background: "#eee" }}>
              <div className="jc-cell" style={{ border: "none", borderRight: "1px solid #000", fontWeight: 700 }}>TOTAL</div>
              <div className="jc-cell" style={{ border: "none", textAlign: "right", fontWeight: 700 }}>{sparesTotal.toFixed(0)}</div>
            </div>

            <div className="jc-title" style={{ textAlign: "center", padding: "3px", borderBottom: "1px solid #000", borderTop: "1px solid #000" }}>LABOUR</div>
            {labour.map((r, i) => (
              <div key={`l${i}`} style={{ display: "grid", gridTemplateColumns: "1fr 20mm", borderBottom: "1px solid #000", minHeight: "16px" }}>
                <div className="jc-cell" style={{ border: "none", borderRight: "1px solid #000", padding: "1px 3px" }}>{r.desc}</div>
                <div className="jc-cell" style={{ border: "none", padding: "1px 3px", textAlign: "right" }}>{r.amount ? Number(r.amount).toFixed(0) : ""}</div>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 20mm", background: "#eee" }}>
              <div className="jc-cell" style={{ border: "none", borderRight: "1px solid #000", fontWeight: 700 }}>TOTAL</div>
              <div className="jc-cell" style={{ border: "none", textAlign: "right", fontWeight: 700 }}>{labourTotal.toFixed(0)}</div>
            </div>
          </div>

          {/* CENTER: Fuel + Body diagram */}
          <div style={{ borderRight: "1px solid #000", display: "flex", flexDirection: "column" }}>
            {/* Fuel gauge */}
            <div className="jc-cell" style={{ border: "none", borderBottom: "1px solid #000", textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span className={form.fuel_qty === "E" ? "jc-marked" : ""} style={{ padding: "0 4px" }}>E</span>
                <span style={{ borderTop: "2px solid #000", flex: 1, minWidth: 30 }} />
                <span className={form.fuel_qty === "H" ? "jc-marked" : ""} style={{ padding: "0 4px", fontWeight: 700 }}>H</span>
                <span style={{ borderTop: "2px solid #000", flex: 1, minWidth: 30 }} />
                <span className={form.fuel_qty === "F" ? "jc-marked" : ""} style={{ padding: "0 4px" }}>F</span>
              </div>
              <div className="jc-h" style={{ fontSize: "8pt", marginTop: 2 }}>Fuel Qty.</div>
            </div>
            <div style={{ padding: "4px", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between" }}>
              <div className="jc-h" style={{ alignSelf: "flex-start", fontSize: "9pt" }}>Body / Paint damages</div>
              <CarDiagram />
              <div style={{ textAlign: "center", fontSize: "8pt", fontWeight: 700, lineHeight: 1.3 }}>
                C-CRACK, D-DENT<br />S-SCRATION
              </div>
              {form.body_damage_notes && (
                <div style={{ fontSize: "8pt", padding: "2px 4px", width: "100%", borderTop: "1px dashed #000", whiteSpace: "pre-wrap" }}>
                  {form.body_damage_notes}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: YES/NO checklist */}
          <div>
            {CHECKLIST_ITEMS.map((item) => {
              const v = form.checklist[item] ?? "no";
              return (
                <div key={item} style={{ display: "grid", gridTemplateColumns: "1fr 12mm 12mm", borderBottom: "1px solid #000", minHeight: "17px" }}>
                  <div className="jc-cell" style={{ border: "none", borderRight: "1px solid #000", fontWeight: 700, fontSize: "8.5pt", padding: "1px 4px", textTransform: "uppercase" }}>{item}</div>
                  <div className={`jc-cell ${v === "yes" ? "jc-marked" : ""}`} style={{ border: "none", borderRight: "1px solid #000", textAlign: "center", fontWeight: 700, padding: "1px" }}>YES</div>
                  <div className={`jc-cell ${v === "no" ? "jc-marked" : ""}`} style={{ border: "none", textAlign: "center", fontWeight: 700, padding: "1px" }}>NO</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Authorisation */}
        <div className="jc-cell" style={{ borderTop: "2px solid #000", padding: "3px 6px" }}>
          <div style={{ textAlign: "center", fontWeight: 700, textDecoration: "underline", marginBottom: 2, fontSize: "8pt" }}>AUTHORISATION</div>
          <p style={{ margin: 0, fontSize: "7.5pt", textAlign: "center", lineHeight: 1.25 }}>
            I, thereby, authorize for the above repairs and jobs to be carried out using necessary spares and accessories.
            I, further hereby, agree to abide by the terms and conditions as explained to me by the in-charge workshop.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: 3, fontSize: "7.5pt" }}>
            <div>Date : {dateStr}</div>
            <div style={{ textAlign: "right", fontStyle: "italic" }}>Customer's Signature</div>
          </div>
          <p style={{ margin: "3px 0 0", fontSize: "7.5pt", textAlign: "center", lineHeight: 1.25 }}>
            I, hereby, certify that the repairs ordered by me have been carried out to my entire satisfaction.
            My vehicle is now running to the best of my satisfaction.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: 3, fontSize: "7.5pt" }}>
            <div>Date :</div>
            <div style={{ textAlign: "right", fontStyle: "italic" }}>Customer's Signature</div>
          </div>
          {techName && <div style={{ marginTop: 2, fontSize: "7.5pt" }}>Technician: {techName}</div>}
        </div>
      </div>
    </div>
  );
}

function CarDiagram() {
  return (
    <img
      src={carDiagramAsset.url}
      alt="Car body diagram"
      style={{ display: "block", width: "100%", maxWidth: "50mm", height: "auto", objectFit: "contain" }}
    />
  );
}
