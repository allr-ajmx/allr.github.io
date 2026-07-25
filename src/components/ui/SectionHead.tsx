import { Reveal } from "@/components/Reveal";
import { Pill } from "@/components/ui/Pill";

export function SectionHead({
  eyebrow,
  tone = "neutral",
  title,
  children,
}: {
  eyebrow: string;
  tone?: "neutral" | "green" | "honey";
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <Reveal className="mx-auto mb-[46px] max-w-[660px] text-center">
      <Pill tone={tone} className="mb-5">
        {eyebrow}
      </Pill>
      <h2 className="mb-4 text-[clamp(1.7rem,3.4vw,2.4rem)]">{title}</h2>
      {children ? (
        <p className="text-[1.08rem] text-ink-soft">{children}</p>
      ) : null}
    </Reveal>
  );
}
