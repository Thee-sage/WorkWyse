import { type ReactNode } from "react";
import { ScrollReveal } from "../ui/ScrollReveal";

interface PageHeaderProps {
  label: string;
  title: string;
  description?: string;
}

export function PageHeader({ label, title, description }: PageHeaderProps) {
  return (
    <section className="pt-28 pb-12 md:pt-36 md:pb-16 bg-secondary/30">
      <div className="max-w-6xl mx-auto px-6">
        <ScrollReveal>
          <p
            className="text-accent mb-3"
            style={{ fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            {label}
          </p>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
          {description && (
            <p
              className="text-muted-foreground mt-4 max-w-xl"
              style={{ fontSize: "1rem", lineHeight: 1.7 }}
            >
              {description}
            </p>
          )}
        </ScrollReveal>
      </div>
    </section>
  );
}
