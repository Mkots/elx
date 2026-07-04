import type { Context } from "@hono/hono";
import { getSessionId } from "../session.ts";
import type { Ticket } from "../db/repositories/tickets.ts";
import type { Services } from "../db/services.ts";

interface RequireTestSessionOptions {
  /** Where to redirect when there's no session cookie at all. */
  noSessionRedirect: string;
  /** Whether the route needs the session's ticket resolved too. */
  requireTicket?: boolean;
  /** Whether the route requires the session consent gate to be complete. */
  requireConsent?: boolean;
}

type WithTicket = { sessionId: string; ticketId: number; ticket: Ticket };
type WithoutTicket = { sessionId: string; ticketId: null; ticket: null };

export function requireTestSession(
  context: Context,
  services: Services,
  options: RequireTestSessionOptions & { requireTicket: true },
): Promise<WithTicket | Response>;
export function requireTestSession(
  context: Context,
  services: Services,
  options: RequireTestSessionOptions & { requireTicket?: false },
): Promise<WithoutTicket | Response>;
export async function requireTestSession(
  context: Context,
  services: Services,
  options: RequireTestSessionOptions,
): Promise<WithTicket | WithoutTicket | Response> {
  const sessionId = getSessionId(context);
  if (!sessionId) return context.redirect(options.noSessionRedirect, 302);

  if (options.requireConsent) {
    const consentedAt = await services.sessions.loadConsentTimestamp(sessionId);
    if (!consentedAt) return context.redirect("/consent", 302);
  }

  if (!options.requireTicket) {
    return { sessionId, ticketId: null, ticket: null };
  }

  const ticketId = await services.sessions.loadSessionTicketId(sessionId);
  if (!ticketId) return context.redirect("/", 302);

  const ticket = await services.tickets.getTicketById(ticketId);
  if (!ticket) return context.redirect("/", 302);

  return { sessionId, ticketId, ticket };
}
