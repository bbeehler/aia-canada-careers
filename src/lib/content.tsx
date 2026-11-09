import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "./supabase";

export type FieldType = "text" | "textarea" | "list" | "image";
export interface ContentField { key: string; label: string; type: FieldType; default: string; hint?: string }
export interface ContentSection { id: string; page: string; title: string; fields: ContentField[] }

const HIGHLIGHT_HINT = "Put *asterisks* around words to show them in red.";
const LIST_HINT = "One per line.";

// Every editable piece of the site, with the wording used until an admin changes it.
export const CONTENT_SECTIONS: ContentSection[] = [
  {
    id: "home.hero", page: "Home page", title: "Hero (top banner)",
    fields: [
      { key: "home.hero.tag", label: "Small tag above the headline", type: "text", default: "Career Exploration" },
      { key: "home.hero.headline", label: "Headline", type: "text", default: "Your Future in *Automotive* Starts Here", hint: HIGHLIGHT_HINT },
      { key: "home.hero.body", label: "Paragraph", type: "textarea", default: "Discover rewarding career paths in vehicle repair and automotive business operations. Built for Canadian high school students and parents ready to explore a thriving industry." },
      { key: "home.hero.quiz_button", label: "Quiz button label", type: "text", default: "Take the Career Quiz" },
      { key: "home.hero.image", label: "Background photo", type: "image", default: "/hero-technician-lift.jpg", hint: "Wide photos work best (at least 1800 pixels wide). JPG, PNG or WebP, up to 5 MB." },
      { key: "home.hero.image_alt", label: "Photo description (for screen readers)", type: "text", default: "A technician in coveralls working under a car raised on a lift in a repair shop" },
    ],
  },
  {
    id: "home.pathways", page: "Home page", title: "Two pathways",
    fields: [
      { key: "home.pathways.heading", label: "Heading", type: "text", default: "Two Pathways, Endless Possibilities" },
      { key: "home.pathways.intro", label: "Intro", type: "textarea", default: "The automotive care sector offers diverse career opportunities across two major areas. Find the path that matches your interests." },
      { key: "home.pathways.one.title", label: "First box: title", type: "text", default: "Vehicle Repair & Service" },
      { key: "home.pathways.one.text", label: "First box: description", type: "textarea", default: "From diagnostics to full engine rebuilds, explore the hands-on world of keeping vehicles running safely." },
      { key: "home.pathways.one.roles", label: "First box: job tags", type: "list", default: "Automotive Service Technician\nDiesel Service Technician\nTruck & Transport Mechanic\nCollision Repair", hint: LIST_HINT },
      { key: "home.pathways.two.title", label: "Second box: title", type: "text", default: "Business Operations" },
      { key: "home.pathways.two.text", label: "Second box: description", type: "textarea", default: "Love cars but prefer working with people and ideas? Explore business roles that keep automotive companies thriving." },
      { key: "home.pathways.two.roles", label: "Second box: job tags", type: "list", default: "Service Advisor\nMarketing\nShop Manager\nPayroll & Accounting", hint: LIST_HINT },
    ],
  },
  {
    id: "home.featured", page: "Home page", title: "Featured careers and newest jobs",
    fields: [
      { key: "home.featured.heading", label: "Featured heading", type: "text", default: "Featured Careers" },
      { key: "home.featured.subtitle", label: "Featured subtitle", type: "text", default: "Featured openings from employers across the industry" },
      { key: "home.featured.button", label: "Featured button label", type: "text", default: "View All Careers" },
      { key: "home.newest.heading", label: "Newest jobs heading", type: "text", default: "Newest jobs" },
    ],
  },
  {
    id: "home.employers", page: "Home page", title: "Employer banner (bottom)",
    fields: [
      { key: "home.employers.heading", label: "Heading", type: "text", default: "Hiring? AIA Canada members post free." },
      { key: "home.employers.body", label: "Paragraph", type: "textarea", default: "Reach technicians, apprentices and industry professionals who are looking specifically for work in auto care. Non-members can post too, for a flat fee per posting." },
    ],
  },
  {
    id: "employers", page: "For employers page", title: "For employers page",
    fields: [
      { key: "employers.headline", label: "Headline", type: "text", default: "Hire from the people who chose this industry." },
      { key: "employers.body", label: "Paragraph", type: "textarea", default: "Everyone searching here is looking for work in auto care. Post your opening in a few minutes and manage applications in one place." },
      { key: "employers.members.price", label: "Members: price", type: "text", default: "Free" },
      { key: "employers.members.text", label: "Members: description", type: "textarea", default: "Unlimited postings for every location of a member company, including featured placement on the home page. Each posting runs 30 days." },
      { key: "employers.nonmembers.price", label: "Non-members: price", type: "text", default: "Per posting" },
      { key: "employers.nonmembers.text", label: "Non-members: description", type: "textarea", default: "Pay a flat fee for each 30-day posting, plus an optional fee to feature it on the home page. Becoming a member makes both free." },
    ],
  },
  {
    id: "quiz", page: "Career quiz", title: "Quiz start screen",
    fields: [
      { key: "quiz.heading", label: "Heading", type: "text", default: "Career Match Quiz" },
      { key: "quiz.body", label: "Paragraph", type: "textarea", default: "Answer six quick questions about what you enjoy, and we’ll show you which part of the automotive industry might fit you best. It takes about two minutes." },
    ],
  },
  {
    id: "footer", page: "Every page", title: "Footer",
    fields: [
      { key: "footer.blurb", label: "Footer description", type: "textarea", default: "The job board for Canada’s automotive aftermarket, from the Automotive Industries Association of Canada." },
    ],
  },
];

const DEFAULTS: Record<string, string> = Object.fromEntries(
  CONTENT_SECTIONS.flatMap((s) => s.fields.map((f) => [f.key, f.default])),
);

interface ContentState { get: (key: string) => string; list: (key: string) => string[]; reload: () => Promise<void> }
const ContentContext = createContext<ContentState>({ get: (k) => DEFAULTS[k] ?? "", list: () => [], reload: async () => {} });

export function ContentProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const reload = useCallback(async () => {
    const { data } = await supabase.from("site_content").select("key, value");
    setValues(Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value])));
  }, []);
  useEffect(() => { reload(); }, [reload]);

  // Memoized so editors don't lose unsaved typing when the app re-renders for other reasons.
  const state = useMemo<ContentState>(() => {
    const get = (key: string) => values[key] ?? DEFAULTS[key] ?? "";
    const list = (key: string) => get(key).split("\n").map((s) => s.trim()).filter(Boolean);
    return { get, list, reload };
  }, [values, reload]);
  return <ContentContext.Provider value={state}>{children}</ContentContext.Provider>;
}

export const useContent = () => useContext(ContentContext);
export const contentDefault = (key: string) => DEFAULTS[key] ?? "";

// Renders text with *highlighted* words in red.
export function Highlighted({ text, className = "text-[#F0384F]" }: { text: string; className?: string }) {
  const parts = text.split(/\*([^*]+)\*/g);
  return <>{parts.map((p, i) => (i % 2 ? <span key={i} className={className}>{p}</span> : p))}</>;
}
