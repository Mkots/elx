import { assert } from "@std/assert";

/**
 * Keeps the agent-facing docs (AGENTS.md, skills) from drifting out of sync
 * with the repo. If one of these fails, update AGENTS.md or the skill —
 * see docs/tech-details/agent-tooling.md.
 */

const root = new URL("..", import.meta.url);
const agentsMd = Deno.readTextFileSync(new URL("AGENTS.md", root));

/** Directories that legitimately stay out of the AGENTS.md file map. */
const FILE_MAP_EXEMPT = new Set([
  "node_modules",
  "coverage",
  "test-results",
  "playwright-report",
  "static",
]);

function containsSource(dir: URL): boolean {
  for (const entry of Deno.readDirSync(dir)) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    if (entry.isFile && /\.(ts|tsx)$/.test(entry.name)) return true;
    if (
      entry.isDirectory && containsSource(new URL(`${entry.name}/`, dir))
    ) return true;
  }
  return false;
}

Deno.test("AGENTS.md file map covers every top-level source directory", () => {
  for (const entry of Deno.readDirSync(root)) {
    if (!entry.isDirectory) continue;
    if (entry.name.startsWith(".") || FILE_MAP_EXEMPT.has(entry.name)) continue;
    if (!containsSource(new URL(`${entry.name}/`, root))) continue;
    assert(
      agentsMd.includes(`${entry.name}/`),
      `AGENTS.md file map is missing the top-level directory "${entry.name}/"`,
    );
  }
});

Deno.test("every deno task referenced in AGENTS.md exists in deno.json", () => {
  const { tasks } = JSON.parse(
    Deno.readTextFileSync(new URL("deno.json", root)),
  ) as { tasks: Record<string, string> };
  const taskRefs = agentsMd.matchAll(
    /deno task (?:--\S+ )*([a-z][a-z0-9:_-]*)/g,
  );
  for (const [, name] of taskRefs) {
    assert(
      name in tasks,
      `AGENTS.md references "deno task ${name}" but deno.json has no such task`,
    );
  }
});

Deno.test("every deno task referenced in workflows exists in deno.json", () => {
  const { tasks } = JSON.parse(
    Deno.readTextFileSync(new URL("deno.json", root)),
  ) as { tasks: Record<string, string> };
  const workflowsDir = new URL(".github/workflows/", root);
  for (const entry of Deno.readDirSync(workflowsDir)) {
    if (!entry.isFile || !/\.ya?ml$/.test(entry.name)) continue;
    const yaml = Deno.readTextFileSync(new URL(entry.name, workflowsDir));
    const refs = [
      // literal `deno task <name>` invocations
      ...yaml.matchAll(/deno task (?:--\S+ )*([a-z][a-z0-9:_-]*)/g),
      // seed.yaml workflow_dispatch choices, forwarded to `deno task`
      ...yaml.matchAll(/^\s+- (seed:[a-z0-9:_-]+)$/gm),
    ];
    for (const [, name] of refs) {
      assert(
        name in tasks,
        `${entry.name} references "deno task ${name}" but deno.json has no such task`,
      );
    }
  }
});

Deno.test("every skill has SKILL.md frontmatter and is listed in AGENTS.md", () => {
  const skillsDir = new URL(".agents/skills/", root);
  for (const entry of Deno.readDirSync(skillsDir)) {
    if (!entry.isDirectory) continue;
    const skillMd = Deno.readTextFileSync(
      new URL(`${entry.name}/SKILL.md`, skillsDir),
    );
    assert(
      skillMd.startsWith("---\n"),
      `${entry.name}/SKILL.md must start with YAML frontmatter`,
    );
    assert(
      /^name: /m.test(skillMd) && /^description: /m.test(skillMd),
      `${entry.name}/SKILL.md frontmatter needs "name:" and "description:"`,
    );
    assert(
      agentsMd.includes(`\`${entry.name}\``),
      `AGENTS.md "Skills" section is missing \`${entry.name}\``,
    );
  }
});

Deno.test("CLAUDE.md is a symlink resolving to AGENTS.md", () => {
  const info = Deno.lstatSync(new URL("CLAUDE.md", root));
  assert(info.isSymlink, "CLAUDE.md must be a symlink (single-source docs)");
  const target = Deno.readLinkSync(new URL("CLAUDE.md", root));
  assert(
    target === "AGENTS.md",
    `CLAUDE.md must point at AGENTS.md, found "${target}"`,
  );
});

Deno.test("Playwright version in deno.json matches container tag in e2e.yaml", () => {
  const denoJson = JSON.parse(
    Deno.readTextFileSync(new URL("deno.json", root)),
  ) as { imports: Record<string, string> };
  const playwrightImport = denoJson.imports["@playwright/test"];
  assert(playwrightImport, "@playwright/test not found in deno.json imports");
  const denoVersionMatch = playwrightImport.match(
    /@playwright\/test@(\d+\.\d+\.\d+(?:-\w+)?)/,
  );
  assert(
    denoVersionMatch,
    `Failed to parse version from @playwright/test import: ${playwrightImport}`,
  );
  const denoVersion = denoVersionMatch[1];

  const e2eYaml = Deno.readTextFileSync(
    new URL(".github/workflows/e2e.yaml", root),
  );
  const containerMatch = e2eYaml.match(
    /ghcr\.io\/mkots\/elx-playwright:(\S+)/,
  );
  assert(
    containerMatch,
    "Failed to find ghcr.io/mkots/elx-playwright container in e2e.yaml",
  );
  let containerTag = containerMatch[1];
  if (containerTag.startsWith("v")) {
    containerTag = containerTag.slice(1);
  }

  assert(
    denoVersion === containerTag,
    `Playwright version mismatch: deno.json has ${denoVersion}, but e2e.yaml uses container tag ${containerTag}`,
  );
});
