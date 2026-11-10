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
      { key: "parents.hero.tag", label: "Banner: small tag", type: "text", default: "For Parents & Guardians" },
      { key: "parents.heading", label: "Banner: headline", type: "text", default: "A guide for parents and guardians", hint: HIGHLIGHT_HINT },
      { key: "parents.intro", label: "Banner: paragraph", type: "textarea", default: "If your teen is interested in cars, trucks or how things work, the automotive aftermarket offers skilled, in-demand careers. Here’s how people get started and what the work pays." },
      { key: "parents.hero.image", label: "Banner: background photo", type: "image", default: "", hint: "Optional. Leave empty for the plain navy banner. Wide photos work best." },
      { key: "parents.training.heading", label: "Training: heading", type: "text", default: "How people get started" },
      { key: "parents.training.body", label: "Training: text", type: "textarea", default: "Many technicians start with an apprenticeship, earning a wage while they learn on the job and complete in-school training. Others begin with a college program in automotive service, collision repair or manufacturing. Business roles like service advisor, marketing and accounting are open to college and university graduates. High school co-op placements and technical courses are a great way to try the work first." },
      { key: "parents.pay.heading", label: "Salary information: heading", type: "text", default: "Salary Information" },
      { key: "parents.statcan.heading", label: "Statistics Canada: subheading", type: "text", default: "Average earnings across the auto care industry" },
      { key: "parents.statcan.body", label: "Statistics Canada: text", type: "textarea", default: "The latest figures from Statistics Canada, updated automatically each month when new data is released." },
      { key: "parents.postings.heading", label: "Job postings: subheading", type: "text", default: "Pay in current job postings" },
      { key: "parents.pay.body", label: "Job postings: text", type: "textarea", default: "These ranges come from jobs currently posted on Careers in Auto Care. Every posting lists its pay." },
      { key: "parents.market.heading", label: "Job market: heading", type: "text", default: "Employers are hiring" },
      { key: "parents.market.body", label: "Job market: text", type: "textarea", default: "Shops, parts makers and suppliers across Canada are looking for people at every level, from apprentices to experienced technicians and managers. Browse open jobs with your teen to see what’s available near you." },
    ],
  },
  {
    id: "about.hero", page: "About the Industry page", title: "Banner",
    fields: [
      { key: "about.hero.tag", label: "Small tag", type: "text", default: "About the Industry" },
      { key: "about.hero.heading", label: "Headline", type: "text", default: "Canada’s Automotive Aftermarket", hint: HIGHLIGHT_HINT },
      { key: "about.hero.body", label: "Paragraph", type: "textarea", default: "Before you choose a career path, it helps to understand the industry you’ll be joining. The Canadian automotive aftermarket is one of the country’s most essential – and most overlooked – economic engines." },
      { key: "about.hero.image", label: "Background photo", type: "image", default: "", hint: "Optional. Leave empty for the plain navy banner. Wide photos work best." },
    ],
  },
  {
    id: "careers.hero", page: "Explore careers page", title: "Banner",
    fields: [
      { key: "careers.hero.tag", label: "Small tag", type: "text", default: "Explore Careers" },
      { key: "careers.hero.heading", label: "Headline", type: "text", default: "Find a career that fits you", hint: HIGHLIGHT_HINT },
      { key: "careers.hero.body", label: "Paragraph", type: "textarea", default: "Browse careers in vehicle repair, collision, manufacturing and business operations. See what each job involves, what it pays, and how to get started." },
      { key: "careers.hero.image", label: "Background photo", type: "image", default: "", hint: "Optional. Leave empty for the plain navy banner. Wide photos work best." },
    ],
  },
  {
    id: "resources.hero", page: "Resources page", title: "Banner",
    fields: [
      { key: "resources.hero.tag", label: "Small tag", type: "text", default: "Resources" },
      { key: "resources.hero.heading", label: "Headline", type: "text", default: "Resources & Learning", hint: HIGHLIGHT_HINT },
      { key: "resources.hero.body", label: "Paragraph", type: "textarea", default: "Helpful Canadian resources for students exploring automotive careers and parents supporting their career decisions." },
      { key: "resources.hero.image", label: "Background photo", type: "image", default: "", hint: "Optional. Leave empty for the plain navy banner. Wide photos work best." },
    ],
  },
  {
    id: "jobs.hero", page: "Find jobs page", title: "Banner",
    fields: [
      { key: "jobs.hero.tag", label: "Small tag", type: "text", default: "Find Jobs" },
      { key: "jobs.hero.heading", label: "Headline", type: "text", default: "Find your next job in auto care", hint: HIGHLIGHT_HINT },
      { key: "jobs.hero.body", label: "Paragraph", type: "textarea", default: "Browse open positions from repair shops, collision centres, parts makers and suppliers across Canada. Every posting lists its pay." },
      { key: "jobs.hero.image", label: "Background photo", type: "image", default: "", hint: "Optional. Leave empty for the plain navy banner. Wide photos work best." },
    ],
  },
  {
    id: "about.stats", page: "About the Industry page", title: "Numbers strip and overview",
    fields: [
      { key: "about.stats", label: "Numbers", type: "list", default: "$43.9B | Economic Output (CAD) | Record high for the Canadian automotive aftermarket\n400,000+ | Jobs Supported | Direct and indirect employment across Canada\n29,700+ | Businesses Nationwide | Repair shops, parts makers and retailers\n26.7 Million | Registered Vehicles | On Canadian roads and needing regular service", hint: "One per line: number | label | small caption" },
      { key: "about.overview.tag", label: "Overview: small tag", type: "text", default: "Industry Overview" },
      { key: "about.overview.heading", label: "Overview: heading", type: "text", default: "What Is the Automotive Aftermarket?", hint: HIGHLIGHT_HINT },
      { key: "about.overview.body", label: "Overview: text", type: "textarea", default: "When your family’s car needs an oil change, new brakes, or a repair after an accident, you visit an automotive service business. That entire world – the parts, the shops, the people – is called the **automotive aftermarket**.\n\nThe “aftermarket” refers to everything that happens to a vehicle after it’s sold new – all the maintenance, repairs, parts, and services it needs throughout its lifetime. In Canada, this is a massive, essential industry that keeps millions of vehicles safely on the road every single day.", hint: "Leave a blank line between paragraphs. Put **double asterisks** around words to make them bold." },
    ],
  },
  {
    id: "about.compare", page: "About the Industry page", title: "Dealership vs. independent aftermarket",
    fields: [
      { key: "about.compare.tag", label: "Small tag", type: "text", default: "Two Service Pathways" },
      { key: "about.compare.heading", label: "Heading", type: "text", default: "Dealership vs. Independent Aftermarket" },
      { key: "about.compare.intro", label: "Intro", type: "textarea", default: "When it comes to vehicle service in Canada, there are two main sectors where careers exist. Understanding the difference helps you find where you’ll fit best." },
      { key: "about.dealer.title", label: "Dealership: title", type: "text", default: "Dealership" },
      { key: "about.dealer.subtitle", label: "Dealership: subtitle", type: "text", default: "Brand-specific service" },
      { key: "about.dealer.text", label: "Dealership: description", type: "textarea", default: "Dealership service centres are attached to new vehicle franchises – think a Toyota dealership or a GM dealer. They specialize in one brand and handle warranty work, recalls, and maintenance for vehicles in their brand family." },
      { key: "about.dealer.points", label: "Dealership: points", type: "list", default: "Franchised and brand-specific (e.g., Toyota, Ford, GM dealer)\nPrimarily services vehicles under manufacturer warranty\nUses Original Equipment Manufacturer (OEM) parts\nTechnicians are trained and certified by the manufacturer\nHigher labour rates, brand-controlled customer experience\nFocused on one brand or a small family of brands", hint: LIST_HINT },
      { key: "about.indie.title", label: "Independent: title", type: "text", default: "Independent Aftermarket" },
      { key: "about.indie.badge", label: "Independent: badge", type: "text", default: "AIA Canada represents this sector" },
      { key: "about.indie.text", label: "Independent: description", type: "textarea", default: "Independent aftermarket businesses are not tied to any single brand. They service all makes and models, and represent the vast majority of vehicle repair and maintenance businesses across Canada." },
      { key: "about.indie.points", label: "Independent: points", type: "list", default: "Independent shops work on all makes, models, and years\nServes vehicles once they’re out of warranty – the majority of vehicles on the road\nUses high-quality aftermarket and OEM-equivalent parts\nTechnicians hold Red Seal and industry certifications\nCompetitive pricing, community-based, customer-focused\nA $43.9B sector that employs hundreds of thousands of Canadians", hint: LIST_HINT },
      { key: "about.goodnews", label: "Good news note", type: "textarea", default: "**Good news:** The careers featured on this site apply to both sectors. Whether you work at a dealership or an independent shop, the skills, certifications, and opportunities are largely the same.", hint: "Put **double asterisks** around words to make them bold." },
    ],
  },
  {
    id: "about.chain", page: "About the Industry page", title: "Supply chain",
    fields: [
      { key: "about.chain.tag", label: "Small tag", type: "text", default: "How It All Fits Together" },
      { key: "about.chain.heading", label: "Heading", type: "text", default: "The Automotive Supply Chain" },
      { key: "about.chain.intro", label: "Intro", type: "textarea", default: "From the factory floor to your family’s driveway, a whole ecosystem of businesses and people work together to keep Canada’s vehicles running. Every step in this chain is a career opportunity." },
      { key: "about.chain.steps", label: "Steps", type: "list", default: "Parts Manufacturers | Companies that design and produce replacement parts – from brake pads to engine components. Many are global brands with Canadian operations. | Brake pads & rotors, Filters & belts, Electrical components, Body & chassis parts, High-voltage batteries\nDistributors & Wholesalers | National and regional companies that warehouse parts and deliver them quickly to service locations – often the same or next day. | National distribution centres, Regional warehouses, Fleet delivery & logistics, Inventory management\nRetailers & Jobbers | Local parts stores and jobbers serve as the link between distributors and repair shops, providing parts, tools, and technical support. | Auto parts stores, Jobber networks, Tool suppliers, Technical support\nService & Repair Shops | The front line of the aftermarket – where vehicles are inspected, maintained, and repaired by skilled technicians and service professionals. | Independent repair shops, Specialty shops, Quick lube centres, Fleet maintenance, Collision centres, Diagnostic specialists, ADAS calibration, Tire shops\nVehicle Owners | Every Canadian driver depends on this supply chain to keep their vehicle safe, reliable, and road-ready – creating consistent, year-round demand. | 26.7 million registered vehicles, Regular maintenance needs, Collision & repair work, Year-round demand", hint: "One step per line: title | description | examples separated by commas" },
    ],
  },
  {
    id: "about.growth", page: "About the Industry page", title: "Growing industry and closing call to action",
    fields: [
      { key: "about.growth.tag", label: "Small tag", type: "text", default: "Why Now Is a Great Time" },
      { key: "about.growth.heading", label: "Heading", type: "text", default: "A Growing Industry That Needs You" },
      { key: "about.growth.intro", label: "Intro", type: "textarea", default: "The automotive aftermarket isn’t just stable – it’s growing and evolving. Here’s why a career in this sector is a smart choice right now." },
      { key: "about.growth.cards", label: "Cards", type: "list", default: "Vehicles Are Getting Older | Canadians are keeping their vehicles longer, which means more vehicles that need ongoing maintenance and repair from aftermarket professionals.\nElectric Vehicles Are Coming | EVs are growing fast, but they still need brakes, tires, software updates, and collision repair – creating new opportunities for trained professionals.\nTechnician Shortage | Canada faces a significant skilled trades shortage. Qualified automotive professionals are in high demand, with strong job security and competitive wages.\nTechnology Is Evolving | Modern vehicles are computers on wheels. The industry needs tech-savvy professionals who understand electronics, diagnostic software, and advanced systems.", hint: "One card per line: title | text" },
      { key: "about.cta.heading", label: "Closing: heading", type: "text", default: "Ready to Find Your Place in the Industry?" },
      { key: "about.cta.body", label: "Closing: text", type: "textarea", default: "Now that you understand the sector, explore the specific careers waiting for you – or take our quick quiz to find your best match." },
      { key: "about.cta.link.label", label: "Closing: AIA link label", type: "text", default: "Learn More at AIA Canada" },
      { key: "about.cta.link.url", label: "Closing: AIA link", type: "text", default: "https://www.aiacanada.com/about-us/" },
    ],
  },
  {
    id: "employers", page: "For employers page", title: "For employers page",
    fields: [
      { key: "employers.hero.tag", label: "Banner: small tag", type: "text", default: "For Employers" },
      { key: "employers.headline", label: "Banner: headline", type: "text", default: "Hire from the people who chose this industry." },
      { key: "employers.body", label: "Banner: paragraph", type: "textarea", default: "Everyone searching here is looking for work in auto care. Post your opening in a few minutes and manage applications in one place." },
      { key: "employers.hero.image", label: "Banner: background photo", type: "image", default: "", hint: "Optional. Leave empty for the plain navy banner. Wide photos work best." },
      { key: "employers.members.price", label: "Members: price", type: "text", default: "Free" },
      { key: "employers.members.text", label: "Members: description", type: "textarea", default: "Unlimited postings for every location of a member company, including featured placement on the home page. Each posting runs 30 days." },
      { key: "employers.nonmembers.price", label: "Non-members: price", type: "text", default: "Per posting" },
      { key: "employers.nonmembers.text", label: "Non-members: description", type: "textarea", default: "Pay a flat fee for each 30-day posting, plus an optional fee to feature it on the home page. Becoming a member makes both free." },
    ],
  },
  {
    id: "quiz", page: "Career quiz", title: "Banner",
    fields: [
      { key: "quiz.hero.tag", label: "Small tag", type: "text", default: "Career Quiz" },
      { key: "quiz.heading", label: "Heading", type: "text", default: "Career Match Quiz" },
      { key: "quiz.body", label: "Paragraph", type: "textarea", default: "Answer six quick questions about what you enjoy, and we’ll show you which part of the automotive industry might fit you best. It takes about two minutes." },
      { key: "quiz.hero.image", label: "Background photo", type: "image", default: "", hint: "Optional. Leave empty for the plain navy banner. Wide photos work best." },
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

interface ContentState { get: (key: string) => string; list: (key: string) => string[]; rows: (key: string) => string[][]; reload: () => Promise<void> }
const ContentContext = createContext<ContentState>({ get: (k) => DEFAULTS[k] ?? "", list: () => [], rows: () => [], reload: async () => {} });

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
    const rows = (key: string) => list(key).map((line) => line.split("|").map((p) => p.trim()));
    return { get, list, rows, reload };
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
