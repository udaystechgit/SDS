interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  image?: string;
  showLogo?: boolean;
}

import logo from "@/assets/brand/sds-logo-transparent.png";

export function PageHero({ eyebrow, title, description, image, showLogo }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-[color:var(--navy)] text-white">
      {image && (
        <>
          <img
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--navy)] via-[color:var(--navy)]/85 to-transparent" />
        </>
      )}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="max-w-3xl">
          {showLogo && (
            <img
              src={logo}
              alt="SDS Consulting Services"
              className="mb-6 h-auto w-32 object-contain drop-shadow-[0_0_24px_rgba(255,255,255,0.28)] sm:w-40"
            />
          )}
          {eyebrow && (
            <div className="text-xs uppercase tracking-[0.25em] text-[color:var(--brand-bright)] font-semibold">
              {eyebrow}
            </div>
          )}
          <h1 className="mt-3 text-4xl md:text-6xl font-heading font-bold leading-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-5 text-lg text-white/80 max-w-2xl leading-relaxed">{description}</p>
          )}
        </div>
      </div>
    </section>
  );
}
