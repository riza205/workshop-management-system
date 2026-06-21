import { createFileRoute } from "@tanstack/react-router";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Phone, Briefcase, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Employee = {
  id: string;
  name: string;
  role: string;
  phone: string;
  date_joined: string;
};

export const Route = createFileRoute("/_authenticated/employees")({
  component: EmployeesPage,
});

function EmployeesPage() {
  const qc = useQueryClient();
  const { data: employees = [], isLoading } = useQuery({
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

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [toDelete, setToDelete] = useState<Employee | null>(null);

  const openCreate = () => { setEditing(null); setOpen(true); };
  const openEdit = (e: Employee) => { setEditing(e); setOpen(true); };

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee deleted");
      qc.invalidateQueries({ queryKey: ["employees"] });
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Employees</h1>
          <p className="text-sm text-muted-foreground">Your workshop team</p>
        </div>
        <Button size="lg" onClick={openCreate} className="h-12 gap-2 text-base">
          <Plus className="h-5 w-5" /> Add employee
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-4 text-muted-foreground">No employees yet.</p>
            <Button size="lg" onClick={openCreate} className="gap-2">
              <Plus className="h-5 w-5" /> Add your first employee
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp) => (
            <Card key={emp.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold">{emp.name}</h3>
                    <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 shrink-0" /><span className="truncate">{emp.role}</span></div>
                      <div className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" /><span className="truncate">{emp.phone}</span></div>
                      <div className="flex items-center gap-2"><Calendar className="h-4 w-4 shrink-0" /><span>Joined {format(new Date(emp.date_joined), "dd MMM yyyy")}</span></div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="lg" className="flex-1 gap-2" onClick={() => openEdit(emp)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                  <Button variant="outline" size="lg" className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setToDelete(emp)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EmployeeDialog open={open} onOpenChange={setOpen} editing={editing} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will also remove all attendance records for this employee. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => toDelete && del.mutate(toDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmployeeDialog({
  open, onOpenChange, editing,
}: { open: boolean; onOpenChange: (o: boolean) => void; editing: Employee | null }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [dateJoined, setDateJoined] = useState(format(new Date(), "yyyy-MM-dd"));

  // reset form when dialog opens
  useStateReset(open, () => {
    setName(editing?.name ?? "");
    setRole(editing?.role ?? "");
    setPhone(editing?.phone ?? "");
    setDateJoined(editing?.date_joined ?? format(new Date(), "yyyy-MM-dd"));
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: name.trim(), role: role.trim(), phone: phone.trim(), date_joined: dateJoined };
      if (!payload.name || !payload.role || !payload.phone) throw new Error("All fields are required");
      if (editing) {
        const { error } = await supabase.from("employees").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employees").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Employee updated" : "Employee added");
      qc.invalidateQueries({ queryKey: ["employees"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit employee" : "Add employee"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-base" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input id="role" placeholder="e.g. Mechanic, Painter" value={role} onChange={(e) => setRole(e.target.value)} className="h-12 text-base" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12 text-base" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date joined</Label>
            <Input id="date" type="date" value={dateJoined} onChange={(e) => setDateJoined(e.target.value)} className="h-12 text-base" required />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="lg" disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function useStateReset(trigger: boolean, fn: () => void) {
  useEffect(() => { if (trigger) fn(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [trigger]);
}
