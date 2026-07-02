import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Check, X, Eraser, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, subMonths,
  getDay, isSameDay, isAfter, startOfDay,
} from "date-fns";

type Employee = { id: string; name: string; role: string };
type Attendance = {
  id: string;
  employee_id: string;
  date: string;
  status: "present" | "absent";
  check_in: string | null;
  check_out: string | null;
  amount_taken: number | null;
};

export const Route = createFileRoute("/_authenticated/attendance")({
  component: AttendancePage,
});

// Parse "HH:MM" or "HH:MM:SS" into minutes since midnight
function timeToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  const mm = parseInt(m, 10);
  if (isNaN(hh) || isNaN(mm)) return null;
  return hh * 60 + mm;
}

function normalizeTime(t: string | null | undefined): string | null {
  if (!t) return null;
  // db stores as HH:MM:SS, input gives HH:MM — normalize to HH:MM
  return t.slice(0, 5);
}

function formatHours(checkIn: string | null, checkOut: string | null): string | null {
  const a = timeToMinutes(checkIn);
  const b = timeToMinutes(checkOut);
  if (a == null || b == null) return null;
  const diff = b - a;
  if (diff <= 0) return null;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function formatTime12(t: string | null): string | null {
  const n = normalizeTime(t);
  if (!n) return null;
  const [hStr, mStr] = n.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${ampm}`;
}

function AttendancePage() {
  const qc = useQueryClient();
  const today = new Date();
  const [month, setMonth] = useState<Date>(startOfMonth(today));
  const [employeeId, setEmployeeId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [draftStatus, setDraftStatus] = useState<"present" | "absent">("present");
  const [draftCheckIn, setDraftCheckIn] = useState<string>("");
  const [draftCheckOut, setDraftCheckOut] = useState<string>("");
  const [draftAmount, setDraftAmount] = useState<string>("");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").order("name");
      if (error) throw error;
      return data as Employee[];
    },
  });

  useEffect(() => {
    if (!employeeId && employees.length) setEmployeeId(employees[0].id);
  }, [employees, employeeId]);

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const monthKey = format(monthStart, "yyyy-MM");

  const { data: records = [] } = useQuery({
    enabled: !!employeeId,
    queryKey: ["attendance", employeeId, monthKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employeeId)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data as Attendance[];
    },
  });

  const byDate = useMemo(() => {
    const m = new Map<string, Attendance>();
    for (const r of records) m.set(r.date, r);
    return m;
  }, [records]);

  const absentCount = records.filter((r) => r.status === "absent").length;
  const presentCount = records.filter((r) => r.status === "present").length;
  const totalAdvance = records.reduce((sum, r) => sum + (Number(r.amount_taken) || 0), 0);

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingBlanks = getDay(monthStart);

  const currentRecord = selectedDate ? byDate.get(format(selectedDate, "yyyy-MM-dd")) ?? null : null;

  // Seed dialog form when opening
  useEffect(() => {
    if (!selectedDate) return;
    if (currentRecord) {
      setDraftStatus(currentRecord.status);
      setDraftCheckIn(normalizeTime(currentRecord.check_in) ?? "");
      setDraftCheckOut(normalizeTime(currentRecord.check_out) ?? "");
      setDraftAmount(currentRecord.amount_taken ? String(currentRecord.amount_taken) : "");
    } else {
      setDraftStatus("present");
      setDraftCheckIn("");
      setDraftCheckOut("");
      setDraftAmount("");
    }
  }, [selectedDate, currentRecord]);

  const upsert = useMutation({
    mutationFn: async (input: {
      date: Date;
      status: "present" | "absent";
      check_in: string | null;
      check_out: string | null;
      amount_taken: number;
    }) => {
      const dateStr = format(input.date, "yyyy-MM-dd");
      const payload = {
        employee_id: employeeId,
        date: dateStr,
        status: input.status,
        check_in: input.status === "present" ? input.check_in : null,
        check_out: input.status === "present" ? input.check_out : null,
        amount_taken: input.status === "present" ? input.amount_taken : 0,
      };
      const { error } = await supabase
        .from("attendance")
        .upsert(payload, { onConflict: "employee_id,date" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance", employeeId, monthKey] });
      setSelectedDate(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clear = useMutation({
    mutationFn: async (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("employee_id", employeeId)
        .eq("date", dateStr);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance", employeeId, monthKey] });
      setSelectedDate(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (employees.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Attendance</h1>
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Add employees first to mark attendance.
        </CardContent></Card>
      </div>
    );
  }

  const draftHours = draftStatus === "present" ? formatHours(draftCheckIn || null, draftCheckOut || null) : null;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Attendance</h1>
          <p className="text-sm text-muted-foreground">Tap a day to mark Present/Absent and log check-in & check-out times</p>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">Employee</label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id} className="py-3 text-base">
                        {e.name} <span className="text-muted-foreground">— {e.role}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <Button variant="outline" size="lg" onClick={() => setMonth(subMonths(month, 1))} aria-label="Previous month">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="min-w-[160px] text-center text-lg font-semibold">
                  {format(month, "MMMM yyyy")}
                </div>
                <Button variant="outline" size="lg" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Stat label="Absent days" value={absentCount} tone="danger" big />
              <Stat label="Present days" value={presentCount} tone="success" />
              <Stat label="Unmarked" value={days.length - records.length} tone="muted" />
              <Stat label="Days in month" value={days.length} tone="muted" />
              <Stat label="Total advance" value={`₹${totalAdvance.toLocaleString("en-IN")}`} tone="primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-muted-foreground sm:gap-2 sm:text-sm">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`b${i}`} />)}
              {days.map((d) => {
                const rec = byDate.get(format(d, "yyyy-MM-dd"));
                const isToday = isSameDay(d, today);
                const isFuture = isAfter(startOfDay(d), startOfDay(today));
                const base = "aspect-square w-full rounded-lg flex flex-col items-center justify-center text-base sm:text-lg font-semibold transition-all border-2 select-none relative";
                let cls = "border-transparent bg-muted text-foreground hover:bg-accent";
                if (rec?.status === "present") cls = "border-transparent bg-[var(--color-success)] text-[var(--color-success-foreground)] hover:opacity-90";
                if (rec?.status === "absent") cls = "border-transparent bg-[var(--color-danger)] text-[var(--color-danger-foreground)] hover:opacity-90";
                if (isToday) cls += " ring-2 ring-primary ring-offset-2 ring-offset-background";
                if (isFuture) cls += " opacity-50";

                const hasTimes = rec?.status === "present" && (rec.check_in || rec.check_out);
                const hours = rec?.status === "present" ? formatHours(rec.check_in, rec.check_out) : null;

                const dayBtn = (
                  <button
                    onClick={() => !isFuture && setSelectedDate(d)}
                    disabled={isFuture}
                    className={`${base} ${cls}`}
                    aria-label={format(d, "EEEE, MMMM d")}
                  >
                    <span>{format(d, "d")}</span>
                    {hasTimes && (
                      <Clock className="absolute bottom-1 right-1 h-3 w-3 opacity-80" aria-hidden />
                    )}
                  </button>
                );

                if (rec?.status === "present" && (rec.check_in || rec.check_out)) {
                  return (
                    <Tooltip key={d.toISOString()}>
                      <TooltipTrigger asChild>{dayBtn}</TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <div className="font-semibold">{format(d, "MMM d")}</div>
                        <div>In: {formatTime12(rec.check_in) ?? "—"}</div>
                        <div>Out: {formatTime12(rec.check_out) ?? "—"}</div>
                        {hours && <div>Total: {hours}</div>}
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return <div key={d.toISOString()}>{dayBtn}</div>;
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <LegendDot color="success" label="Present" />
              <LegendDot color="danger" label="Absent" />
              <LegendDot color="muted" label="Unmarked" />
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> times logged
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!selectedDate} onOpenChange={(o) => !o && setSelectedDate(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  size="lg"
                  className={`h-14 gap-2 ${draftStatus === "present"
                    ? "bg-[var(--color-success)] text-[var(--color-success-foreground)] hover:opacity-90"
                    : "bg-muted text-foreground hover:bg-accent"}`}
                  onClick={() => setDraftStatus("present")}
                  type="button"
                >
                  <Check className="h-5 w-5" /> Present
                </Button>
                <Button
                  size="lg"
                  className={`h-14 gap-2 ${draftStatus === "absent"
                    ? "bg-[var(--color-danger)] text-[var(--color-danger-foreground)] hover:opacity-90"
                    : "bg-muted text-foreground hover:bg-accent"}`}
                  onClick={() => setDraftStatus("absent")}
                  type="button"
                >
                  <X className="h-5 w-5" /> Absent
                </Button>
              </div>

              <div
                className={`space-y-3 rounded-lg border p-3 transition-opacity ${
                  draftStatus === "absent" ? "pointer-events-none opacity-50" : ""
                }`}
                aria-disabled={draftStatus === "absent"}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="check-in" className="text-sm font-medium">Check-in</Label>
                    <Input
                      id="check-in"
                      type="time"
                      value={draftCheckIn}
                      onChange={(e) => setDraftCheckIn(e.target.value)}
                      disabled={draftStatus === "absent"}
                      className="mt-1 h-12 text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="check-out" className="text-sm font-medium">Check-out</Label>
                    <Input
                      id="check-out"
                      type="time"
                      value={draftCheckOut}
                      onChange={(e) => setDraftCheckOut(e.target.value)}
                      disabled={draftStatus === "absent"}
                      className="mt-1 h-12 text-base"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total hours worked</span>
                  <span className="font-semibold text-foreground">
                    {draftHours ?? "—"}
                  </span>
                </div>
              </div>

              {currentRecord && (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full gap-2"
                  onClick={() => selectedDate && clear.mutate(selectedDate)}
                  disabled={clear.isPending}
                >
                  <Eraser className="h-4 w-4" /> Clear mark
                </Button>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="ghost" size="lg" onClick={() => setSelectedDate(null)}>Cancel</Button>
              <Button
                size="lg"
                onClick={() =>
                  selectedDate &&
                  upsert.mutate({
                    date: selectedDate,
                    status: draftStatus,
                    check_in: draftCheckIn || null,
                    check_out: draftCheckOut || null,
                  })
                }
                disabled={upsert.isPending}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

function Stat({ label, value, tone, big }: { label: string; value: number | string; tone: "success" | "danger" | "muted" | "primary"; big?: boolean }) {
  const toneCls =
    tone === "success" ? "text-[var(--color-success)]" :
    tone === "danger" ? "text-[var(--color-danger)]" :
    tone === "primary" ? "text-[var(--color-primary)]" :
    "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-3 sm:p-4">
      <div className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</div>
      <div className={`mt-1 font-bold ${toneCls} ${big ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"}`}>{value}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: "success" | "danger" | "muted"; label: string }) {
  const bg =
    color === "success" ? "bg-[var(--color-success)]" :
    color === "danger" ? "bg-[var(--color-danger)]" :
    "bg-muted";
  return (
    <div className="flex items-center gap-2">
      <span className={`h-4 w-4 rounded ${bg}`} />
      <span className="text-foreground">{label}</span>
    </div>
  );
}
