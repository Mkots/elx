import { Hono } from "@hono/hono";
import { analyticsProps } from "../analytics.ts";
import { LegalPage } from "../ui/pages/LegalPage.tsx";

const privacyBody = [
  "This placeholder privacy policy describes the ELX research assessment. Final legal wording is supplied by the project owner.",
  "The application stores anonymous session identifiers, selected assessment items, item-level answers, response timestamps, and final scoring results.",
  "The application does not ask for account details, names, email addresses, or other directly identifying profile data.",
  "Analytics, when enabled by the project owner, is managed through Google Tag Manager after research consent is granted.",
];

const termsBody = [
  "These placeholder terms describe participation in the ELX vocabulary assessment. Final legal wording is supplied by the project owner.",
  "By continuing, participants agree to complete the assessment honestly and understand that anonymous responses may be retained for research analysis.",
  "The assessment is provided for research and product-development purposes and is not a formal certification or diagnosis.",
];

export function legalRoute() {
  const route = new Hono();

  route.get("/privacy", (context) => {
    return context.html(
      LegalPage({
        analytics: analyticsProps(context),
        title: "Privacy Policy",
        body: privacyBody,
      }),
    );
  });

  route.get("/terms", (context) => {
    return context.html(
      LegalPage({
        analytics: analyticsProps(context),
        title: "Terms of Service",
        body: termsBody,
      }),
    );
  });

  return route;
}
