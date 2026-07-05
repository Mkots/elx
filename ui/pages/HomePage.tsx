import { Layout } from "../components/Layout.tsx";
import type { AnalyticsProps } from "../../analytics.ts";

type PublishedTicket = {
  id: number;
  code: string;
  title: string | null;
};

type HomePageProps = {
  analytics?: AnalyticsProps;
  publishedTickets: PublishedTicket[];
};

export function HomePage({ analytics, publishedTickets = [] }: HomePageProps) {
  const hasTickets = publishedTickets.length > 0;

  return (
    <Layout analytics={analytics} title="ELX Vocabulary Assessment">
      <div class="page-container page-container-sm">
        <h1 class="text-center mb-10">
          ELX Vocabulary Assessment
        </h1>
        <p class="text-center color-muted mb-30">
          A curated test to measure your English vocabulary size and
          verification speed.
        </p>

        {!hasTickets
          ? (
            <div class="empty-ticket-alert">
              ⚠️ <strong>No published tickets available.</strong>
              <br />
              Please log into the{" "}
              <a href="/admin/login" class="decoration-underline">
                Admin Panel
              </a>{" "}
              to generate and publish a ticket first.
            </div>
          )
          : (
            <article class="home-ticket-card">
              <form action="/stage/1/start" method="post" class="m-0">
                <div class="form-group mb-20">
                  <label
                    for="ticketId"
                    class="form-label-block"
                  >
                    Select a Test Version (Ticket)
                  </label>
                  <select id="ticketId" name="ticketId" required class="m-0">
                    {publishedTickets.map((t) => (
                      <option value={String(t.id)}>
                        {t.code} {t.title ? `- ${t.title}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  class="m-0 w-100 fw-700"
                >
                  Start Assessment →
                </button>
              </form>
            </article>
          )}
      </div>
    </Layout>
  );
}
