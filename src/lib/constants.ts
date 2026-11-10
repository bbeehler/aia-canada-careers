import type { EmploymentType, JobStatus, PayPeriod, Sector } from "./types";
import { getLang, locale } from "./i18n";
/* eslint-disable @typescript-eslint/no-explicit-any */

const SECTORS_EN: Record<Sector, { label: string; blurb: string }> = {
  mechanical: { label: "Mechanical repair", blurb: "Diagnostics, maintenance and repair on cars and trucks" },
  collision: { label: "Collision repair", blurb: "Body, structural and refinish work after an accident" },
  parts_manufacturing: { label: "Parts and manufacturing", blurb: "Making, moving and selling the parts that keep vehicles running" },
  business_operations: { label: "Business operations", blurb: "Service advising, management, marketing, finance and more" },
};

const EMPLOYMENT_TYPES_EN: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  apprenticeship: "Apprenticeship",
  co_op: "Co-op / placement",
  seasonal: "Seasonal",
};

const PROVINCES_EN: [string, string][] = [
  ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"], ["NB", "New Brunswick"],
  ["NL", "Newfoundland and Labrador"], ["NS", "Nova Scotia"], ["NT", "Northwest Territories"],
  ["NU", "Nunavut"], ["ON", "Ontario"], ["PE", "Prince Edward Island"], ["QC", "Quebec"],
  ["SK", "Saskatchewan"], ["YT", "Yukon"],
];

const STATUS_LABELS_EN: Record<JobStatus, string> = {
  draft: "Draft",
  pending_payment: "Awaiting payment",
  pending_review: "In review",
  published: "Live",
  rejected: "Needs changes",
  expired: "Expired",
};

export function formatPay(min: number, max: number, period: PayPeriod) {
  const money = new Intl.NumberFormat(locale(), { style: "currency", currency: "CAD", maximumFractionDigits: 2 });
  const fmt = (n: number) => money.format(n).replace(/[.,]00(?=\D*$)/, "");
  const range = Number(min) === Number(max) ? fmt(min) : `${fmt(min)}–${fmt(max)}`;
  const fr = getLang() === "fr";
  return `${range} ${period === "hour" ? (fr ? "l’heure" : "an hour") : (fr ? "par année" : "a year")}`;
}

export function timeAgo(iso: string | null) {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  const fr = getLang() === "fr";
  if (days <= 0) return fr ? "Publié aujourd’hui" : "Posted today";
  if (days === 1) return fr ? "Publié hier" : "Posted yesterday";
  return fr ? `Publié il y a ${days} jours` : `Posted ${days} days ago`;
}

const SECTORS_FR: Record<Sector, { label: string; blurb: string }> = {
  mechanical: { label: "Réparation mécanique", blurb: "Diagnostic, entretien et réparation d’automobiles et de camions" },
  collision: { label: "Réparation de carrosserie", blurb: "Travaux de carrosserie, de structure et de peinture après une collision" },
  parts_manufacturing: { label: "Pièces et fabrication", blurb: "Fabriquer, distribuer et vendre les pièces qui font rouler les véhicules" },
  business_operations: { label: "Gestion et administration", blurb: "Conseil au service, gestion, marketing, finances et plus encore" },
};
const EMPLOYMENT_TYPES_FR: Record<EmploymentType, string> = {
  full_time: "Temps plein", part_time: "Temps partiel", contract: "Contrat", apprenticeship: "Apprentissage",
  co_op: "Stage coopératif", seasonal: "Saisonnier",
};
const PROVINCES_FR: [string, string][] = [
  ["AB", "Alberta"], ["BC", "Colombie-Britannique"], ["MB", "Manitoba"], ["NB", "Nouveau-Brunswick"],
  ["NL", "Terre-Neuve-et-Labrador"], ["NS", "Nouvelle-Écosse"], ["NT", "Territoires du Nord-Ouest"],
  ["NU", "Nunavut"], ["ON", "Ontario"], ["PE", "Île-du-Prince-Édouard"], ["QC", "Québec"],
  ["SK", "Saskatchewan"], ["YT", "Yukon"],
];
const STATUS_LABELS_FR: Record<JobStatus, string> = {
  draft: "Brouillon", pending_payment: "Paiement en attente", pending_review: "En révision",
  published: "En ligne", rejected: "Modifications requises", expired: "Expirée",
};

// Language-aware lookups (read at render time, so they follow the page language)
const pick = <T,>(en: T, fr: T) => () => (getLang() === "fr" ? fr : en);
const sectors = pick(SECTORS_EN, SECTORS_FR);
const types = pick(EMPLOYMENT_TYPES_EN, EMPLOYMENT_TYPES_FR);
const statuses = pick(STATUS_LABELS_EN, STATUS_LABELS_FR);
export const SECTORS = new Proxy({} as Record<Sector, { label: string; blurb: string }>, { get: (_, k) => sectors()[k as Sector], ownKeys: () => Reflect.ownKeys(SECTORS_EN), getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) });
export const EMPLOYMENT_TYPES = new Proxy({} as Record<EmploymentType, string>, { get: (_, k) => types()[k as EmploymentType], ownKeys: () => Reflect.ownKeys(EMPLOYMENT_TYPES_EN), getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) });
export const STATUS_LABELS = new Proxy({} as Record<JobStatus, string>, { get: (_, k) => statuses()[k as JobStatus], ownKeys: () => Reflect.ownKeys(STATUS_LABELS_EN), getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) });
export const provinces = () => (getLang() === "fr" ? PROVINCES_FR : PROVINCES_EN);
export const PROVINCES = new Proxy([] as [string, string][], { get: (_, k) => (provinces() as any)[k] });
