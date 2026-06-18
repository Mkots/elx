import { extractYaml } from "@std/front-matter";

export interface WikiFrontMatter {
  id?: string;
  type?: string;
  name?: string;
  description?: string;
  specification?: string;
  status?: string;
  refines?: string[];
  depends_on?: string[];
  justifies?: string[];
  supersedes?: string[];
  verifies?: string[];
}

export interface SourcePage {
  sourcePath: string;
  pageName: string;
  title: string;
  body: string;
  frontMatter: WikiFrontMatter | null;
}

export interface WikiBuildOptions {
  repoUrl?: string;
  revision?: string;
}

const DEFAULT_REPO_URL = "https://github.com/Mkots/elx";

const PAGE_NAME_OVERRIDES: Record<string, string> = {
  "Home.md": "Home",
  "idea.md": "Project-Idea",
  "roadmap/index.md": "Roadmap",
  "roadmap/00-data-seeding.md": "Stage-0-Question-Bank",
  "roadmap/01-lextale-core.md": "Stage-1-Core-LexTALE",
  "roadmap/02-scoring-verification.md": "Stage-2-Verification-and-Scoring",
  "roadmap/03-synonyms-antonyms.md": "Stage-3-Synonyms-and-Antonyms",
  "roadmap/04-spelling.md": "Stage-4-Contextual-Spelling",
  "roadmap/05-meaning.md": "Stage-5-Meaning",
  "roadmap/06-semantic-usage.md": "Stage-6-Semantic-Usage",
  "tech-details/index.md": "Technical-Details",
  "tech-details/tech-stack.md": "Technology-Stack",
  "tech-details/ops-tech-stack.md": "Operations-Stack",
  "tech-details/test-tech-stack.md": "Test-Stack",
  "requirements/README.md": "Requirements-SARA",
  "requirements/requirements/index.md": "Requirements",
  "requirements/decisions/index.md": "Decisions",
  "requirements/solutions/index.md": "Solutions",
  "requirements/verifications/index.md": "Verifications",
};

const SIDEBAR_SECTIONS = [
  {
    title: "Overview",
    items: [
      ["Home", "Home.md"],
      ["Project Idea", "idea.md"],
      ["Roadmap", "roadmap/index.md"],
      ["Technical Details", "tech-details/index.md"],
    ],
  },
  {
    title: "Reference",
    items: [
      ["Requirements", "requirements/requirements/index.md"],
      ["Solutions", "requirements/solutions/index.md"],
      ["Decisions", "requirements/decisions/index.md"],
      ["Verifications", "requirements/verifications/index.md"],
      ["Requirements SARA", "requirements/README.md"],
    ],
  },
  {
    title: "Key Pages",
    items: [
      ["SOL-LEXTALE", "requirements/solutions/SOL-LEXTALE.md"],
      ["REQ-WORD-SELECTION", "requirements/requirements/REQ-WORD-SELECTION.md"],
      [
        "REQ-VERIFICATION-SCORING",
        "requirements/requirements/REQ-VERIFICATION-SCORING.md",
      ],
      [
        "ADR-SSR-ARCHITECTURE",
        "requirements/decisions/ADR-SSR-ARCHITECTURE.md",
      ],
      ["REQ-QUALITY-GATES", "requirements/requirements/REQ-QUALITY-GATES.md"],
    ],
  },
] as const;

export async function buildWiki(
  docsDir: string,
  outputDir: string,
  options: WikiBuildOptions = {},
): Promise<void> {
  const repoUrl = stripTrailingSlash(options.repoUrl ?? DEFAULT_REPO_URL);
  const revision = options.revision ?? "main";

  await ensureDirectory(outputDir);
  await emptyDirectory(outputDir);

  const pages = await loadPages(docsDir);
  const pageNamesBySourcePath = new Map<string, string>();
  const pageNamesById = new Map<string, string>();
  const pageNamesInUse = new Map<string, string>();

  for (const page of pages) {
    const existingSource = pageNamesInUse.get(page.pageName);
    if (existingSource && existingSource !== page.sourcePath) {
      throw new Error(
        `duplicate wiki page name "${page.pageName}" for ${existingSource} and ${page.sourcePath}`,
      );
    }

    pageNamesInUse.set(page.pageName, page.sourcePath);
    pageNamesBySourcePath.set(page.sourcePath, page.pageName);

    const pageId = asString(page.frontMatter?.id);
    if (pageId) {
      const existingPage = pageNamesById.get(pageId);
      if (existingPage && existingPage !== page.pageName) {
        throw new Error(
          `duplicate frontmatter id "${pageId}" for ${existingPage} and ${page.pageName}`,
        );
      }

      pageNamesById.set(pageId, page.pageName);
    }
  }

  for (const page of pages) {
    const content = renderWikiPage(page, {
      pageNamesBySourcePath,
      pageNamesById,
      repoUrl,
      revision,
    });

    await Deno.writeTextFile(
      `${outputDir}/${page.pageName}.md`,
      content,
    );
  }

  await Deno.writeTextFile(
    `${outputDir}/_Sidebar.md`,
    renderWikiSidebar(pageNamesBySourcePath),
  );
  await Deno.writeTextFile(
    `${outputDir}/_Footer.md`,
    renderWikiFooter(repoUrl, revision),
  );
}

export function derivePageName(relativePath: string, title?: string): string {
  const normalizedPath = normalizeDocPath(relativePath);
  const override = PAGE_NAME_OVERRIDES[normalizedPath];
  if (override) return override;

  const fileName = basename(normalizedPath, ".md");
  if (/^(ADR|REQ|SOL|VER)-/.test(fileName)) {
    return fileName;
  }

  if (title) {
    return slugify(title);
  }

  return slugify(fileName);
}

export function renderWikiPage(
  page: SourcePage,
  context: {
    pageNamesBySourcePath: Map<string, string>;
    pageNamesById: Map<string, string>;
    repoUrl: string;
    revision: string;
  },
): string {
  const sourceAwareBody = ensureHeading(page.body, page.title);
  const rewrittenBody = rewriteLinks(
    sourceAwareBody,
    page.sourcePath,
    context.pageNamesBySourcePath,
    context.pageNamesById,
  );
  const metadata = renderMetadata(page.frontMatter, context.pageNamesById);
  const bodyWithMetadata = insertAfterHeading(rewrittenBody, metadata);
  const sourceLink = renderSourceLink(
    page.sourcePath,
    context.repoUrl,
    context.revision,
  );

  return `${bodyWithMetadata.trimEnd()}\n\n---\n\n${sourceLink}\n`;
}

function renderMetadata(
  frontMatter: WikiFrontMatter | null,
  pageNamesById: Map<string, string>,
): string | null {
  if (!frontMatter) return null;

  const rows: string[] = [];
  const id = asString(frontMatter.id);
  const type = asString(frontMatter.type);
  const status = asString(frontMatter.status);
  const description = normalizeInlineText(frontMatter.description);
  const specification = normalizeInlineText(frontMatter.specification);
  const refines = renderRelationList(frontMatter.refines, pageNamesById);
  const dependsOn = renderRelationList(frontMatter.depends_on, pageNamesById);
  const justifies = renderRelationList(frontMatter.justifies, pageNamesById);
  const supersedes = renderRelationList(frontMatter.supersedes, pageNamesById);
  const verifies = renderRelationList(frontMatter.verifies, pageNamesById);

  if (id) rows.push(`- ID: \`${id}\``);
  if (type) rows.push(`- Type: \`${type}\``);
  if (status) rows.push(`- Status: \`${status}\``);
  if (description) rows.push(`- Description: ${description}`);
  if (specification) rows.push(`- Specification: ${specification}`);
  if (refines) rows.push(`- Refines: ${refines}`);
  if (dependsOn) rows.push(`- Depends on: ${dependsOn}`);
  if (justifies) rows.push(`- Justifies: ${justifies}`);
  if (supersedes) rows.push(`- Supersedes: ${supersedes}`);
  if (verifies) rows.push(`- Verifies: ${verifies}`);

  if (rows.length === 0) return null;

  return `## Metadata\n\n${rows.join("\n")}`;
}

function renderRelationList(
  value: unknown,
  pageNamesById: Map<string, string>,
): string | null {
  const values = asStringArray(value);
  if (values.length === 0) return null;

  return values.map((entry) => {
    const pageName = pageNamesById.get(entry);
    if (!pageName) {
      return `\`${entry}\``;
    }

    return `[${entry}](${pageName})`;
  }).join(", ");
}

export function renderWikiSidebar(
  pageNamesBySourcePath: Map<string, string>,
): string {
  const lines: string[] = ["# ELX Wiki"];

  for (const section of SIDEBAR_SECTIONS) {
    lines.push("", `## ${section.title}`, "");

    for (const [label, sourcePath] of section.items) {
      const pageName = pageNamesBySourcePath.get(sourcePath);
      if (!pageName) continue;

      lines.push(`- [${label}](${pageName})`);
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function renderWikiFooter(repoUrl: string, revision: string): string {
  const shortRevision = revision.slice(0, 12);

  return [
    "---",
    `Generated from [\`docs/\`](${repoUrl}/tree/${revision}/docs) in [\`Mkots/elx\`](${repoUrl}/tree/${revision}).`,
    `Source revision: \`${shortRevision}\`.`,
    "",
  ].join("\n");
}

function renderSourceLink(
  sourcePath: string,
  repoUrl: string,
  revision: string,
): string {
  return `Source: [\`docs/${sourcePath}\`](${repoUrl}/blob/${revision}/docs/${sourcePath})`;
}

function ensureHeading(body: string, title: string): string {
  const trimmedBody = stripLeadingBlankLines(body).trimEnd();
  if (/^#\s+/.test(trimmedBody)) {
    return `${trimmedBody}\n`;
  }

  return `# ${title}\n\n${trimmedBody}\n`;
}

function insertAfterHeading(body: string, metadata: string | null): string {
  if (!metadata) return body.trimEnd();

  const headingMatch = body.match(/^# .+\n/);
  if (!headingMatch) {
    return `${metadata}\n\n${body.trimStart()}`.trimEnd();
  }

  const heading = headingMatch[0].trimEnd();
  const rest = body.slice(headingMatch[0].length).replace(/^\n+/, "");

  if (rest.length === 0) {
    return `${heading}\n\n${metadata}`.trimEnd();
  }

  return `${heading}\n\n${metadata}\n\n${rest}`.trimEnd();
}

function rewriteLinks(
  input: string,
  currentSourcePath: string,
  pageNamesBySourcePath: Map<string, string>,
  pageNamesById: Map<string, string>,
): string {
  const markdownLinks = input.replaceAll(
    /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g,
    (match, label: string, target: string) => {
      if (isExternalTarget(target)) return match;

      const rewrittenTarget = resolveMarkdownTarget(
        currentSourcePath,
        target,
        pageNamesBySourcePath,
      );

      if (!rewrittenTarget) return match;

      return `[${label}](${rewrittenTarget})`;
    },
  );

  return markdownLinks.replaceAll(
    /\[\[([^[\]|]+?)(?:\|([^[\]]+))?\]\]/g,
    (match, target: string, label?: string) => {
      const trimmedTarget = target.trim();
      const pageName = pageNamesById.get(trimmedTarget) ??
        pageNamesBySourcePath.get(normalizeDocPath(trimmedTarget));
      if (!pageName) return match;

      const linkLabel = label?.trim() || trimmedTarget;
      return `[${linkLabel}](${pageName})`;
    },
  );
}

function resolveMarkdownTarget(
  currentSourcePath: string,
  target: string,
  pageNamesBySourcePath: Map<string, string>,
): string | null {
  const [targetPath, anchor] = splitAnchor(target);
  if (!targetPath) return null;

  const resolvedTarget = resolveSourcePath(currentSourcePath, targetPath);
  const directMatch = pageNamesBySourcePath.get(resolvedTarget);
  if (directMatch) {
    return `${directMatch}${anchor}`;
  }

  if (!targetPath.endsWith(".md")) {
    const markdownTarget = pageNamesBySourcePath.get(`${resolvedTarget}.md`);
    if (markdownTarget) {
      return `${markdownTarget}${anchor}`;
    }
  }

  return null;
}

function splitAnchor(target: string): [string, string] {
  const hashIndex = target.indexOf("#");
  if (hashIndex === -1) return [target, ""];

  return [target.slice(0, hashIndex), target.slice(hashIndex)];
}

async function loadPages(docsDir: string): Promise<SourcePage[]> {
  const files = await collectMarkdownFiles(docsDir);
  const pages: SourcePage[] = [];

  for (const sourcePath of files) {
    const raw = await Deno.readTextFile(`${docsDir}/${sourcePath}`);
    const { frontMatter, body } = parseSourceDocument(raw);
    const existingTitle = extractTitle(body);
    const pageName = derivePageName(sourcePath, existingTitle ?? undefined);
    const title = existingTitle ?? pageName.replaceAll("-", " ");

    pages.push({
      sourcePath,
      pageName,
      title,
      body,
      frontMatter,
    });
  }

  return pages;
}

function parseSourceDocument(
  source: string,
): { frontMatter: WikiFrontMatter | null; body: string } {
  if (!source.startsWith("---\n")) {
    return { frontMatter: null, body: source };
  }

  const extracted = extractYaml<Record<string, unknown>>(source);
  const attrs = isRecord(extracted.attrs)
    ? extracted.attrs as WikiFrontMatter
    : null;

  return {
    frontMatter: attrs,
    body: stripLeadingBlankLines(extracted.body),
  };
}

function extractTitle(body: string): string | null {
  const match = stripLeadingBlankLines(body).match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

async function collectMarkdownFiles(rootDir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string, relativeDir = ""): Promise<void> {
    const entries = [];
    for await (const entry of Deno.readDir(currentDir)) {
      entries.push(entry);
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const relativePath = relativeDir
        ? `${relativeDir}/${entry.name}`
        : entry.name;
      const fullPath = `${currentDir}/${entry.name}`;

      if (entry.isDirectory) {
        await walk(fullPath, relativePath);
        continue;
      }

      if (entry.isFile && entry.name.endsWith(".md")) {
        files.push(relativePath);
      }
    }
  }

  await walk(rootDir);
  return files;
}

async function ensureDirectory(path: string): Promise<void> {
  await Deno.mkdir(path, { recursive: true });
}

async function emptyDirectory(path: string): Promise<void> {
  for await (const entry of Deno.readDir(path)) {
    if (entry.name === ".git") continue;

    await Deno.remove(`${path}/${entry.name}`, { recursive: true });
  }
}

function resolveSourcePath(
  currentSourcePath: string,
  targetPath: string,
): string {
  if (targetPath.startsWith("/")) {
    return normalizeDocPath(targetPath.slice(1));
  }

  const currentDir = dirname(currentSourcePath);
  if (!currentDir) {
    return normalizeDocPath(targetPath);
  }

  return normalizeDocPath(`${currentDir}/${targetPath}`);
}

function normalizeDocPath(path: string): string {
  const parts = path.replaceAll("\\", "/").split("/");
  const normalized: string[] = [];

  for (const part of parts) {
    if (part === "" || part === ".") continue;

    if (part === "..") {
      if (normalized.length > 0) normalized.pop();
      continue;
    }

    normalized.push(part);
  }

  return normalized.join("/");
}

function dirname(path: string): string {
  const normalizedPath = normalizeDocPath(path);
  const index = normalizedPath.lastIndexOf("/");
  if (index === -1) return "";

  return normalizedPath.slice(0, index);
}

function basename(path: string, suffix = ""): string {
  const normalizedPath = normalizeDocPath(path);
  const index = normalizedPath.lastIndexOf("/");
  const fileName = index === -1
    ? normalizedPath
    : normalizedPath.slice(index + 1);

  return suffix && fileName.endsWith(suffix)
    ? fileName.slice(0, -suffix.length)
    : fileName;
}

function slugify(input: string): string {
  return input
    .replaceAll(/[`*_]/g, "")
    .replaceAll(/&/g, " and ")
    .replaceAll(/[^A-Za-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .replaceAll(/-{2,}/g, "-");
}

function stripLeadingBlankLines(input: string): string {
  return input.replace(/^\s*\n/, "");
}

function normalizeInlineText(value: unknown): string | null {
  const text = asString(value);
  if (!text) return null;

  return text.replace(/\s+/g, " ").trim();
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter((entry): entry is string =>
    typeof entry === "string" && entry.trim() !== ""
  ).map((entry) => entry.trim());
}

function isExternalTarget(target: string): boolean {
  return target.startsWith("http://") || target.startsWith("https://") ||
    target.startsWith("mailto:") || target.startsWith("#");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

if (import.meta.main) {
  if (Deno.args.length !== 2) {
    console.error("usage: build_wiki.ts <docs-dir> <output-dir>");
    Deno.exit(1);
  }

  const [docsDir, outputDir] = Deno.args;
  const repoUrl = Deno.env.get("WIKI_SOURCE_REPO_URL") ?? DEFAULT_REPO_URL;
  const revision = Deno.env.get("WIKI_SOURCE_REVISION") ??
    Deno.env.get("GITHUB_SHA") ?? "main";

  await buildWiki(docsDir, outputDir, { repoUrl, revision });
}
