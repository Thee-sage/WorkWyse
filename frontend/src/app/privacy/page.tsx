'use client';
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const sections = [
  {
    title: "1. Information We Collect",
    content: `When you submit a report, we collect the information you voluntarily provide: company name, role, location, dates, and the description of your experience. If you choose not to submit anonymously, your display name is associated with the report.

We collect standard server logs (IP address, browser type, pages visited) for security and debugging. We do not sell this data or share it with advertisers.

We do not require account creation to browse WorkWyse. Creating an account (optional) requires only an email address.`,
  },
  {
    title: "2. How We Use Your Information",
    content: `Report data is used to power the public archive — it is displayed on the platform and associated with the relevant company's file. Anonymous reports show "Anonymous" in place of your name.

We use aggregate, anonymized data to compute company trust scores, ghost job rates, and monthly activity metrics.

We may contact you by email to notify you of significant updates to your reports (new confirmations, disputes, or responses).`,
  },
  {
    title: "3. Public Nature of Reports",
    content: `By submitting a report, you acknowledge that the report content — including company name, role, location, and your written description — will be publicly visible to anyone who visits WorkWyse.

If you submit with a username, that username will also be publicly visible. If you submit anonymously, no identifying information is shown, but the report content remains public.

Do not include personally identifiable information about yourself or third parties (full names, email addresses, phone numbers) in your report descriptions.`,
  },
  {
    title: "4. Dispute and Removal",
    content: `If you believe a report about you or your company is false, you may file a formal dispute through our disputes process. The community's response to disputes is public.

Report authors may request deletion of their own reports. Deleted reports are removed from public view but may be retained in our archives for integrity and abuse prevention purposes for up to 90 days.

WorkWyse reserves the right to remove reports that violate our community guidelines (defamatory content, personal attacks, or verifiably false information).`,
  },
  {
    title: "5. Cookies",
    content: `WorkWyse uses only essential cookies required for the platform to function (session management, CSRF protection). We do not use tracking cookies or third-party advertising cookies.

You can disable cookies in your browser settings, but some features may not function correctly.`,
  },
  {
    title: "6. Data Security",
    content: `All data is transmitted over HTTPS. We use industry-standard security practices for our servers and databases.

We will notify registered users within 72 hours of discovering a data breach that may affect their personal information, as required by applicable law.`,
  },
  {
    title: "7. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. We will notify registered users by email of any significant changes. The updated policy will always be posted at this URL with the effective date noted below.`,
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      {/* Header */}
      <section className="pt-28 pb-12 md:pt-36 md:pb-16" style={{ backgroundColor: "rgba(237,236,235,0.4)" }}>
        <div className="max-w-3xl mx-auto px-6">
          <ScrollReveal>
            <p className="text-accent mb-3" style={{ fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>Legal</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.75rem, 4vw, 2.75rem)", fontWeight: 700, lineHeight: 1.2 }}>Privacy Policy</h1>
            <p className="mt-4" style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
              Last updated: March 7, 2026
            </p>
            <p className="mt-4 max-w-xl" style={{ fontSize: "1rem", lineHeight: 1.8, color: "var(--muted-foreground)" }}>
              WorkWyse is built on transparency — and that applies to how we handle your data too. This policy explains what we collect, why, and what rights you have.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-20 pb-28 md:pb-36">
        <div className="max-w-3xl mx-auto px-6">
          <div className="space-y-10">
            {sections.map((section, i) => (
              <ScrollReveal key={i} delay={i * 0.04}>
                <div className="bg-card rounded-xl border border-border p-7">
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 600, marginBottom: "1rem" }}>{section.title}</h2>
                  <div className="space-y-4">
                    {section.content.split("\n\n").map((para, j) => (
                      <p key={j} style={{ fontSize: "0.9rem", lineHeight: 1.85, color: "var(--muted-foreground)" }}>{para}</p>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={0.1}>
            <div className="mt-10 p-6 rounded-xl border border-dashed border-border text-center" style={{ backgroundColor: "var(--background)" }}>
              <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", lineHeight: 1.7 }}>
                Questions about this policy? Email us at{" "}
                <a href="mailto:privacy@workwyse.com" style={{ color: "var(--accent)" }}>privacy@workwyse.com</a>
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
