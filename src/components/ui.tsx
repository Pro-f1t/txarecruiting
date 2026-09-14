/**
 * Stand-in art for photography - on-brand gradient blocks. Copied from the
 * marketing site (Project02) so the field-team cards match one-to-one.
 */
export function PlaceholderArt({
  seed = 0,
  className = "",
  label,
}: {
  seed?: number;
  className?: string;
  label?: string;
}) {
  const gradients = [
    "linear-gradient(135deg,#60a5fa 0%,#1e3a8a 55%,#0b1020 100%)",
    "linear-gradient(140deg,#1e3a8a 0%,#60a5fa 60%,#c7ddff 100%)",
    "linear-gradient(120deg,#0b1020 0%,#3b82f6 50%,#60a5fa 100%)",
    "linear-gradient(160deg,#60a5fa 0%,#0b1020 100%)",
  ];
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: gradients[seed % gradients.length] }}
      role="img"
      aria-label={label ?? "Placeholder image"}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 25%, rgba(255,255,255,.5), transparent 45%), radial-gradient(circle at 75% 80%, rgba(255,255,255,.28), transparent 40%)",
        }}
      />
    </div>
  );
}
