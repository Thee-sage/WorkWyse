import { type ReactNode } from "react";
import { motion } from "motion/react";
import { ScrollReveal } from "./ScrollReveal";
import { MarkerHighlight } from "./MarkerHighlight";

interface FeatureSectionProps {
  icon: ReactNode;
  title: string;
  description: string;
  illustration: ReactNode;
  reversed?: boolean;
}

export function FeatureSection({ icon, title, description, illustration, reversed = false }: FeatureSectionProps) {
  const words = title.split(" ");
  const lastWord = words.pop();
  const firstWords = words.join(" ");

  return (
    <div className={`flex flex-col ${reversed ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-12 md:gap-20`}>
      <ScrollReveal
        className="flex-1 max-w-lg"
        direction={reversed ? "right" : "left"}
        distance={24}
      >
        <div className="mb-4">{icon}</div>
        <h2 style={{ fontSize: "1.75rem", lineHeight: 1.3 }}>
          {firstWords}{" "}
          <MarkerHighlight delay={0.2}>{lastWord}</MarkerHighlight>
        </h2>
        <p className="mt-4 text-muted-foreground" style={{ fontSize: "1rem", lineHeight: 1.8 }}>
          {description}
        </p>
        <motion.div
          className="mt-6 h-px"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg, var(--border) 0, var(--border) 6px, transparent 6px, transparent 12px)",
            transformOrigin: reversed ? "right" : "left",
          }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        />
      </ScrollReveal>
      <ScrollReveal
        className="flex-1 flex justify-center"
        direction={reversed ? "left" : "right"}
        distance={24}
        delay={0.1}
      >
        {illustration}
      </ScrollReveal>
    </div>
  );
}
