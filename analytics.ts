import type { Context } from "@hono/hono";

export type DataLayerEvent = {
  event: string;
  session_id: string;
  ticket_code: string;
  [key: string]: string | number | boolean;
};

export type AnalyticsProps = {
  consentGranted: boolean;
  containerId?: string;
  events?: DataLayerEvent[];
  nonce?: string;
};

export function analyticsProps(
  context: Context,
  options: {
    consentGranted?: boolean;
    events?: DataLayerEvent[];
  } = {},
): AnalyticsProps {
  return {
    consentGranted: options.consentGranted ?? false,
    containerId: Deno.env.get("GTM_CONTAINER_ID") || undefined,
    events: options.events ?? [],
    nonce: context.get("secureHeadersNonce"),
  };
}

export function analyticsEvent(
  event: string,
  sessionId: string,
  ticketCode: string,
  properties: Record<string, string | number | boolean> = {},
): DataLayerEvent {
  return {
    event,
    session_id: sessionId,
    ticket_code: ticketCode,
    ...properties,
  };
}

export function safeJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
