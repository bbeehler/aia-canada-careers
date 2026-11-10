// Language-aware versions of Link, NavLink and useNavigate: site paths get /fr on French pages.
import { forwardRef } from "react";
import { Link as RLink, NavLink as RNavLink, useNavigate as useRNavigate, type LinkProps, type NavLinkProps } from "react-router-dom";
import { lp } from "../lib/i18n";

const fix = (to: LinkProps["to"]) => (typeof to === "string" ? lp(to) : to);

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(({ to, ...rest }, ref) => <RLink ref={ref} to={fix(to)} {...rest} />);
export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(({ to, ...rest }, ref) => <RNavLink ref={ref} to={fix(to)} {...rest} />);

export function useNavigate() {
  const nav = useRNavigate();
  return (to: string, opts?: { replace?: boolean }) => nav(lp(to), opts);
}
