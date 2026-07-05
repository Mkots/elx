import type { Child } from "hono/jsx";
import type { AnalyticsProps } from "../../analytics.ts";
import { safeJson } from "../../analytics.ts";

type LayoutProps = {
  analytics?: AnalyticsProps;
  children: Child;
  htmx?: boolean;
  title: string;
};

function consentValues(value: "denied" | "granted") {
  return {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    analytics_storage: value,
  };
}

function gtmBootstrapScript(containerId: string, consentGranted: boolean) {
  const update = consentGranted
    ? `gtag('consent','update',${safeJson(consentValues("granted"))});`
    : "";
  return `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent','default',${safeJson(consentValues("denied"))});
    ${update}
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer',${safeJson(containerId)});
  `;
}

function dataLayerPushScript(events: AnalyticsProps["events"] = []) {
  if (events.length === 0) return "";
  return `
    window.dataLayer = window.dataLayer || [];
    for (const event of ${safeJson(events)}) {
      window.dataLayer.push(event);
    }
  `;
}

function htmxAnalyticsBridgeScript() {
  return `
    document.addEventListener('DOMContentLoaded', function () {
      document.body.addEventListener('elx:analytics', function (event) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(event.detail);
      });
    });
  `;
}

export function Layout(
  { analytics, children, htmx = false, title }: LayoutProps,
) {
  const containerId = analytics?.containerId;
  const nonce = analytics?.nonce;
  const events = analytics?.events ?? [];

  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="ELX vocabulary assessment application"
        />
        <title>{title}</title>
        <link rel="stylesheet" href="/static/public.css" />
        {containerId && (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: gtmBootstrapScript(
                containerId,
                analytics?.consentGranted ?? false,
              ),
            }}
          />
        )}
        {events.length > 0 && (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{ __html: dataLayerPushScript(events) }}
          />
        )}
        {htmx && (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{ __html: htmxAnalyticsBridgeScript() }}
          />
        )}
        {htmx && <script src="/static/htmx.min.js" defer></script>}
      </head>
      <body>
        {containerId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${containerId}`}
              height="0"
              width="0"
              class="gtm-noscript-frame"
            >
            </iframe>
          </noscript>
        )}
        <main>{children}</main>
      </body>
    </html>
  );
}
