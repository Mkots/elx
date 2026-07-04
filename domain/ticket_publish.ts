import type { SnapshotQuestion } from "../db/schema.ts";

export interface PublishableTicket {
  questions: SnapshotQuestion[];
}

/**
 * Pure guardrail check for publishing a ticket. Returns every problem
 * preventing publish (empty array if the ticket is publishable) instead of
 * throwing on the first one, so callers can surface them all at once.
 */
export function validateForPublish(ticket: PublishableTicket): string[] {
  const problems: string[] = [];
  const challenges = ticket.questions.filter((q) => q.type !== "verification");

  challenges.forEach((q, i) => {
    const label = `Question #${i + 1} (${q.type})`;

    if (!q.verified) {
      problems.push(`${label} is unverified.`);
    }
    if (!q.correctText || q.correctText.trim() === "") {
      problems.push(`${label} has no correct text.`);
    }
    if (!q.distractors || q.distractors.length !== 3) {
      problems.push(`${label} must have exactly 3 distractors.`);
    }
    if (
      q.type === "spelling" &&
      (!q.contextSentence || !q.contextSentence.includes("___"))
    ) {
      problems.push(`${label} context sentence must contain '___'.`);
    }
    if (
      q.type === "definition" &&
      (!q.definitionText || q.definitionText.trim() === "")
    ) {
      problems.push(`${label} has no definition text.`);
    }
  });

  return problems;
}
