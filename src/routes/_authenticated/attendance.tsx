import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Check, X, Eraser } from "lucide-react";
import { toast } from "sonner";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, subMonths,
  getDay, isSameDay, isAfter, startOfDay,
} from "date-fns";

type Employee = { id: string; name: string; role: string };
type Attendance = { id: string; employee_id: string; date: string; status: "present" | "absent" };

export const Route = createFileRoute("/_authenticated/attendance")({
  component: AttendancePage,
});

function AttendancePage() {
  const qc = useQueryClient();
  const today = new Date();
  const [month, setMonth] = useState<Date>(startOfMonth(today));
  const [employeeId, setEmployeeId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingBlanks = getDay(monthStart); // 0..6 (Sun..Sat)

  const upsert = useMutation({
    mutationFn: async ({ date, status }: { date: Date; status: "present" | "absent" }) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const { error } = await supabase
        .from("attendance")
        .upsert(
          { employee_id: employeeId, date: dateStr, status },
          { onConflict: "employee_id,date" },
        );
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

  const currentRecord = selectedDate ? byDate.get(format(selectedDate, "yyyy-MM-dd")) : null;

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Attendance</h1>
        <p className="text-sm text-muted-foreground">Tap a day to mark Present or Absent</p>
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

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Absent days" value={absentCount} tone="danger" big />
            <Stat label="Present days" value={presentCount} tone="success" />
            <Stat label="Unmarked" value={days.length - records.length} tone="muted" />
            <Stat label="Days in month" value={days.length} tone="muted" />
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
              const base = "aspect-square rounded-lg flex flex-col items-center justify-center text-base sm:text-lg font-semibold transition-all border-2 select-none";
              let cls = "border-transparent bg-muted text-foreground hover:bg-accent";
              if (rec?.status === "present") cls = "border-transparent bg-[var(--color-success)] text-[var(--color-success-foreground)] hover:opacity-90";
              if (rec?.status === "absent") cls = "border-transparent bg-[var(--color-danger)] text-[var(--color-danger-foreground)] hover:opacity-90";
              if (isToday) cls += " ring-2 ring-primary ring-offset-2 ring-offset-background";
              if (isFuture) cls += " opacity-50";
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => !isFuture && setSelectedDate(d)}
                  disabled={isFuture}
                  className={`${base} ${cls}`}
                  aria-label={format(d, "EEEE, MMMM d")}
                >
                  <span>{format(d, "d")}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <LegendDot color="success" label="Present" />
            <LegendDot color="danger" label="Absent" />
            <LegendDot color="muted" label="Unmarked" />
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
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              Currently: <span className="font-semibold capitalize text-foreground">{currentRecord?.status ?? "unmarked"}</span>
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                size="lg"
                className="h-14 gap-2 bg-[var(--color-success)] text-[var(--color-success-foreground)] hover:opacity-90"
                onClick={() => selectedDate && upsert.mutate({ date: selectedDate, status: "present" })}
                disabled={upsert.isPending}
              >
                <Check className="h-5 w-5" /> Present
              </Button>
              <Button
                size="lg"
                className="h-14 gap-2 bg-[var(--color-danger)] text-[var(--color-danger-foreground)] hover:opacity-90"
                onClick={() => selectedDate && upsert.mutate({ date: selectedDate, status: "absent" })}
                disabled={upsert.isPending}
              >
                <X className="h-5 w-5" /> Absent
              </Button>
            </div>
            {currentRecord && (
              <Button
                variant="outline"
                size="lg"
                className="mt-2 w-full gap-2"
                onClick={() => selectedDate && clear.mutate(selectedDate)}
                disabled={clear.isPending}
              >
                <Eraser className="h-4 w-4" /> Clear mark
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="lg" onClick={() => setSelectedDate(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, tone, big }: { label: string; value: number; tone: "success" | "danger" | "muted"; big?: boolean }) {
  const toneCls =
    tone === "success" ? "text-[var(--color-success)]" :
    tone === "danger" ? "text-[var(--color-danger)]" :
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
