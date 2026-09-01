import Link from "next/link";

/** The accent apply-now bar used at the bottom of public pages. */
export default function ApplyBar() {
  return (
    <section className="shell pt-16 lg:pt-24">
      <div className="flex flex-col items-start gap-6 rounded-[32px] bg-accent p-8 text-ink sm:flex-row sm:items-center sm:justify-between lg:rounded-[48px] lg:p-12">
        <div>
          <h2 className="t-card-title">Applications are open.</h2>
          <p className="t-body mt-2 text-muted-ink">
            Sign in with your Google account, check in at your events, and apply.
          </p>
        </div>
        <Link href="/apply" className="pill pill-dark shrink-0">
          Apply now
          <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
