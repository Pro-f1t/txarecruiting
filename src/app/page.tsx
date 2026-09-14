import DarkVeil from "@/components/DarkVeil";
import { PlaceholderArt } from "@/components/ui";
import { FIELD_TEAMS } from "@/data/fieldTeams";
import Link from "next/link";
import ApplyBar from "@/components/ApplyBar";

export default function Home() {
  return (
    <>
      {/* Hero - the looping WebGL veil, one-to-one with the marketing site. */}
      <section className="relative isolate flex min-h-svh items-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <DarkVeil speed={2} />
        </div>

        <div className="shell w-full">
          <p className="t-eyebrow mb-6">Texas Accelerate · Recruiting</p>
          <h1 className="h-hero">
            <span className="text-accent">Apply now</span> to
            <br />
            Texas Accelerate
          </h1>
          <p className="t-body mt-6 max-w-[58ch] text-muted">
            Applications for Texas Accelerate are now open. Attend an info session and a coffee
            chat, then apply to the field teams that fit you - as a member, a lead, or both.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/dashboard" className="pill pill-blue">Get started</Link>
            <Link href="/timeline" className="pill pill-ghost">Timeline</Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="shell pt-16 lg:pt-24">
        <h2 className="h-display">How it works</h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-3 lg:mt-14">
          {[
            { n: "01", t: "Attend", d: "Check in at one info session and one coffee chat to submit your application." },
            { n: "02", t: "Apply", d: "Submit to any of the field teams - and apply to lead a team if you want to." },
            { n: "03", t: "Interview & decide", d: "Meet the team, then hear back on a single decision release date." },
          ].map((s) => (
            <div key={s.n} className="card p-7">
              <p className="t-eyebrow">{s.n}</p>
              <h3 className="t-card-title mt-3">{s.t}</h3>
              <p className="t-body mt-3 text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Field teams - scrollable cards, copied one-to-one from the marketing site. */}
      <section className="shell pt-16 lg:pt-24">
        <h2 className="h-display">Pick your field team</h2>
        <p className="t-body mt-4 text-white">
          Six field teams span the work our partners need. Apply to any that fit - as a
          member, a lead, or both.
        </p>

        {/* One horizontally-scrolling row at every breakpoint. `bleed-x` cancels
            the shell padding so cards run off both edges; `shell-x` puts the same
            padding back inside so the first card lines up with the heading. */}
        <div className="bleed-x shell-x mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 lg:mt-14 lg:gap-[30px]">
          {FIELD_TEAMS.map((t) => (
            <article
              key={t.name}
              className="group flex aspect-[447/634] w-[219px] shrink-0 snap-start flex-col rounded-[32px] bg-surface p-4 transition-colors duration-300 hover:bg-accent sm:w-[300px] sm:p-6 lg:w-[340px]"
            >
              <h3 className="line-clamp-2 min-h-[36px] whitespace-pre-line text-[15px] leading-[1.2] font-bold tracking-[-0.02em] transition-colors duration-300 group-hover:text-ink lg:min-h-[63px] lg:text-[26px]">
                {t.title}
              </h3>
              <p className="mt-1.5 line-clamp-2 min-h-[31px] text-[11px] leading-[1.4] text-muted transition-colors duration-300 group-hover:text-muted-ink lg:mt-2 lg:min-h-[40px] lg:text-tsm">
                {t.subtitle}
              </p>
              <PlaceholderArt
                seed={t.seed}
                label={t.name}
                className="mt-3 min-h-0 w-full flex-1 rounded-[16px] lg:mt-5 lg:rounded-[20px]"
              />
            </article>
          ))}
        </div>
      </section>

      {/* Apply-now bar */}
      <ApplyBar />
    </>
  );
}
