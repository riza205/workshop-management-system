import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCircle2, Car as CarIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workload")({
  component: WorkloadPage,
});

type Employee = { id: string; name: string; role: string };
type OpenTask = {
  id: string;
  description: string;
  assigned_employee_id: string | null;
  car_id: string;
  cars: { id: string; make_model: string; license_plate: string; owner_name: string } | null;
};

function WorkloadPage() {
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Employee[];
    },
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["open-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("car_tasks")
        .select("id, description, assigned_employee_id, car_id, cars(id, make_model, license_plate, owner_name)")
        .eq("done", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as OpenTask[];
    },
    refetchInterval: 5000,
  });

  const byEmployee = new Map<string, OpenTask[]>();
  for (const emp of employees) byEmployee.set(emp.id, []);
  let unassigned: OpenTask[] = [];
  for (const t of tasks) {
    if (t.assigned_employee_id && byEmployee.has(t.assigned_employee_id)) {
      byEmployee.get(t.assigned_employee_id)!.push(t);
    } else {
      unassigned.push(t);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Staff Workload</h1>
        <p className="text-muted-foreground">Open checklist tasks assigned to each employee.</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : employees.length === 0 ? (
        <p className="text-muted-foreground">No employees yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {employees.map((emp) => {
            const list = byEmployee.get(emp.id) ?? [];
            return (
              <Card key={emp.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <UserCircle2 className="h-5 w-5 text-primary" />
                    <span>{emp.name}</span>
                    <span className="text-sm font-normal text-muted-foreground">· {emp.role}</span>
                  </CardTitle>
                  <Badge variant={list.length ? "default" : "secondary"}>
                    {list.length} open
                  </Badge>
                </CardHeader>
                <CardContent>
                  {list.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No open tasks.</p>
                  ) : (
                    <ul className="space-y-2">
                      {list.map((t) => (
                        <li key={t.id} className="rounded-md border p-3">
                          <div className="font-medium">{t.description}</div>
                          {t.cars && (
                            <Link
                              to="/cars/$carId"
                              params={{ carId: t.cars.id }}
                              className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              <CarIcon className="h-3.5 w-3.5" />
                              {t.cars.make_model} · {t.cars.license_plate} ({t.cars.owner_name})
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {unassigned.length > 0 && (
            <Card className="md:col-span-2 border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">Unassigned</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {unassigned.map((t) => (
                    <li key={t.id} className="rounded-md border p-3">
                      <div className="font-medium">{t.description}</div>
                      {t.cars && (
                        <Link
                          to="/cars/$carId"
                          params={{ carId: t.cars.id }}
                          className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <CarIcon className="h-3.5 w-3.5" />
                          {t.cars.make_model} · {t.cars.license_plate} ({t.cars.owner_name})
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
