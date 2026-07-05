import { Layout } from "../components/Layout.tsx";
import type { AnalyticsProps } from "../../analytics.ts";

type LegalPageProps = {
  analytics?: AnalyticsProps;
  body: string[];
  title: string;
};

export function LegalPage({ analytics, body, title }: LegalPageProps) {
  return (
    <Layout analytics={analytics} title={`ELX - ${title}`}>
      <section class="page-container page-container-lg">
        <h1>{title}</h1>
        {body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <p>
          <a href="/">Back to assessment</a>
        </p>
      </section>
    </Layout>
  );
}
