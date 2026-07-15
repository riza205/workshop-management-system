import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toValidDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: Date | string | number | null | undefined, pattern: string, fallback = "—") {
  const date = toValidDate(value);
  if (!date) return fallback;
  try {
    return format(date, pattern);
  } catch {
    return fallback;
  }
}
