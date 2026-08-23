import Link from "next/link";

export default function Footer() {
  return (
    <div className="flex flex-wrap items-center gap-4 md:gap-6 px-4 md:px-8 py-5 font-mono text-[10px] tracking-[0.1em] text-muted-foreground border-t border-border-strong">
      <span>WORKWYSE</span>
      <Link href="/about" className="hover:text-ink">HOW THIS WORKS</Link>
      <Link href="/about?section=moderation" className="hover:text-ink">MODERATION POLICY</Link>
      <Link href="/about?section=what" className="hover:text-ink">RIGHT OF REPLY</Link>
      <Link href="/contact" className="hover:text-ink">CONTACT</Link>
      <Link href="/privacy" className="hover:text-ink">PRIVACY</Link>
      <span className="md:ml-auto normal-case tracking-normal text-[11px]">
        Every record shows its sources · every contribution is attributed
      </span>
    </div>
  );
}
