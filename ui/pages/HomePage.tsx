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
      <div style="max-width: 600px; margin: 40px auto; padding: 20px;">
        <h1 style="text-align: center; margin-bottom: 10px;">
          ELX Vocabulary Assessment
        </h1>
        <p style="text-align: center; color: var(--pico-muted-color); margin-bottom: 30px;">
          A curated test to measure your English vocabulary size and
          verification speed.
        </p>

        {!hasTickets
          ? (
            <div style="padding: 15px; border-radius: 8px; border: 1px solid var(--pico-del-color); background-color: rgba(220, 53, 69, 0.1); color: var(--pico-del-color); text-align: center; margin-bottom: 20px;">
              ⚠️ <strong>No published tickets available.</strong>
              <br />
              Please log into the{" "}
              <a href="/admin/login" style="text-decoration: underline;">
                Admin Panel
              </a>{" "}
              to generate and publish a ticket first.
            </div>
          )
          : (
            <article style="padding: 30px; border-radius: 12px; box-shadow: var(--pico-card-box-shadow);">
              <form action="/stage/1/start" method="post" class="m-0">
                <div class="form-group mb-20">
                  <label
                    for="ticketId"
                    style="font-weight: bold; margin-bottom: 8px; display: block;"
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
                  class="m-0 w-100"
                  style="font-weight: bold;"
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
