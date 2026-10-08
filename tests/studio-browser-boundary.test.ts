import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import ts from "typescript";
import { BookingError as BookingErrorFromBooking } from "../lib/booking";
import { BookingError } from "../lib/booking-error";

test("browser Studio permissions cannot import Node-only runtime dependencies", () => {
  const seen = new Set<string>();
  function visit(file: string) {
    if (seen.has(file)) return;
    seen.add(file);
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    for (const node of source.statements) {
      if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node))
        continue;
      if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier))
        continue;
      if (ts.isImportDeclaration(node)) {
        const clause = node.importClause;
        if (clause?.isTypeOnly) continue;
        if (
          clause?.namedBindings &&
          ts.isNamedImports(clause.namedBindings) &&
          !clause.name &&
          clause.namedBindings.elements.every((e) => e.isTypeOnly)
        )
          continue;
      } else if (node.isTypeOnly) continue;
      const name = node.moduleSpecifier.text;
      assert.ok(
        !name.startsWith("node:"),
        `${file} pulls ${name} into the browser`,
      );
      assert.ok(
        name.startsWith("."),
        `Review new runtime dependency ${name} for browser compatibility`,
      );
      visit(resolve(dirname(file), name + ".ts"));
    }
  }
  visit(resolve("lib/studio-permissions.ts"));
  assert.ok(seen.size > 0);
});
test("server booking retains the shared error identity and HTTP status contract", () => {
  assert.equal(BookingErrorFromBooking, BookingError);
  const e = new BookingErrorFromBooking("Denied", 403);
  assert.ok(e instanceof BookingError);
  assert.equal(e.status, 403);
});
