import type { Sector } from "../lib/types";

const base = "h-5 w-5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]";

const STYLE: Record<Sector, string> = {
  mechanical: "bg-navy-soft text-navy",
  collision: "bg-navy-soft text-navy",
  parts_manufacturing: "bg-amber-50 text-amber-700",
  business_operations: "bg-emerald-50 text-emerald-700",
};

export default function SectorIcon({ sector, size = "h-9 w-9" }: { sector: Sector; size?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-md ${size} ${STYLE[sector]}`} aria-hidden>
      {sector === "business_operations" ? (
        <svg viewBox="0 0 24 24" className={base}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M8 7v13M16 7v13" /></svg>
      ) : sector === "parts_manufacturing" ? (
        <svg viewBox="0 0 24 24" className={base}><path d="M3 21V10l5 3V10l5 3V5h4l1 16zM3 21h18" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" className={base}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.6 17.2a1.6 1.6 0 0 0 2.3 2.3l5.7-5.7a4 4 0 0 0 5.2-5.4l-2.5 2.5-2.2-.6-.6-2.2z" /></svg>
      )}
    </span>
  );
}
