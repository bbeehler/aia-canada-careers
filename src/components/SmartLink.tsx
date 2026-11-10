import type { ReactNode } from "react";
import { Link } from "./L";

// Uses in-app navigation for site paths (/jobs) and a normal link for full web addresses.
export default function SmartLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  if (/^https?:\/\//.test(to) || to.startsWith("mailto:")) {
    return <a href={to} className={className} target="_blank" rel="noopener noreferrer">{children}</a>;
  }
  return <Link to={to} className={className}>{children}</Link>;
}
