import type { ReactNode } from "react";

interface Props {
  tag?: string;
  title: ReactNode;
  body?: ReactNode;
  actions?: ReactNode;
  image?: string;
  imageAlt?: string;
  compact?: boolean;
  children?: ReactNode;
}

// The navy banner at the top of every page. Full size for public pages, compact for account and admin pages.
export default function PageHero({ tag, title, body, actions, image, imageAlt = "", compact, children }: Props) {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#1D3264] to-navy-deep text-white">
      {image ? (
        <>
          <img src={image} alt={imageAlt} className="absolute inset-0 -z-20 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-navy/80 md:bg-transparent md:bg-gradient-to-r md:from-navy md:via-navy/85 md:to-navy/25" aria-hidden />
        </>
      ) : (
        <div className="absolute inset-0 -z-10 opacity-[0.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]" aria-hidden />
      )}
      <div className={`mx-auto flex max-w-6xl flex-col justify-center px-4 ${compact ? "py-8 sm:py-12" : "py-12 sm:min-h-[400px] sm:py-20 lg:min-h-[440px]"}`}>
        {tag && (
          <span className="inline-block self-start rounded-md border border-white/30 bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white sm:text-sm">
            {tag}
          </span>
        )}
        <h1 className={`max-w-3xl font-sans font-bold tracking-tight text-white ${tag ? "mt-4" : ""} ${compact ? "text-2xl sm:text-4xl" : "text-[2.15rem] leading-tight sm:text-5xl lg:text-6xl lg:leading-[1.05]"}`}>
          {title}
        </h1>
        {body && <div className={`mt-4 max-w-2xl text-white/85 ${compact ? "" : "text-lg leading-relaxed"}`}>{body}</div>}
        {actions && <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap [&>*]:w-full sm:[&>*]:w-auto">{actions}</div>}
        {children}
      </div>
    </section>
  );
}

export const heroPrimary = "btn bg-white px-6 py-3 text-navy hover:bg-navy-soft";
export const heroSecondary = "btn border border-white/25 bg-white/10 px-6 py-3 text-white hover:bg-white/20";
