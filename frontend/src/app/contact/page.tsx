import { Mono } from "../../components/ui/primitives";

const CHANNELS = [
  { title: "General inquiries", email: "hello@workwyse.com", sub: "Response within 1–3 business days." },
  { title: "Disputes & challenges", email: "disputes@workwyse.com", sub: "Reviewed within 24 hours." },
  { title: "Report a bug", email: "bugs@workwyse.com", sub: "Helps us fix things for everyone." },
  { title: "Press & media", email: "press@workwyse.com", sub: "Interviews, data, research requests." },
];

const FAQ = [
  { q: "How do I get an account or evidence item removed?", a: "If you filed it yourself, withdraw it from your Profile — the withdrawal is logged, not silently erased. If you believe something about you is wrong, file a challenge from the record; a moderator decides." },
  { q: "Can a company officially respond to a report?", a: "Yes, through the right-of-reply process described in How This Works. Replies are published unedited, above the reports they answer." },
  { q: "How long do moderation decisions take?", a: "Evidence is typically checked within 48 hours. Urgent safety issues are prioritized." },
];

export default function ContactPage() {
  return (
    <div>
      <div className="px-4 md:px-8 pt-12 pb-8 border-b border-border-strong">
        <Mono>CONTACT</Mono>
        <h1 className="mt-4 text-[32px] md:text-[44px] leading-[1.05] tracking-[-0.04em] font-bold max-w-[20ch]">Get in touch</h1>
        <p className="mt-4 font-serif text-[18px] leading-[1.6] text-muted max-w-[56ch]">
          Have a question, a challenge to file, or want to say hello? We read every message.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b border-border-strong">
        {CHANNELS.map((c) => (
          <div key={c.title} className="px-6 py-6 border-r border-b sm:border-b-0 border-border-soft">
            <div className="text-[15px] font-semibold">{c.title}</div>
            <a href={`mailto:${c.email}`} className="mt-1.5 block text-[13.5px] text-accent">{c.email}</a>
            <div className="mt-1 text-[12.5px] text-muted">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="px-4 md:px-8 py-9 max-w-[70ch]">
        <Mono>COMMON QUESTIONS</Mono>
        <div className="mt-4 flex flex-col">
          {FAQ.map((f) => (
            <div key={f.q} className="py-5 border-t border-border-soft first:border-t-0">
              <div className="text-[16px] font-semibold">{f.q}</div>
              <p className="mt-2 text-[14.5px] leading-[1.65] text-muted">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
