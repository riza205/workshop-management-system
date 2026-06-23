import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car as CarIcon, Wrench, CheckCircle2, Truck, UserCheck, UserX, AlertTriangle } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

type CarStatus = "in_progress" | "ready" | "delivered";
type OverdueTask = {
  id: string;
  description: string;
  created_at: string;
  car_id: string;
  cars: { id: string; make_model: string; license_plate: string } | null;
  assigned_employee_id: string | null;
  employees: { name: string } | null;
};

function DashboardPage() {
  const today = format(new Date(), "yyyy-MM-dd");

  const carsQ = useQuery({
    queryKey: ["dashboard", "cars-status"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cars").select("status");
      if (error) throw error;
      return data as { status: CarStatus }[];
    },
  });

  const empCountQ = useQuery({
    queryKey: ["dashboard", "employees-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("employees")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const todayAttQ = useQuery({
    queryKey: ["dashboard", "attendance", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("status")
        .eq("date", today);
      if (error) throw error;
      return data as { status: string }[];
    },
  });

  const overdueQ = useQuery({
    queryKey: ["dashboard", "overdue-tasks"],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 3);
      const { data, error } = await supabase
        .from("car_tasks")
        .select("id, description, created_at, car_id, assigned_employee_id, cars(id, make_model, license_plate), employees(name)")
        .eq("done", false)
        .lt("created_at", cutoff.toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as OverdueTask[];
    },
    refetchInterval: 30000,
  });

  const cars = carsQ.data ?? [];
  const inProgress = cars.filter((c) => c.status === "in_progress").length;
  const ready = cars.filter((c) => c.status === "ready").length;
  const delivered = cars.filter((c) => c.status === "delivered").length;

  const present = (todayAttQ.data ?? []).filter((a) => a.status === "present").length;
  const absent = (todayAttQ.data ?? []).filter((a) => a.status === "absent").length;
  const totalEmp = empCountQ.data ?? 0;
  const unmarked = Math.max(0, totalEmp - present - absent);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>

      {/* Cars */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Cars in shop</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="In Progress"
            value={inProgress}
            icon={<Wrench className="h-5 w-5" />}
            tone="primary"
            to="/cars"
          />
          <StatCard
            label="Ready"
            value={ready}
            icon={<CheckCircle2 className="h-5 w-5" />}
            tone="success"
            to="/cars"
          />
          <StatCard
            label="Delivered"
            value={delivered}
            icon={<Truck className="h-5 w-5" />}
            tone="muted"
            to="/cars"
          />
        </div>
      </section>

      {/* Attendance today */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Today's attendance</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Present"
            value={present}
            icon={<UserCheck className="h-5 w-5" />}
            tone="success"
            to="/attendance"
          />
          <StatCard
            label="Absent"
            value={absent}
            icon={<UserX className="h-5 w-5" />}
            tone="danger"
            to="/attendance"
          />
          <StatCard
            label="Unmarked"
            value={unmarked}
            icon={<UserCheck className="h-5 w-5" />}
            tone="muted"
            to="/attendance"
          />
        </div>
      </section>

      {/* Overdue tasks */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Overdue tasks</h2>
          <Badge variant="outline" className="border-danger/40 text-danger">
            &gt; 3 days open
          </Badge>
        </div>
        <Card>
          <CardContent className="p-0">
            {overdueQ.isLoading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            ) : (overdueQ.data ?? []).length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No overdue tasks. Great job!</p>
            ) : (
              <ul className="divide-y">
                {overdueQ.data!.map((t) => {
                  const days = differenceInCalendarDays(new Date(), new Date(t.created_at));
                  return (
                    <li key={t.id} className="flex items-start gap-3 p-4">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{t.description}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          {t.cars && (
                            <Link
                              to="/cars/$carId"
                              params={{ carId: t.cars.id }}
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <CarIcon className="h-3.5 w-3.5" />
                              {t.cars.make_model} · {t.cars.license_plate}
                            </Link>
                          )}
                          <span>{t.employees?.name ? `Assigned: ${t.employees.name}` : "Unassigned"}</span>
                        </div>
                      </div>
                      <Badge variant="destructive" className="shrink-0">
                        {days}d open
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
  to,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "primary" | "success" | "danger" | "muted";
  to: string;
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "success"
      ? "bg-success/15 text-success"
      : tone === "danger"
      ? "bg-danger/15 text-danger"
      : "bg-muted text-muted-foreground";

  return (
    <Link to={to} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          <div className={`grid h-9 w-9 place-items-center rounded-lg ${toneClass}`}>{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tabular-nums">{value}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
