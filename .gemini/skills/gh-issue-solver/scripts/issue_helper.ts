/**
 * Helper script for gh-issue-solver skill.
 * Handles branch name generation and issue formatting.
 */

import { parseArgs } from "jsr:@std/cli/parse-args";

const args = parseArgs(Deno.args, {
  string: ["action", "title", "number"],
});

if (args.action === "branch-name") {
  const title = args.title || "";
  const number = args.number || "";

  if (!title || !number) {
    console.error("Error: title and number are required for branch-name action");
    Deno.exit(1);
  }

  const sanitizedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  console.log(`issue-${number}-${sanitizedTitle}`);
} else if (args.action === "format-list") {
    // We could add custom formatting here if needed,
    // but gh issue list is already quite good.
    // This is just a placeholder for potential future complexity.
    console.log("Formatting logic here if needed");
} else {
  console.log("Usage: deno run issue_helper.ts --action branch-name --title \"Issue Title\" --number 123");
}
