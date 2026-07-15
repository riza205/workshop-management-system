import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, FileText, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { JOB_STATUSES, JOB_STATUS_CLASS, JOB_STATUS_LABEL, type JobStatus } from "@/lib/workshop-status";

type JobCardRow = {
  id: string;
  job_number: string;
  customer_name: string;
  vehicle_reg: string;
  vehicle_model: string | null;
  status: JobStatus;
  assigned_technician_id: string | null;
  estimated_parts_cost: number | null;
  estimated_labour_cost: number | null;
  final_bill_amount: number | null;
};

type Employee = { id: string; name: string };

export const Route = createFileRoute("/_authenticated/job-cards/")({
  component: JobCardsPage,
});

function JobCardsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | JobStatus>("all");
  const [techFilter, setTechFilter] = useState<"all" | string>("all");

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["job_cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_cards")
        .select("id,job_number,customer_name,vehicle_reg,vehicle_model,status,assigned_technician_id,estimated_parts_cost,estimated_labour_cost,final_bill_amount")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as JobCardRow[];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", "min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("id,name").order("name");
      if (error) throw error;
      return data as Employee[];
    },
  });
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e.name])), [employees]);

  const createMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("job_cards")
        .insert({ customer_name: "New Customer", customer_phone: "", vehicle_reg: "" })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["job_cards"] });
      navigate({ to: "/job-cards/$jobId", params: { jobId: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = cards.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (techFilter !== "all" && c.assigned_technician_id !== techFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${c.job_number} ${c.customer_name} ${c.vehicle_reg} ${c.vehicle_model ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Job Cards</h1>
          <p className="text-sm text-muted-foreground">All workshop job cards</p>
        </div>
        <Button
          size="lg"
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending}
          className="h-12 gap-2 text-base"
        >
          <Plus className="h-5 w-5" /> New Job Card
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search job #, customer, reg, model"
              className="h-12 pl-9 text-base"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | JobStatus)}>
            <SelectTrigger className="h-12 min-w-[170px] text-base"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {JOB_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{JOB_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={techFilter} onValueChange={setTechFilter}>
            <SelectTrigger className="h-12 min-w-[170px] text-base"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All technicians</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="py-10 text-center text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No job cards match your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => {
            const est = (Number(c.estimated_parts_cost) || 0) + (Number(c.estimated_labour_cost) || 0);
            return (
              <Link
                key={c.id}
                to="/job-cards/$jobId"
                params={{ jobId: c.id }}
                className="block"
              >
                <Card className="transition hover:border-primary/50 hover:shadow-md">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-primary">{c.job_number}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${JOB_STATUS_CLASS[c.status]}`}>
                          {JOB_STATUS_LABEL[c.status]}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-base font-semibold">{c.customer_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {c.vehicle_reg}{c.vehicle_model ? ` · ${c.vehicle_model}` : ""}
                        {c.assigned_technician_id ? ` · ${empMap.get(c.assigned_technician_id) ?? "—"}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Estimate</div>
                      <div className="font-semibold">₹{est.toFixed(2)}</div>
                      {Number(c.final_bill_amount) > 0 && (
                        <div className="text-xs text-emerald-700 dark:text-emerald-300">
                          Final ₹{Number(c.final_bill_amount).toFixed(2)}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
