import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/Button";

export function FinalCta() {
  return (
    <section id="final" className="pt-5 pb-22">
      <div className="wrap">
        <Reveal className="relative overflow-hidden rounded-[34px] bg-[linear-gradient(160deg,var(--color-green),var(--color-green-deep))] px-[30px] py-[74px] text-center text-white shadow-[0_28px_70px_rgba(30,122,73,.32)]">
          <span
            aria-hidden="true"
            className="absolute -top-[140px] -left-[100px] size-[300px] rounded-full bg-white/10"
          />
          <span
            aria-hidden="true"
            className="absolute -right-[150px] -bottom-[220px] size-[400px] rounded-full bg-white/10"
          />

          <h2 className="relative z-10 mb-4 text-[clamp(2rem,4.2vw,2.9rem)]">
            Stop stitching. Start shipping.
          </h2>
          <p className="relative z-10 mb-8 text-[1.15rem] opacity-95">
            Describe what you want. Get finished work. Share it with the world.
          </p>
          <Button href="#top" variant="white" size="lg" className="relative z-10">
            Start creating free
          </Button>
          <p className="relative z-10 mt-4 text-[.95rem] opacity-85">
            No credit card required. Your first project is on us.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
