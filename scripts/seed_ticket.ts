import { closeDatabase } from "../db/client.ts";
import * as ticketsRepo from "../db/repositories/tickets.ts";

/**
 * Generates one base ticket, verifies every challenge question, and
 * publishes it through the normal guardrail-checked path — used to give e2e
 * runs a published ticket without routes/home.ts auto-generating one.
 */
export async function seedE2ETicket(): Promise<void> {
  const ticket = await ticketsRepo.generateBaseTicket(
    "E2E Seed Ticket",
    "Generated and published by scripts/seed_ticket.ts for e2e tests",
  );

  for (let index = 0; index < ticket.questions.length; index++) {
    const question = ticket.questions[index];
    if (question.type === "verification") continue;
    await ticketsRepo.updateQuestion(ticket.id, index, {
      ...question,
      verified: true,
    });
  }

  await ticketsRepo.publishTicket(ticket.id);
}

if (import.meta.main) {
  try {
    await seedE2ETicket();
    console.log("Seeded and published one ticket for e2e.");
  } finally {
    await closeDatabase();
  }
}
