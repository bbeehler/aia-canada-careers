import type { JobStatus } from "../lib/types";
import { STATUS_LABELS } from "../lib/constants";

const tone: Record<JobStatus, string> = {
  draft: "bg-paper text-steel border-line",
  pending_payment: "bg-amber-50 text-amber-800 border-amber-200",
  pending_review: "bg-navy-soft text-navy border-navy/20",
  published: "bg-emerald-50 text-emerald-800 border-emerald-200",
  rejected: "bg-red-50 text-signal-dark border-red-200",
  expired: "bg-paper text-steel border-line",
};

export default function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${tone[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
