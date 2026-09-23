import { chairSummary } from "@/lib/chair";
export function ChairSummary({
  value,
}: {
  value: Parameters<typeof chairSummary>[0];
}) {
  return (
    <dl className="chair-summary">
      {chairSummary(value).map(([label, text]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{text}</dd>
        </div>
      ))}
    </dl>
  );
}
