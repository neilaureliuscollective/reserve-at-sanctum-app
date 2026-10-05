"use client";
export function AetheliosOrb({
  compact = false,
  active = false,
}: {
  compact?: boolean;
  active?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`aethelios-orb ${compact ? "orb-compact" : ""} ${active ? "orb-active" : ""}`}
    >
      <span className="orb-atmosphere" />
      <span className="orb-ring orb-ring-one" />
      <span className="orb-ring orb-ring-two" />
      <span className="orb-core">
        <span className="orb-meridian" />
        <span className="orb-light" />
      </span>
      <span className="orb-satellite" />
    </span>
  );
}
