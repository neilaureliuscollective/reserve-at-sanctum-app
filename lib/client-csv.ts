/** Small RFC-style CSV reader for pilot contact exports. No code or formulas execute. */
export function parseClientCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  if (text.length > 14000)
    throw Error("Use a small pilot export, up to 20 clients.");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw Error("A quoted field is unfinished.");
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  const headers = (rows.shift() || []).map((h) =>
    h
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase(),
  );
  if (!headers.includes("name") || !headers.includes("source_key"))
    throw Error(
      "CSV needs name and source_key columns. Optional columns: email, phone.",
    );
  if (rows.length > 20) throw Error("Import up to 20 pilot clients at a time.");
  return rows.map((r) => ({
    name: r[headers.indexOf("name")]?.trim() || "",
    email: r[headers.indexOf("email")]?.trim() || "",
    phone: r[headers.indexOf("phone")]?.trim() || "",
    sourceKey: r[headers.indexOf("source_key")]?.trim() || "",
  }));
}
