import type { EmploymentType, JobStatus, PayPeriod, Sector } from "./types";

export const SECTORS: Record<Sector, { label: string; blurb: string }> = {
  mechanical: { label: "Mechanical repair", blurb: "Diagnostics, maintenance and repair on cars and trucks" },
  collision: { label: "Collision repair", blurb: "Body, structural and refinish work after an accident" },
  parts_manufacturing: { label: "Parts and manufacturing", blurb: "Making, moving and selling the parts that keep vehicles running" },
  business_operations: { label: "Business operations", blurb: "Service advising, management, marketing, finance and more" },
};

export const EMPLOYMENT_TYPES: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  apprenticeship: "Apprenticeship",
  co_op: "Co-op / placement",
  seasonal: "Seasonal",
};

export const PROVINCES: [string, string][] = [
  ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"], ["NB", "New Brunswick"],
  ["NL", "Newfoundland and Labrador"], ["NS", "Nova Scotia"], ["NT", "Northwest Territories"],
  ["NU", "Nunavut"], ["ON", "Ontario"], ["PE", "Prince Edward Island"], ["QC", "Quebec"],
  ["SK", "Saskatchewan"], ["YT", "Yukon"],
];

export const STATUS_LABELS: Record<JobStatus, string> = {
  draft: "Draft",
  pending_payment: "Awaiting payment",
  pending_review: "In review",
  published: "Live",
  rejected: "Needs changes",
  expired: "Expired",
};

const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 });

export function formatPay(min: number, max: number, period: PayPeriod) {
  const fmt = (n: number) => money.format(n).replace(/\.00$/, "");
  const range = Number(min) === Number(max) ? fmt(min) : `${fmt(min)}–${fmt(max)}`;
  return `${range} ${period === "hour" ? "an hour" : "a year"}`;
}

export function timeAgo(iso: string | null) {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  return `Posted ${days} days ago`;
}
