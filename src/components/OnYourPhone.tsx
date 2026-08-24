import { DeckMock } from "@/components/mocks/Mocks";
import { Parallax } from "@/components/motion/Parallax";
import { Reveal } from "@/components/Reveal";
import { AllrMark } from "@/components/ui/AllrMark";
import { SectionHead } from "@/components/ui/SectionHead";
import { PHONE } from "@/lib/brand";

export function OnYourPhone() {
  return (
    <section id="phone" className="section-wash relative overflow-hidden py-22">
      <div className="wrap relative">
        <SectionHead eyebrow={PHONE.eyebrow} tone="green" title={PHONE.title}>
          {PHONE.sub}
        </SectionHead>

        <div className="relative mx-auto flex h-[640px] max-w-[980px] items-end justify-center sm:h-[720px]">
          {/* back phone — notification, further away, slower */}
          <Parallax speed={0.16} className="absolute bottom-10 left-[2%] hidden w-[250px] sm:block lg:left-[6%]">
            <Reveal variant="left" delay={120}>
              <Phone tilt="-6deg" dim>
                <div className="flex h-full flex-col bg-[linear-gradient(180deg,#e9efe6,#d9e3d6)] px-4 pt-14">
                  <p className="text-center font-serif text-[2.6rem] leading-none text-ink">3:02</p>
                  <p className="mt-1 text-center text-[.78rem] text-ink-soft">Thursday, 12 September</p>
                  <div className="mt-8 rounded-card bg-card/90 p-3 shadow-soft backdrop-blur">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[.7rem] font-bold"><AllrMark size={14} /> {PHONE.notif.app} <span className="ml-auto font-medium text-ink-soft">now</span></div>
                    <p className="text-[.85rem] font-bold">{PHONE.notif.title}</p>
                    <p className="text-[.8rem] text-ink-soft">{PHONE.notif.body}</p>
                  </div>
                </div>
              </Phone>
            </Reveal>
          </Parallax>

          {/* front phone — the chat, closer, faster */}
          <Parallax speed={-0.06} className="relative z-10 w-[300px] sm:w-[320px]">
            <Reveal variant="up">
              <Phone tilt="0deg">
                <div className="flex h-full flex-col bg-paper">
                  <div className="flex items-center gap-2 border-b border-line-soft bg-card px-4 pt-11 pb-3">
                    <AllrMark size={20} />
                    <span className="font-serif text-[1.05rem]">allr</span>
                    <span className="ml-auto rounded-chip bg-green-tint px-2 py-0.5 text-[.65rem] font-bold text-green-deep">3 projects</span>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-3.5 text-[.8rem]">
                    <div className="self-end rounded-card rounded-tr-[4px] bg-ink px-3 py-2 leading-snug text-paper">{PHONE.ask}</div>
                    <div className="self-start rounded-card rounded-tl-[4px] border border-line bg-card px-3 py-2 leading-snug text-ink shadow-soft">{PHONE.reply}</div>
                    <div className="mock-frame overflow-hidden rounded-card border border-line bg-card shadow-soft">
                      <div className="aspect-[16/10]"><DeckMock /></div>
                      <div className="flex items-center gap-2 border-t border-line-soft px-3 py-2">
                        <span className="live-pulse size-1.5 rounded-full bg-green" />
                        <span className="truncate font-mono text-[.7rem]">allr.app/northwind-onepager</span>
                        <span className="ml-auto rounded-chip bg-green px-2 py-0.5 text-[.6rem] font-bold tracking-[0.03em] text-white uppercase">Live</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="flex-1 rounded-control bg-ink py-2 text-center text-[.78rem] font-bold text-paper">Share</span>
                      <span className="flex-1 rounded-control border border-line bg-card py-2 text-center text-[.78rem] font-bold">Open</span>
                    </div>
                  </div>
                  <div className="mx-3.5 mb-5 flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-2.5 text-[.8rem] text-ink-soft shadow-soft">
                    Ask for anything…
                    <span className="ml-auto flex size-6 items-center justify-center rounded-full bg-green text-[.7rem] text-white">↑</span>
                  </div>
                </div>
              </Phone>
            </Reveal>
          </Parallax>

          {/* chats — floating chips, in between */}
          <Parallax speed={0.08} className="absolute right-0 bottom-24 hidden w-[200px] sm:block lg:right-[4%]">
            <Reveal variant="right" delay={200} className="flex flex-col items-start gap-2">
              <span className="text-[.8rem] font-bold text-ink-soft">{PHONE.chatsLead}</span>
              {PHONE.chats.map((c, i) => (
                <span key={c} className="stagger-child inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-[.85rem] font-bold shadow-soft" style={{ ["--i" as string]: i, ["--stagger-base" as string]: "70ms" }}>
                  <span className="size-1.5 rounded-full bg-honey" />{c}
                </span>
              ))}
            </Reveal>
          </Parallax>
        </div>

        <Reveal className="mx-auto mt-8 flex flex-wrap justify-center gap-2 text-[.85rem] font-bold text-ink-soft sm:hidden">
          {PHONE.chatsLead} {PHONE.chats.join(" · ")}
        </Reveal>
      </div>
    </section>
  );
}

function Phone({ children, tilt, dim }: { children: React.ReactNode; tilt: string; dim?: boolean }) {
  return (
    <div
      className="phone relative aspect-[9/19.5] w-full overflow-hidden rounded-[2.6rem] border-[7px] border-ink bg-ink shadow-[0_40px_90px_rgba(34,59,51,.28)]"
      style={{ rotate: tilt, opacity: dim ? 0.92 : 1 }}
    >
      <span aria-hidden="true" className="absolute top-2.5 left-1/2 z-10 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-ink" />
      <div className="h-full w-full overflow-hidden rounded-[2.1rem]">{children}</div>
    </div>
  );
}
