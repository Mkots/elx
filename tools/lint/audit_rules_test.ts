// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "@std/assert";
import plugin from "./audit_rules.ts";

function runRule(ruleId: string, filename: string, source: string) {
  // Create a minimal plugin structure for runPlugin containing just the target rule
  const singleRulePlugin = {
    name: "audit",
    rules: {
      [ruleId]: plugin.rules[ruleId],
    },
  };
  return Deno.lint.runPlugin(singleRulePlugin, filename, source);
}

function applyFixes(source: string, diagnostics: any[]): string {
  const edits: Array<{ range: [number, number]; text: string }> = [];
  for (const d of diagnostics) {
    if (d.fix) {
      edits.push(...d.fix);
    }
  }

  // Sort edits in descending order of start position
  edits.sort((a, b) => b.range[0] - a.range[0]);

  let result = source;
  for (const edit of edits) {
    const [start, end] = edit.range;
    result = result.slice(0, start) + edit.text + result.slice(end);
  }
  return result;
}

// --- prefer-number-static ---
Deno.test("audit/prefer-number-static: passes correct usages", () => {
  const code = `
    const a = Number.parseInt("10", 10);
    const b = Number.isNaN(NaN);
    const c = Number.parseFloat("1.2");
    const d = Number.isFinite(10);
    const e = Number("10"); // Number coercion
  `;
  const diagnostics = runRule("prefer-number-static", "test.ts", code);
  assertEquals(diagnostics.length, 0);
});

Deno.test("audit/prefer-number-static: flags and fixes global usages", () => {
  const code = `
    const a = parseInt("10", 10);
    const b = isNaN(NaN);
    const c = parseFloat("1.2");
    const d = isFinite(10);
  `;
  const diagnostics = runRule("prefer-number-static", "test.ts", code);
  assertEquals(diagnostics.length, 4);

  assertEquals(diagnostics[0].id, "audit/prefer-number-static");
  assertEquals(
    diagnostics[0].message,
    "Use 'Number.parseInt' instead of global 'parseInt'",
  );

  const fixed = applyFixes(code, diagnostics);
  assertEquals(
    fixed,
    `
    const a = Number.parseInt("10", 10);
    const b = Number.isNaN(NaN);
    const c = Number.parseFloat("1.2");
    const d = Number.isFinite(10);
  `,
  );
});

// --- require-sort-compare ---
Deno.test("audit/require-sort-compare: passes sorted calls with compare functions or JSON.stringify exemption", () => {
  const code = `
    const a = words.sort((a, b) => a.localeCompare(b));
    const b = nums.toSorted((a, b) => a - b);
    
    // JSON.stringify idiom exemptions
    const match1 = JSON.stringify(words.sort()) === JSON.stringify(otherWords.sort());
    const match2 = JSON.stringify(words.toSorted()) !== JSON.stringify(otherWords.toSorted());
  `;
  const diagnostics = runRule("require-sort-compare", "test.ts", code);
  assertEquals(diagnostics.length, 0);
});

Deno.test("audit/require-sort-compare: flags and fixes zero-arg sort/toSorted calls", () => {
  const code = `
    const a = words.sort();
    const b = nums.sort();
    const c = words.toSorted();
    const d = nums.toSorted();
  `;
  const diagnostics = runRule("require-sort-compare", "test.ts", code);
  assertEquals(diagnostics.length, 4);

  assertEquals(diagnostics[0].id, "audit/require-sort-compare");

  const fixed = applyFixes(code, diagnostics);
  assertEquals(
    fixed,
    `
    const a = words.sort((a, b) => String(a).localeCompare(String(b)));
    const b = nums.sort((a, b) => a - b);
    const c = words.toSorted((a, b) => String(a).localeCompare(String(b)));
    const d = nums.toSorted((a, b) => a - b);
  `,
  );
});

// --- prefer-replace-all ---
Deno.test("audit/prefer-replace-all: passes replace with non-global regex, strings, or replaceAll", () => {
  const code = `
    const a = text.replace("a", "b");
    const b = text.replace(/a/, "b");
    const c = text.replaceAll(/a/g, "b");
  `;
  const diagnostics = runRule("prefer-replace-all", "test.ts", code);
  assertEquals(diagnostics.length, 0);
});

Deno.test("audit/prefer-replace-all: flags and fixes replace with global regex", () => {
  const code = `
    const a = text.replace(/a/g, "b");
  `;
  const diagnostics = runRule("prefer-replace-all", "test.ts", code);
  assertEquals(diagnostics.length, 1);
  assertEquals(diagnostics[0].id, "audit/prefer-replace-all");

  const fixed = applyFixes(code, diagnostics);
  assertEquals(
    fixed,
    `
    const a = text.replaceAll(/a/g, "b");
  `,
  );
});

// --- require-new-array ---
Deno.test("audit/require-new-array: passes new Array, coercion functions, static methods", () => {
  const code = `
    const a = new Array(10);
    const b = Number(10);
    const c = String(10);
    const d = Array.from([1, 2]);
  `;
  const diagnostics = runRule("require-new-array", "test.ts", code);
  assertEquals(diagnostics.length, 0);
});

Deno.test("audit/require-new-array: flags and fixes Array calls without new", () => {
  const code = `
    const a = Array(10);
  `;
  const diagnostics = runRule("require-new-array", "test.ts", code);
  assertEquals(diagnostics.length, 1);
  assertEquals(diagnostics[0].id, "audit/require-new-array");

  const fixed = applyFixes(code, diagnostics);
  assertEquals(
    fixed,
    `
    const a = new Array(10);
  `,
  );
});
