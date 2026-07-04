import { Layout } from "../components/Layout.tsx";
import type { AnalyticsProps } from "../../analytics.ts";

type ConsentPageProps = {
  analytics?: AnalyticsProps;
  error?: string;
  ticketCode?: string;
};

export function ConsentPage(
  { analytics, error, ticketCode }: ConsentPageProps,
) {
  return (
    <Layout analytics={analytics} title="ELX - Research Consent">
      <section style="max-width: 680px; margin: 40px auto; padding: 20px;">
        <h1>Research Consent</h1>
        {ticketCode && (
          <p style="color: var(--pico-muted-color);">
            Test Version: <strong>{ticketCode}</strong>
          </p>
        )}
        <p>
          ELX records anonymous assessment session data, selected items,
          answers, scores, and response timing signals for vocabulary research.
          No account, name, email, or IP-derived profile is stored by the
          application.
        </p>
        <p>
          Review the placeholder privacy policy and terms before starting the
          assessment.
        </p>

        {error && (
          <p role="alert" style="color: var(--pico-del-color);">
            {error}
          </p>
        )}

        <form action="/consent" method="post">
          <label>
            <input type="checkbox" name="accept" value="yes" />
            I agree to participate and accept the{" "}
            <a href="/privacy">Privacy Policy</a> and{" "}
            <a href="/terms">Terms of Service</a>.
          </label>
          <button type="submit" style="margin-top: 20px;">
            Continue to Assessment
          </button>
        </form>
      </section>
    </Layout>
  );
}
