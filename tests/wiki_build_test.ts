import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  derivePageName,
  renderWikiFooter,
  renderWikiPage,
  renderWikiSidebar,
  type SourcePage,
} from "../scripts/build_wiki.ts";

Deno.test("VER-WIKI-BUILD: derivePageName keeps stable wiki names for published docs", () => {
  assertEquals(derivePageName("Home.md"), "Home");
  assertEquals(derivePageName("idea.md"), "Project-Idea");
  assertEquals(
    derivePageName("requirements/requirements/REQ-WORD-SELECTION.md"),
    "REQ-WORD-SELECTION",
  );
  assertEquals(
    derivePageName("roadmap/index.md", "Roadmap"),
    "Roadmap",
  );
  assertEquals(
    derivePageName("roadmap/01-lextale-core.md"),
    "Stage-1-Core-LexTALE",
  );
});

Deno.test("VER-WIKI-BUILD: renderWikiPage strips frontmatter and rewrites wiki links", () => {
  const pageNamesBySourcePath = new Map<string, string>([
    ["Home.md", "Home"],
    ["idea.md", "Project-Idea"],
    ["requirements/README.md", "Requirements-SARA"],
    ["requirements/solutions/SOL-APP.md", "SOL-APP"],
    ["requirements/requirements/REQ-ALPHA.md", "REQ-ALPHA"],
    ["requirements/requirements/REQ-BETA.md", "REQ-BETA"],
    ["requirements/requirements/index.md", "Requirements"],
  ]);
  const pageNamesById = new Map<string, string>([
    ["SOL-APP", "SOL-APP"],
    ["REQ-ALPHA", "REQ-ALPHA"],
    ["REQ-BETA", "REQ-BETA"],
  ]);

  const page: SourcePage = {
    sourcePath: "requirements/requirements/REQ-ALPHA.md",
    pageName: "REQ-ALPHA",
    title: "Alpha Requirement",
    body: [
      "# Alpha Requirement",
      "",
      "Uses [[SOL-APP]] and [REQ-BETA](REQ-BETA.md).",
      "",
    ].join("\n"),
    frontMatter: {
      id: "REQ-ALPHA",
      type: "requirement",
      specification: "The system SHALL link to the solution and dependency.",
      status: "accepted",
      refines: ["SOL-APP"],
      depends_on: ["REQ-BETA"],
    },
  };

  const rendered = renderWikiPage(page, {
    pageNamesBySourcePath,
    pageNamesById,
    repoUrl: "https://github.com/example/elx",
    revision: "abc1234",
  });

  assertStringIncludes(rendered, "# Alpha Requirement");
  assertStringIncludes(rendered, "## Metadata");
  assertStringIncludes(rendered, "- ID: `REQ-ALPHA`");
  assertStringIncludes(rendered, "- Refines: [SOL-APP](SOL-APP)");
  assertStringIncludes(rendered, "- Depends on: [REQ-BETA](REQ-BETA)");
  assertStringIncludes(
    rendered,
    "Uses [SOL-APP](SOL-APP) and [REQ-BETA](REQ-BETA).",
  );
  assertStringIncludes(
    rendered,
    "Source: [`docs/requirements/requirements/REQ-ALPHA.md`](https://github.com/example/elx/blob/abc1234/docs/requirements/requirements/REQ-ALPHA.md)",
  );
});

Deno.test("VER-WIKI-BUILD: renderWikiPage adds a heading to prose pages without one", () => {
  const page: SourcePage = {
    sourcePath: "idea.md",
    pageName: "Project-Idea",
    title: "Project Idea",
    body: "See [Requirements](requirements/README.md).\n",
    frontMatter: null,
  };

  const rendered = renderWikiPage(page, {
    pageNamesBySourcePath: new Map([
      ["idea.md", "Project-Idea"],
      ["requirements/README.md", "Requirements-SARA"],
    ]),
    pageNamesById: new Map(),
    repoUrl: "https://github.com/example/elx",
    revision: "abc1234",
  });

  assertStringIncludes(rendered, "# Project Idea");
  assertStringIncludes(rendered, "[Requirements](Requirements-SARA)");
});

Deno.test("VER-WIKI-BUILD: renderWikiSidebar and renderWikiFooter use friendly wiki targets", () => {
  const sidebar = renderWikiSidebar(
    new Map<string, string>([
      ["Home.md", "Home"],
      ["idea.md", "Project-Idea"],
      ["roadmap/index.md", "Roadmap"],
      ["tech-details/index.md", "Technical-Details"],
      ["requirements/requirements/index.md", "Requirements"],
      ["requirements/solutions/index.md", "Solutions"],
      ["requirements/decisions/index.md", "Decisions"],
      ["requirements/verifications/index.md", "Verifications"],
      ["requirements/README.md", "Requirements-SARA"],
      ["requirements/solutions/SOL-LEXTALE.md", "SOL-LEXTALE"],
      ["requirements/requirements/REQ-WORD-SELECTION.md", "REQ-WORD-SELECTION"],
      [
        "requirements/requirements/REQ-VERIFICATION-SCORING.md",
        "REQ-VERIFICATION-SCORING",
      ],
      [
        "requirements/decisions/ADR-SSR-ARCHITECTURE.md",
        "ADR-SSR-ARCHITECTURE",
      ],
      ["requirements/requirements/REQ-QUALITY-GATES.md", "REQ-QUALITY-GATES"],
    ]),
  );
  const footer = renderWikiFooter("https://github.com/example/elx", "abc1234");

  assertStringIncludes(sidebar, "- [Project Idea](Project-Idea)");
  assertStringIncludes(sidebar, "- [Requirements SARA](Requirements-SARA)");
  assertStringIncludes(
    sidebar,
    "- [ADR-SSR-ARCHITECTURE](ADR-SSR-ARCHITECTURE)",
  );
  assertStringIncludes(
    footer,
    "Generated from [`docs/`](https://github.com/example/elx/tree/abc1234/docs)",
  );
  assertStringIncludes(footer, "Source revision: `abc1234`.");
});
