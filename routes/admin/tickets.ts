import type { Hono } from "@hono/hono";
import { AdminTicketsPage } from "../../ui/pages/AdminTicketsPage.tsx";
import { AdminTicketDetailPage } from "../../ui/pages/AdminTicketDetailPage.tsx";
import {
  type AdminTicketsLoader,
  generateSpellingCandidates,
} from "./loaders/tickets.ts";
import type { SnapshotQuestion } from "../../db/schema.ts";

export function registerTicketsRoutes(route: Hono, loader: AdminTicketsLoader) {
  // 1. List tickets page
  route.get("/tickets", async (context) => {
    const allTickets = await loader.getTickets();
    const successMsg = context.req.query("success") || undefined;
    const errorMsg = context.req.query("error") || undefined;

    const ticketsList = allTickets.map((t) => ({
      id: t.id,
      code: t.code,
      status: t.status,
      title: t.title,
      notes: t.notes,
      questionsCount: t.questions.length,
      createdAt: t.createdAt,
    }));

    return context.html(
      AdminTicketsPage({
        tickets: ticketsList,
        success: successMsg,
        error: errorMsg,
      }),
    );
  });

  // 2. Generate base ticket action
  route.post("/tickets/generate", async (context) => {
    const body = await context.req.parseBody();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    try {
      await loader.generateBaseTicket(title, notes);
      return context.redirect(
        "/admin/tickets?success=" +
          encodeURIComponent("Base ticket generated successfully"),
      );
    } catch (err) {
      const allTickets = await loader.getTickets();
      const ticketsList = allTickets.map((t) => ({
        id: t.id,
        code: t.code,
        status: t.status,
        title: t.title,
        notes: t.notes,
        questionsCount: t.questions.length,
        createdAt: t.createdAt,
      }));

      const errMsg = err instanceof Error ? err.message : String(err);
      return context.html(
        AdminTicketsPage({
          tickets: ticketsList,
          error: errMsg,
        }),
      );
    }
  });

  // 3. View/Enrich single ticket detail page
  route.get("/tickets/:id", async (context) => {
    const id = Number(context.req.param("id"));
    const ticket = await loader.getTicketById(id);

    if (!ticket) {
      return context.redirect(
        "/admin/tickets?error=" + encodeURIComponent("Ticket not found"),
      );
    }

    const successMsg = context.req.query("success") || undefined;
    const errorMsg = context.req.query("error") || undefined;

    // Generate spelling suggestions for spelling challenge questions
    const spellingSuggestions: Record<number, string[]> = {};
    ticket.questions.forEach((q, idx) => {
      if (q.type === "spelling") {
        spellingSuggestions[idx] = generateSpellingCandidates(q.correctText);
      }
    });

    // Get exclusion list of words in the ticket to avoid duplicate options in meaningSuggestions
    const excludeList: string[] = [];
    ticket.questions.forEach((q) => {
      if (q.type === "verification") {
        excludeList.push(q.wordText);
      } else {
        excludeList.push(q.correctText);
      }
    });

    // Fetch 10 random real words as distractor proposals
    const meaningSuggestions = await loader.getRandomRealWords(10, excludeList);

    return context.html(
      AdminTicketDetailPage({
        ticket,
        spellingSuggestions,
        meaningSuggestions,
        success: successMsg,
        error: errorMsg,
      }),
    );
  });

  // 4. Save & Verify single challenge question
  route.post("/tickets/:id/edit-question/:index", async (context) => {
    const id = Number(context.req.param("id"));
    const index = Number(context.req.param("index"));

    const ticket = await loader.getTicketById(id);
    if (!ticket) {
      return context.redirect(
        "/admin/tickets?error=" + encodeURIComponent("Ticket not found"),
      );
    }

    const currentQuestion = ticket.questions[index];
    if (!currentQuestion || currentQuestion.type === "verification") {
      return context.redirect(
        `/admin/tickets/${id}?error=` +
          encodeURIComponent("Invalid question index or question type"),
      );
    }

    const body = await context.req.parseBody();

    // Parse distractors
    const distractors: string[] = [];
    if (
      typeof body["distractors[0]"] === "string" &&
      body["distractors[0]"].trim()
    ) {
      distractors.push(body["distractors[0]"].trim());
    }
    if (
      typeof body["distractors[1]"] === "string" &&
      body["distractors[1]"].trim()
    ) {
      distractors.push(body["distractors[1]"].trim());
    }
    if (
      typeof body["distractors[2]"] === "string" &&
      body["distractors[2]"].trim()
    ) {
      distractors.push(body["distractors[2]"].trim());
    }

    try {
      if (distractors.length !== 3) {
        throw new Error("Exactly 3 distractors must be provided");
      }

      let updatedQuestion: SnapshotQuestion;

      if (currentQuestion.type === "synonym") {
        const correctText = typeof body.correctText === "string"
          ? body.correctText.trim()
          : "";
        if (!correctText) throw new Error("Correct synonym is required");

        updatedQuestion = {
          type: "synonym",
          promptText: currentQuestion.promptText,
          correctText,
          distractors,
          verified: true,
        };
      } else if (currentQuestion.type === "spelling") {
        const contextSentence = typeof body.contextSentence === "string"
          ? body.contextSentence.trim()
          : "";
        if (!contextSentence) throw new Error("Context sentence is required");
        if (!contextSentence.includes("___")) {
          throw new Error(
            "Context sentence must contain the placeholder '___'",
          );
        }

        updatedQuestion = {
          type: "spelling",
          contextSentence,
          correctText: currentQuestion.correctText,
          distractors,
          verified: true,
        };
      } else {
        // definition
        const definitionText = typeof body.definitionText === "string"
          ? body.definitionText.trim()
          : "";
        if (!definitionText) throw new Error("Definition text is required");

        updatedQuestion = {
          type: "definition",
          definitionText,
          correctText: currentQuestion.correctText,
          distractors,
          verified: true,
        };
      }

      await loader.updateQuestion(id, index, updatedQuestion);

      return context.redirect(
        `/admin/tickets/${id}?success=` +
          encodeURIComponent("Question verified and saved successfully") +
          `#q-card-${index}`,
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return context.redirect(
        `/admin/tickets/${id}?error=` +
          encodeURIComponent(errMsg) +
          `#q-card-${index}`,
      );
    }
  });

  // 5. Publish ticket action
  route.post("/tickets/:id/publish", async (context) => {
    const id = Number(context.req.param("id"));

    try {
      await loader.publishTicket(id);
      return context.redirect(
        "/admin/tickets?success=" +
          encodeURIComponent("Ticket successfully published and made active!"),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return context.redirect(
        `/admin/tickets/${id}?error=` + encodeURIComponent(errMsg),
      );
    }
  });

  // 6. Delete ticket action
  route.post("/tickets/:id/delete", async (context) => {
    const id = Number(context.req.param("id"));

    try {
      await loader.deleteTicket(id);
      return context.redirect(
        "/admin/tickets?success=" +
          encodeURIComponent("Ticket deleted successfully"),
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return context.redirect(
        "/admin/tickets?error=" + encodeURIComponent(errMsg),
      );
    }
  });
}
