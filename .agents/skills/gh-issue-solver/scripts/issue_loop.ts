/**
 * Orchestrator script for automating the issue processing loop.
 *
 * Usage:
 *   deno run -A .agents/skills/gh-issue-solver/scripts/issue_loop.ts --start
 *   deno run -A .agents/skills/gh-issue-solver/scripts/issue_loop.ts --submit
 *   deno run -A .agents/skills/gh-issue-solver/scripts/issue_loop.ts --status
 *   deno run -A .agents/skills/gh-issue-solver/scripts/issue_loop.ts --reset
 *   deno run -A .agents/skills/gh-issue-solver/scripts/issue_loop.ts --skip
 */

import { parseArgs } from "@std/cli/parse-args";

const STATE_FILE = ".agents/skills/gh-issue-solver/state.json";
const SUBMIT_INSTRUCTION =
  "Once done, run: deno run -A .agents/skills/gh-issue-solver/scripts/issue_loop.ts --submit";

interface Issue {
  number: number;
  title: string;
  url: string;
}

interface State {
  milestone: string | null;
  currentIssue: Issue | null;
  remainingIssues: Issue[];
  completedIssues: Issue[];
}

type JsonRecord = Record<string, unknown>;

const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;
const gray = (text: string) => `\x1b[90m${text}\x1b[0m`;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function asRecord(value: unknown): JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected a JSON object");
  }
  return value as JsonRecord;
}

function getString(record: JsonRecord, key: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new Error(`Expected "${key}" to be a string`);
  }
  return value;
}

function getNumber(record: JsonRecord, key: string): number {
  const value = record[key];
  if (typeof value !== "number") {
    throw new Error(`Expected "${key}" to be a number`);
  }
  return value;
}

function parseIssueList(json: string): Issue[] {
  const parsed = JSON.parse(json) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Expected GitHub issue list to be an array");
  }

  return parsed.map((item) => {
    const record = asRecord(item);
    return {
      number: getNumber(record, "number"),
      title: getString(record, "title"),
      url: getString(record, "url"),
    };
  });
}

function parsePrInfo(json: string): { number: number; url?: string } {
  const record = asRecord(JSON.parse(json) as unknown);
  const url = record.url;
  return {
    number: getNumber(record, "number"),
    url: typeof url === "string" ? url : undefined,
  };
}

async function runCmd(cmd: string[], errorMsg: string): Promise<string> {
  const process = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await process.output();
  const outStr = new TextDecoder().decode(stdout).trim();
  const errStr = new TextDecoder().decode(stderr).trim();
  if (code !== 0) {
    throw new Error(
      `${
        red(errorMsg)
      }\nExit Code: ${code}\nStdout: ${outStr}\nStderr: ${errStr}`,
    );
  }
  return outStr;
}

async function loadState(): Promise<State> {
  try {
    const data = await Deno.readTextFile(STATE_FILE);
    const parsed = JSON.parse(data) as Partial<State>;
    return {
      milestone: parsed.milestone ?? null,
      currentIssue: parsed.currentIssue ?? null,
      remainingIssues: parsed.remainingIssues ?? [],
      completedIssues: parsed.completedIssues ?? [],
    };
  } catch {
    return {
      milestone: null,
      currentIssue: null,
      remainingIssues: [],
      completedIssues: [],
    };
  }
}

async function saveState(state: State) {
  await Deno.writeTextFile(STATE_FILE, JSON.stringify(state, null, 2));
}

function getBranchName(issue: Issue): string {
  const sanitizedTitle = issue.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return `issue-${issue.number}-${sanitizedTitle || "issue"}`;
}

async function ensureCleanWorkingTree(action: string) {
  const status = await runCmd(
    ["git", "status", "--porcelain", "--untracked-files=all"],
    "Failed to inspect git status",
  );

  if (status.length > 0) {
    throw new Error(
      `Cannot ${action} with uncommitted changes:\n${status}\nCommit, stash, or submit the current work first.`,
    );
  }
}

async function getDefaultBranch(): Promise<string> {
  return await runCmd(
    [
      "gh",
      "repo",
      "view",
      "--json",
      "defaultBranchRef",
      "--jq",
      ".defaultBranchRef.name",
    ],
    "Failed to determine the repository default branch",
  );
}

async function checkoutUpdatedDefaultBranch(): Promise<string> {
  const defaultBranch = await getDefaultBranch();
  console.log(blue(`Switching to ${defaultBranch} and pulling updates...`));
  await runCmd(
    ["git", "fetch", "origin", defaultBranch],
    `Failed to fetch origin/${defaultBranch}`,
  );
  await runCmd(
    ["git", "checkout", defaultBranch],
    `Failed to checkout ${defaultBranch}`,
  );
  await runCmd(
    ["git", "pull", "--ff-only", "origin", defaultBranch],
    `Failed to fast-forward ${defaultBranch}`,
  );
  return defaultBranch;
}

async function localBranchExists(branchName: string): Promise<boolean> {
  try {
    await runCmd(
      ["git", "show-ref", "--verify", "--quiet", `refs/heads/${branchName}`],
      `Local branch ${branchName} does not exist`,
    );
    return true;
  } catch {
    return false;
  }
}

async function checkoutIssueBranch(branchName: string, defaultBranch: string) {
  if (await localBranchExists(branchName)) {
    console.log(blue(`Switching to branch: ${branchName}`));
    await runCmd(
      ["git", "checkout", branchName],
      `Failed to checkout branch ${branchName}`,
    );
    return;
  }

  console.log(blue(`Creating branch: ${branchName}`));
  await runCmd(
    ["git", "checkout", "-b", branchName, `origin/${defaultBranch}`],
    `Failed to create branch ${branchName}`,
  );
}

async function printIssueDetails(issueNumber: number) {
  console.log(gray("Issue Details:"));
  const details = await runCmd(
    ["gh", "issue", "view", String(issueNumber)],
    "Failed to view issue details",
  );
  console.log(details);
}

async function startWorkflow(milestoneArg: string | null) {
  const state = await loadState();
  const milestone = milestoneArg ?? state.milestone;

  if (state.remainingIssues.length === 0 && !state.currentIssue) {
    if (!milestone) {
      console.error(
        red(
          'Error: no milestone selected. Run --start with --milestone "<title>".',
        ),
      );
      Deno.exit(1);
    }
    console.log(blue(`Fetching open issues in milestone "${milestone}"...`));
    const issuesJson = await runCmd(
      [
        "gh",
        "issue",
        "list",
        "--milestone",
        milestone,
        "--json",
        "number,title,url",
        "--state",
        "open",
        "--limit",
        "50",
      ],
      "Failed to fetch open issues from GitHub CLI",
    );
    const parsedIssues = parseIssueList(issuesJson);
    if (parsedIssues.length === 0) {
      console.log(green(`No open issues found in milestone "${milestone}".`));
      return;
    }
    parsedIssues.sort((a, b) => a.number - b.number);
    state.milestone = milestone;
    state.remainingIssues = parsedIssues;
    await saveState(state);
    console.log(
      green(
        `Loaded ${state.remainingIssues.length} issues from milestone "${milestone}" into the queue.`,
      ),
    );
  }

  await ensureCleanWorkingTree("start the next issue");

  if (state.currentIssue) {
    console.log(
      yellow(
        `\nAn issue is already in progress: #${state.currentIssue.number} - ${state.currentIssue.title}`,
      ),
    );
    const branchName = getBranchName(state.currentIssue);
    await runCmd(
      ["git", "checkout", branchName],
      `Failed to checkout branch ${branchName}`,
    );
    await printIssueDetails(state.currentIssue.number);
    console.log(
      green(
        "\nPlease implement the changes, run `deno task ci` to test, and then run `deno run -A .agents/skills/gh-issue-solver/scripts/issue_loop.ts --submit`",
      ),
    );
    return;
  }

  const nextIssue = state.remainingIssues.shift();
  if (!nextIssue) {
    console.log(green("All issues completed."));
    return;
  }

  const branchName = getBranchName(nextIssue);
  console.log(blue(`\n[Next Issue] #${nextIssue.number}: ${nextIssue.title}`));
  const defaultBranch = await checkoutUpdatedDefaultBranch();
  await checkoutIssueBranch(branchName, defaultBranch);
  state.currentIssue = nextIssue;
  await saveState(state);
  await printIssueDetails(nextIssue.number);

  console.log(green(`\nBranch ${branchName} is ready!`));
  console.log(green("AI Agent: Please implement the changes for this issue."));
  console.log(green(SUBMIT_INSTRUCTION));
}

async function submitWorkflow() {
  const state = await loadState();
  if (!state.currentIssue) {
    console.error(
      red("Error: No active issue in progress. Run with --start first."),
    );
    Deno.exit(1);
  }

  const issue = state.currentIssue;
  const branchName = getBranchName(issue);

  console.log(
    blue(`\nStarting submission for #${issue.number}: ${issue.title}`),
  );

  // 1. Run local CI tests
  console.log(blue("Running local CI quality gates (`deno task ci`)..."));
  try {
    await runCmd(
      ["deno", "task", "ci"],
      "Local Deno CI checks failed!",
    );
    console.log(green("Local CI passed! ✅"));
  } catch (err: unknown) {
    console.error(
      red("\nLocal CI failed. Please fix formatting, linting, or tests."),
    );
    console.error(errorMessage(err));
    Deno.exit(1);
  }

  const gitStatus = await runCmd(
    ["git", "status", "--porcelain", "--untracked-files=all"],
    "Failed to run git status",
  );
  if (gitStatus.length > 0) {
    console.log(blue("Found uncommitted changes. Staging and committing..."));
    await runCmd(["git", "add", "-A"], "Failed to stage changes");
    try {
      await runCmd(
        ["git", "diff", "--cached", "--quiet"],
        "Staged changes are present",
      );
      console.log(gray("No committable changes detected after staging."));
    } catch {
      await runCmd(
        [
          "git",
          "commit",
          "-m",
          `impl: resolve #${issue.number} - ${issue.title}`,
        ],
        "Failed to commit changes",
      );
      console.log(green("Changes committed."));
    }
  } else {
    console.log(gray("No uncommitted changes detected."));
  }

  console.log(blue(`Pushing branch ${branchName} to origin...`));
  await runCmd(
    ["git", "push", "-u", "origin", branchName],
    "Failed to push branch to origin",
  );
  console.log(green("Branch pushed successfully."));

  let prNumber = 0;
  let prUrl = "";
  try {
    const prInfoJson = await runCmd(
      ["gh", "pr", "view", "--json", "number,url"],
      "Checking if PR already exists...",
    );
    const prInfo = parsePrInfo(prInfoJson);
    prNumber = prInfo.number;
    prUrl = prInfo.url ?? "";
    console.log(yellow(`PR already exists: ${prUrl} (#${prNumber})`));
  } catch {
    console.log(blue("Creating Pull Request..."));
    prUrl = await runCmd(
      [
        "gh",
        "pr",
        "create",
        "--title",
        `impl: resolve #${issue.number} - ${issue.title}`,
        "--body",
        `Implements the requested fix for issue #${issue.number}.\n\nCloses #${issue.number}`,
      ],
      "Failed to create Pull Request",
    );
    console.log(green(`Pull Request created: ${prUrl}`));
    const prInfoJson = await runCmd(
      ["gh", "pr", "view", "--json", "number"],
      "Failed to get PR info",
    );
    prNumber = parsePrInfo(prInfoJson).number;
  }

  console.log(
    blue(
      `Waiting for GitHub Actions CI checks to complete on PR #${prNumber}...`,
    ),
  );
  let attempts = 0;
  const maxAttempts = 40;
  let checksPassed = false;
  let lastStatusString = "";

  while (attempts < maxAttempts) {
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 15000));

    try {
      const statusJson = await runCmd(
        ["gh", "pr", "view", String(prNumber), "--json", "statusCheckRollup"],
        "Failed to query PR status checks",
      );
      const data = asRecord(JSON.parse(statusJson) as unknown);
      const rollup = Array.isArray(data.statusCheckRollup)
        ? data.statusCheckRollup
        : [];

      if (rollup.length === 0) {
        const currentStatus = "Waiting for checks to start...";
        if (currentStatus !== lastStatusString || attempts % 5 === 0) {
          console.log(
            gray(`[${attempts}/${maxAttempts}] ${currentStatus}`),
          );
          lastStatusString = currentStatus;
        }
        continue;
      }

      let allCompleted = true;
      let anyFailed = false;
      const runningChecks: string[] = [];
      const failedChecks: string[] = [];

      for (const check of rollup) {
        const checkRecord = asRecord(check);
        const status = typeof checkRecord.status === "string"
          ? checkRecord.status.toUpperCase()
          : "";
        const conclusion = typeof checkRecord.conclusion === "string"
          ? checkRecord.conclusion.toUpperCase()
          : "";
        const name = typeof checkRecord.name === "string"
          ? checkRecord.name
          : "Unknown check";

        if (status !== "COMPLETED") {
          allCompleted = false;
          runningChecks.push(name);
        } else if (
          conclusion !== "SUCCESS" && conclusion !== "SKIPPED" &&
          conclusion !== "NEUTRAL"
        ) {
          anyFailed = true;
          failedChecks.push(`${name} (${conclusion})`);
        }
      }

      if (anyFailed) {
        console.error(
          red(`\nCI failed! Failed checks: ${failedChecks.join(", ")}`),
        );
        Deno.exit(1);
      }

      if (allCompleted) {
        console.log(green("\nAll GitHub checks passed successfully."));
        checksPassed = true;
        break;
      }

      const currentStatus = runningChecks.join(", ");
      if (currentStatus !== lastStatusString || attempts % 5 === 0) {
        console.log(
          gray(`[${attempts}/${maxAttempts}] Checks in progress: `) +
            yellow(currentStatus),
        );
        lastStatusString = currentStatus;
      }
    } catch (err: unknown) {
      console.log(
        yellow(`Warning: Could not fetch checks status: ${errorMessage(err)}`),
      );
    }
  }

  if (!checksPassed) {
    console.error(red("\nTimeout: CI checks did not complete in 10 minutes."));
    Deno.exit(1);
  }

  console.log(blue(`Merging Pull Request #${prNumber}...`));
  await runCmd(
    ["gh", "pr", "merge", String(prNumber), "--squash", "--delete-branch"],
    "Failed to merge Pull Request",
  );
  console.log(green(`Pull Request #${prNumber} merged successfully.`));

  state.completedIssues.push(issue);
  state.currentIssue = null;
  await saveState(state);

  await ensureCleanWorkingTree("move to the default branch after submission");
  await checkoutUpdatedDefaultBranch();

  if (state.remainingIssues.length > 0) {
    console.log(green("\nMoving on to the next issue..."));
    await startWorkflow(null);
  } else {
    console.log(green("\nAll issues in queue have been submitted."));
  }
}

async function showStatus() {
  const state = await loadState();
  console.log(blue("\n=== Issue Loop Status ==="));
  if (state.currentIssue) {
    console.log(
      yellow(
        `Active Issue: #${state.currentIssue.number} - ${state.currentIssue.title}`,
      ),
    );
    console.log(`Branch: ${getBranchName(state.currentIssue)}`);
  } else {
    console.log("Active Issue: None");
  }

  console.log(blue(`\nCompleted Issues (${state.completedIssues.length}):`));
  for (const issue of state.completedIssues) {
    console.log(green(`  #${issue.number} - ${issue.title}`));
  }

  console.log(
    blue(`\nRemaining Issues in Queue (${state.remainingIssues.length}):`),
  );
  for (const issue of state.remainingIssues) {
    console.log(gray(`  #${issue.number} - ${issue.title}`));
  }
  console.log("");
}

async function resetWorkflow() {
  await saveState({
    milestone: null,
    currentIssue: null,
    remainingIssues: [],
    completedIssues: [],
  });
  console.log(green("State reset successfully."));
}

async function skipWorkflow() {
  const state = await loadState();
  if (!state.currentIssue) {
    console.error(red("Error: No active issue to skip."));
    Deno.exit(1);
  }

  await ensureCleanWorkingTree("skip the active issue");

  console.log(
    yellow(
      `Skipping issue #${state.currentIssue.number}: ${state.currentIssue.title}`,
    ),
  );
  state.currentIssue = null;
  await saveState(state);

  await checkoutUpdatedDefaultBranch();

  if (state.remainingIssues.length > 0) {
    await startWorkflow(null);
  } else {
    console.log(green("No more issues in the queue."));
  }
}

// Command dispatcher
const args = parseArgs(Deno.args, {
  boolean: ["start", "submit", "status", "reset", "skip"],
  string: ["milestone"],
});

if (args.start) {
  await startWorkflow(args.milestone ?? null);
} else if (args.submit) {
  await submitWorkflow();
} else if (args.status) {
  await showStatus();
} else if (args.reset) {
  await resetWorkflow();
} else if (args.skip) {
  await skipWorkflow();
} else {
  console.log(`
Usage:
  deno run -A .agents/skills/gh-issue-solver/scripts/issue_loop.ts --start --milestone "<Milestone title>"
  deno run -A .agents/skills/gh-issue-solver/scripts/issue_loop.ts --submit
  deno run -A .agents/skills/gh-issue-solver/scripts/issue_loop.ts --status
  deno run -A .agents/skills/gh-issue-solver/scripts/issue_loop.ts --skip
  deno run -A .agents/skills/gh-issue-solver/scripts/issue_loop.ts --reset

The milestone is required on the first --start of a batch and is persisted in
state.json; later --start/--submit/--skip invocations reuse it automatically.
  `);
}
