import type { DealType } from "./types";

export function dealBadge(type: DealType, value: number | null): string {
  switch (type) {
    case "bogo":
      return "Buy 1 Free 1";
    case "percent_off":
      return `−${value ?? 0}%`;
    case "flat_off":
      return `RM${value ?? 0} off`;
    case "bundle":
      return `RM${value ?? 0} set`;
    case "mystery":
      return `RM${value ?? 0} mystery`;
  }
}

export function timeLeft(validTo: string): string {
  const ms = new Date(validTo).getTime() - Date.now();
  if (ms <= 0) return "ended";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m left`;
  return `${Math.floor(hrs / 24)}d left`;
}

export function quotaLine(claimed: number, quota: number | null): string {
  if (quota === null) return claimed > 0 ? `${claimed} claimed` : "";
  const left = Math.max(quota - claimed, 0);
  if (left === 0) return "all claimed";
  if (left <= 5) return `${claimed} claimed · ${left} left. It won't wait.`;
  return `${claimed} claimed · ${left} left`;
}

export function distanceLabel(m: number | null): string {
  if (m === null) return "";
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}
