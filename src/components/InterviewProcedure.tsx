// Renders the interviewer procedure with light formatting: blank lines split
// paragraphs, "* " / "- " lines are bullets, "1." lines are numbered, and
// **bold** works anywhere. Nothing else - it's meant to be pasted, not authored.
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-semibold text-white">{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>))}</>;
}

export default function InterviewProcedure({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  return (
    <div className="card p-7" style={{ border: "1px solid color-mix(in srgb, var(--color-accent) 40%, transparent)" }}>
      <p className="t-eyebrow">Interview procedure</p>
      <div className="mt-4 space-y-4 text-[14px] leading-relaxed text-muted">
        {blocks.map((block, bi) => {
          const lines = block.split("\n");
          if (lines.every((l) => /^\s*[*-]\s+/.test(l))) {
            return <ul key={bi} className="list-disc space-y-1 pl-5">{lines.map((l, li) => <li key={li}><Inline text={l.replace(/^\s*[*-]\s+/, "")} /></li>)}</ul>;
          }
          if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
            return <ol key={bi} className="list-decimal space-y-1.5 pl-6">{lines.map((l, li) => <li key={li}><Inline text={l.replace(/^\s*\d+[.)]\s+/, "")} /></li>)}</ol>;
          }
          return <p key={bi} className="whitespace-pre-wrap">{lines.map((l, li) => <span key={li}>{li > 0 && <br />}<Inline text={l} /></span>)}</p>;
        })}
      </div>
    </div>
  );
}
