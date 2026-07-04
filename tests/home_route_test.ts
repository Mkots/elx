import { assertEquals, assertStringIncludes } from "@std/assert";
import { createApp } from "../app.ts";
import { defaultServices, type Services } from "../db/services.ts";

function makeServices(
  overrides: Partial<Services["tickets"]> = {},
): Services & { writeCalls: number[] } {
  const writeCalls: number[] = [];

  const fail = (name: string) => () => {
    writeCalls.push(1);
    throw new Error(`unexpected write: ${name}`);
  };

  const tickets: Services["tickets"] = {
    ...defaultServices.tickets,
    getPublishedTickets: () => Promise.resolve([]),
    generateBaseTicket: fail("generateBaseTicket"),
    updateQuestion: fail("updateQuestion"),
    publishTicket: fail("publishTicket"),
    deleteTicket: fail("deleteTicket"),
    ...overrides,
  };

  return Object.assign(
    { ...defaultServices, tickets },
    { writeCalls },
  );
}

Deno.test("VER-HOME-ROUTE: GET / with no published tickets performs zero writes and shows the empty state", async () => {
  const services = makeServices();
  const app = createApp(services);

  const response = await app.request("/");
  const body = await response.text();

  assertEquals(response.status, 200);
  assertStringIncludes(body, "No published tickets available");
  assertEquals(services.writeCalls.length, 0);
});

Deno.test("VER-HOME-ROUTE: GET / with published tickets renders the ticket picker", async () => {
  const services = makeServices({
    getPublishedTickets: () =>
      Promise.resolve([{ id: 1, code: "ELX-T-0001", title: "Sample" }]),
  });
  const app = createApp(services);

  const response = await app.request("/");
  const body = await response.text();

  assertEquals(response.status, 200);
  assertStringIncludes(body, "ELX-T-0001");
  assertEquals(services.writeCalls.length, 0);
});
