import { Mono } from "../../components/ui/primitives";

const SECTIONS = [
  { title: "1. What we collect", body: "When you contribute, we collect what you voluntarily provide: an account, evidence, a vote, or a challenge. If you publish under your handle, that handle is publicly visible. We collect standard server logs for security and debugging — we do not sell this data or share it with advertisers." },
  { title: "2. How we use it", body: "Contributions power the public record — they are displayed on the platform and attached to the listing or company they concern. Aggregate, anonymized data feeds our trust-score calculation and platform statistics." },
  { title: "3. Public nature of contributions", body: "By filing an account, evidence, or a company review, you acknowledge the content will be publicly visible, attributed to your handle. Do not include personally identifiable information about yourself or third parties in what you file." },
  { title: "4. Disputes and withdrawal", body: "You may withdraw your own contributions at any time — the withdrawal is logged, not silently erased. Anyone affected by an account or a moderator decision, including an employer, can file a challenge." },
  { title: "5. Cookies", body: "We use only essential cookies required for the platform to function (session management, CSRF protection). We do not use tracking or third-party advertising cookies." },
  { title: "6. Data security", body: "All data is transmitted over HTTPS. We use industry-standard security practices for our servers and databases, and will notify registered users of any breach affecting their personal information." },
];

export default function PrivacyPolicyPage() {
  return (
    <div>
      <div className="px-4 md:px-8 pt-12 pb-8 border-b border-border-strong">
        <Mono>LEGAL</Mono>
        <h1 className="mt-4 text-[30px] md:text-[40px] leading-[1.05] tracking-[-0.035em] font-bold">Privacy policy</h1>
        <p className="mt-3 text-[13.5px] text-muted">Last updated 22 August 2026</p>
        <p className="mt-4 font-serif text-[17px] leading-[1.6] text-muted max-w-[60ch]">
          WorkWyse is built on transparency — that applies to how we handle your data too.
        </p>
      </div>
      <div className="px-4 md:px-8 py-9 max-w-[74ch] flex flex-col">
        {SECTIONS.map((s) => (
          <div key={s.title} className="py-5 border-t border-border-soft first:border-t-0">
            <h2 className="text-[17px] font-semibold">{s.title}</h2>
            <p className="mt-2 text-[14.5px] leading-[1.7] text-muted">{s.body}</p>
          </div>
        ))}
        <p className="mt-6 text-[13.5px] text-muted">
          Questions? Email <a href="mailto:privacy@workwyse.com" className="text-accent">privacy@workwyse.com</a>.
        </p>
      </div>
    </div>
  );
}
