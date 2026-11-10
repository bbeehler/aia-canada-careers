import { Link } from "./L";
import type { Job } from "../lib/types";
import { EMPLOYMENT_TYPES, SECTORS, formatPay, timeAgo } from "../lib/constants";

import { t } from "../lib/i18n";
export default function JobRow({ job }: { job: Job }) {
  return (
    <li>
      <Link
        to={`/jobs/${job.id}`}
        className="group grid gap-3 border-b border-line bg-white px-5 py-4 hover:bg-navy-soft/40 sm:grid-cols-[1fr_auto] sm:items-center"
      >
        <div className="min-w-0">
          <p className="text-xs font-medium text-signal">{SECTORS[job.sector].label}</p>
          <h3 className="mt-0.5 text-xl leading-tight group-hover:underline">{job.title}</h3>
          <p className="mt-1 text-sm text-steel">
            {job.companies?.name ?? t("Employer")} – {job.city}, {job.province}
            {job.remote_ok ? " (some remote)" : ""}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="font-display text-xl font-semibold text-navy">{formatPay(job.pay_min, job.pay_max, job.pay_period)}</p>
          <p className="text-xs text-steel">
            {EMPLOYMENT_TYPES[job.employment_type]}, {timeAgo(job.published_at).toLowerCase()}
          </p>
        </div>
      </Link>
    </li>
  );
}
