export type CarStatus = "in_progress" | "ready" | "delivered";

export const CAR_STATUS_LABEL: Record<CarStatus, string> = {
  in_progress: "In Progress",
  ready: "Ready",
  delivered: "Delivered",
};

export const CAR_STATUS_CLASS: Record<CarStatus, string> = {
  in_progress: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  ready: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  delivered: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
};

export const JOB_STATUSES = [
  "open",
  "in_progress",
  "awaiting_approval",
  "completed",
  "delivered",
  "cancelled",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  awaiting_approval: "Awaiting Approval",
  completed: "Completed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const JOB_STATUS_CLASS: Record<JobStatus, string> = {
  open: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  in_progress: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  awaiting_approval: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  delivered: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
  cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};