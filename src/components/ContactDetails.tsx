import { InstagramIcon, MailIcon, ShareIcon } from "./Icons";
import { CONTACT_EMAIL, SOCIALS } from "@/data/site";

/**
 * "Have Questions? / Get in Touch" block, using the marketing site's design:
 * a circular accent icon then the info on two lines. LinkedIn intentionally
 * omitted from Get in Touch (kept in the footer only).
 */
export default function ContactDetails() {
  return (
    <div className="max-w-2xl">
      <h2 className="text-[clamp(1.75rem,3.4vw,3rem)] leading-[1.26] font-semibold">
        Have Questions?
        <br />
        Get in Touch
      </h2>
      <p className="mt-6 text-tsm text-muted">
        Contact us with any questions you have about the recruiting process.
      </p>

      <a
        href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Question about Texas Accelerate")}`}
        className="group mt-10 flex items-center gap-5 border-b border-white/12 pb-7"
      >
        <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-ink transition-transform group-hover:scale-105">
          <MailIcon className="h-6 w-6" />
        </span>
        <span>
          <span className="block text-tsm text-muted">Email</span>
          <span className="block text-txl font-medium transition-colors group-hover:text-accent">
            {CONTACT_EMAIL}
          </span>
        </span>
      </a>

      <a
        href={SOCIALS.instagram}
        target="_blank"
        rel="noreferrer"
        className="group flex items-center gap-5 border-b border-white/12 py-7"
      >
        <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-ink transition-transform group-hover:scale-105">
          <ShareIcon className="h-6 w-6" />
        </span>
        <span>
          <span className="block text-tsm text-muted">Follow Us</span>
          <span className="block text-txl font-medium transition-colors group-hover:text-accent">
            @texasaccelerate
          </span>
        </span>
      </a>
    </div>
  );
}
