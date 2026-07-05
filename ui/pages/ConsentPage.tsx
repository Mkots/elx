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
      <section class="page-container page-container-md">
        <h1>Research Consent</h1>
        {ticketCode && (
          <p class="color-muted">
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
          <p role="alert" class="color-danger">
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
          <button type="submit" class="mt-20">
            Continue to Assessment
          </button>
        </form>
      </section>
    </Layout>
  );
}
