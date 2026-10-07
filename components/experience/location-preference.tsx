"use client";
import { useState } from "react";
export function LocationPreference({
  locations,
  selected,
}: {
  locations: { id: string; label: string }[];
  selected: string;
}) {
  const [value, setValue] = useState(selected),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  if (!locations.length)
    return (
      <p className="member-note">
        Location selection will open when the house is ready.
      </p>
    );
  async function save() {
    setBusy(true);
    setStatus("");
    try {
      const r = await fetch("/api/location-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: value }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setStatus("Preferred house saved.");
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="member-location-form">
      <label htmlFor="preferred-house">Preferred house</label>
      <select
        id="preferred-house"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
      <button className="button button-outline" disabled={busy} onClick={save}>
        {busy ? "Saving…" : "Save preference"}
      </button>
      <p role="status">{status}</p>
    </div>
  );
}
