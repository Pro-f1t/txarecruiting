const FAQS = [
  { q: "Why can't I log in?", a: "You have to sign in with your UT Google account — your @utexas.edu UTMail address, not a personal Gmail. If you don't have one yet, set it up at get.utmail.utexas.edu, then come back and log in with it." },
  { q: "Who can apply?", a: "Any UT Austin student with a @utexas.edu account. Sign in with Google to get started." },
  { q: "Do I have to attend events first?", a: "Yes — attend one info session and one coffee chat, then check in from your dashboard to submit your application." },
  { q: "Can I apply to more than one field team?", a: "Yes. You can apply to any of the six field teams, and you can be accepted to more than one." },
  { q: "What's the difference between member and lead?", a: "You can apply as a member and/or as a lead of a team. Lead applicants still answer the normal questions, and are reviewed separately — a lead decision never affects your member application." },
  { q: "When will I hear back?", a: "Everyone hears back on a single decision release date after interviews. See the Timeline page." },
];

export default function FaqPage() {
  return (
    <section className="shell pt-28 pb-24">
      <p className="t-eyebrow">FAQ</p>
      <h1 className="h-display mt-3 max-w-[20ch]">Questions, answered.</h1>
      <div className="mt-12 space-y-4">
        {FAQS.map((f) => (
          <div key={f.q} className="card p-7">
            <h2 className="t-card-title">{f.q}</h2>
            <p className="t-body mt-3 text-muted">{f.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
