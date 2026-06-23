import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wrench, Users, CalendarDays, LogOut, Car, ClipboardList, LayoutDashboard } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppShell,
});

function AppShell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const navItem = (to: string, label: string, Icon: typeof Users) => {
    const active = pathname.startsWith(to);
    return (
      <Link
        to={to}
        className={`flex items-center gap-2 rounded-lg px-4 py-3 text-base font-medium transition-colors ${
          active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
        }`}
      >
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-bold sm:text-lg">Workshop Manager</div>
            </div>
          </div>
          <Button variant="outline" size="lg" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          {navItem("/dashboard", "Dashboard", LayoutDashboard)}
          {navItem("/cars", "Cars", Car)}
          {navItem("/employees", "Employees", Users)}
          {navItem("/attendance", "Attendance", CalendarDays)}
          {navItem("/workload", "Workload", ClipboardList)}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
