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
    id: "home.didyouknow", page: "Home page", title: "Did you know? banner",
    fields: [
      { key: "home.didyouknow.tag", label: "Small tag", type: "text", default: "Did You Know?" },
      { key: "home.didyouknow.heading", label: "Heading", type: "text", default: "Canada’s Automotive Aftermarket" },
      { key: "home.didyouknow.body", label: "Paragraph", type: "textarea", default: "The Canadian automotive aftermarket reached a **record $43.9 billion** in economic output, supporting over **400,000 jobs** across 29,000+ businesses nationwide – and it’s growing. Learn how the industry works, what sets the aftermarket apart from dealerships, and why now is one of the best times to enter this field.", hint: "Put **double asterisks** around words to make them bold." },
      { key: "home.didyouknow.button.label", label: "Button label", type: "text", default: "Learn More" },
      { key: "home.didyouknow.button.url", label: "Button link", type: "text", default: "https://www.aiacanada.com/about-us/" },
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
    id: "home.parents", page: "Home page", title: "For parents and guardians banner",
    fields: [
      { key: "home.parents.heading", label: "Heading", type: "text", default: "For Parents & Guardians", hint: HIGHLIGHT_HINT },
      { key: "home.parents.body", label: "Paragraph", type: "textarea", default: "Help your teen make an informed decision. Learn about training programs, salary expectations, and the strong job market in automotive careers." },
      { key: "home.parents.button1.label", label: "First button: label", type: "text", default: "Parent Resources" },
      { key: "home.parents.button1.url", label: "First button: link", type: "text", default: "/parents", hint: "A page on this site (like /parents) or a full web address." },
      { key: "home.parents.button2.label", label: "Second button: label", type: "text", default: "Compare Careers" },
      { key: "home.parents.button2.url", label: "Second button: link", type: "text", default: "/parents#pay" },
      { key: "home.parents.image", label: "Background photo", type: "image", default: "/parents-youth-shop.jpg", hint: "Wide photos work best. Keep the people on the right side, since the text sits on the left." },
      { key: "home.parents.image_alt", label: "Photo description (for screen readers)", type: "text", default: "A teenager holding a wrench and clipboard while a technician explains an engine repair" },
    ],
  },
  {
    id: "parents", page: "Parents page", title: "Parents and guardians page",
    fields: [
      { key: "parents.heading", label: "Headline", type: "text", default: "A guide for parents and guardians", hint: HIGHLIGHT_HINT },
      { key: "parents.intro", label: "Intro", type: "textarea", default: "If your teen is interested in cars, trucks or how things work, the automotive aftermarket offers skilled, in-demand careers. Here’s how people get started and what the work pays." },
      { key: "parents.training.heading", label: "Training: heading", type: "text", default: "How people get started" },
      { key: "parents.training.body", label: "Training: text", type: "textarea", default: "Many technicians start with an apprenticeship, earning a wage while they learn on the job and complete in-school training. Others begin with a college program in automotive service, collision repair or manufacturing. Business roles like service advisor, marketing and accounting are open to college and university graduates. High school co-op placements and technical courses are a great way to try the work first." },
      { key: "parents.pay.heading", label: "Pay: heading", type: "text", default: "What jobs pay right now" },
      { key: "parents.pay.body", label: "Pay: text", type: "textarea", default: "These ranges come from jobs currently posted on Careers in Auto Care. Every posting lists its pay." },
      { key: "parents.market.heading", label: "Job market: heading", type: "text", default: "Employers are hiring" },
      { key: "parents.market.body", label: "Job market: text", type: "textarea", default: "Shops, parts makers and suppliers across Canada are looking for people at every level, from apprentices to experienced technicians and managers. Browse open jobs with your teen to see what’s available near you." },
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
      { key: "footer.blurb", label: "Footer description", type: "textarea", default: "Helping Canadian high school students and parents explore rewarding career paths in the automotive care sector. Powered by AIA Canada." },
      { key: "footer.bottom", label: "Bottom line", type: "text", default: "Careers in Auto Care by AIA Canada – Career exploration for the next generation of Canadian automotive professionals" },
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

// Renders text with **bold** words.
export function Bold({ text, className = "font-semibold text-white" }: { text: string; className?: string }) {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return <>{parts.map((p, i) => (i % 2 ? <strong key={i} className={className}>{p}</strong> : p))}</>;
}

// Renders text with *highlighted* words in red.
export function Highlighted({ text, className = "text-[#F0384F]" }: { text: string; className?: string }) {
  const parts = text.split(/\*([^*]+)\*/g);
  return <>{parts.map((p, i) => (i % 2 ? <span key={i} className={className}>{p}</span> : p))}</>;
}
