import { AllrMark } from "@/components/ui/AllrMark";
import { cx } from "@/lib/cx";
import type { ShowcaseId } from "@/lib/brand";

/*
 * Artifact mocks. Real UI, drawn in HTML — a slide, a page, a grid, a player,
 * a site, a phone. Each fills its parent and sizes itself from the parent's
 * width (container query units), so the same mock is crisp at 120px in a card
 * thumbnail and at 700px in the hero.
 */

const MOCK = "mock relative h-full w-full overflow-hidden bg-card text-ink";

export function DeckMock() {
  return (
    <div className={cx(MOCK, "flex flex-col")}>
      <div className="flex flex-1">
        <div className="flex w-[34%] flex-col justify-between bg-ink p-[5%] text-paper">
          <span className="text-[2.4em] leading-none font-serif">Northwind</span>
          <div>
            <p className="text-[1.15em] font-semibold opacity-90">Seed round</p>
            <p className="text-[0.8em] opacity-60">Slide 3 of 10</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-[0.6em] p-[5%]">
          <p className="text-[0.75em] font-bold tracking-[0.12em] text-honey-deep uppercase">Traction</p>
          <p className="text-[1.6em] leading-tight font-serif">Three cafés, one roastery, 41% repeat.</p>
          <div className="mt-auto flex h-[38%] items-end gap-[3%] border-b border-line pb-[1px]">
            {[28, 34, 41, 48, 55, 66, 72, 86].map((h, i) => (
              <span key={i} className={cx("flex-1 rounded-t-[2px]", i === 7 ? "bg-green" : "bg-honey-tint")} style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="flex justify-between text-[0.62em] text-ink-soft"><span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span></div>
        </div>
      </div>
      <div className="flex items-center gap-[0.5em] border-t border-line-soft bg-paper px-[3%] py-[1.2%]">
        {[1,2,3,4,5,6,7,8,9,10].map((n) => (
          <span key={n} className={cx("h-[0.5em] flex-1 rounded-[2px]", n === 3 ? "bg-honey" : "bg-line")} />
        ))}
      </div>
    </div>
  );
}

function Line({ w, dim }: { w: string; dim?: boolean }) {
  return (
    <span className={cx("block h-[0.55em] rounded-[2px]", dim ? "bg-line-soft" : "bg-line")} style={{ width: w }} />
  );
}

export function DocMock() {
  return (
    <div className={cx(MOCK, "bg-paper")}>
      <div className="mx-auto flex h-full w-[74%] flex-col gap-[0.7em] bg-card px-[6%] pt-[5%] shadow-[0_0_0_1px_var(--color-line)]">
        <p className="text-[0.62em] font-bold tracking-[0.12em] text-ink-soft uppercase">Grant proposal · Draft 1 of 1</p>
        <p className="text-[1.5em] leading-tight font-serif">Riverside Community Garden</p>
        <p className="text-[0.82em] leading-snug text-ink-soft">
          We are asking for <strong className="text-ink">$12,400</strong> to turn the vacant lot on Elm Street into forty raised beds, a tool library, and a shaded gathering space for the neighbourhood.
        </p>
        <p className="mt-[0.4em] text-[0.9em] font-bold">1. What we will build</p>
        <Line w="100%" /><Line w="92%" /><Line w="97%" /><Line w="60%" />
        <p className="mt-[0.4em] text-[0.9em] font-bold">2. Budget</p>
        <div className="grid grid-cols-[1fr_auto] gap-x-[1em] gap-y-[0.35em] text-[0.8em]">
          <span>Raised beds (40)</span><span className="font-mono">$6,800</span>
          <span>Tool library</span><span className="font-mono">$2,100</span>
          <span>Shade structure</span><span className="font-mono">$3,500</span>
        </div>
        <Line w="88%" dim /><Line w="94%" dim /><Line w="70%" dim />
      </div>
    </div>
  );
}

export function SheetMock() {
  const rows = [
    ["Rent", "4,200", "4,200", "4,200", "50,400"],
    ["Payroll", "18,500", "18,500", "21,000", "232,500"],
    ["Software", "640", "640", "640", "7,680"],
    ["Marketing", "1,200", "2,400", "2,400", "25,200"],
    ["Equipment", "900", "0", "3,200", "9,400"],
    ["Insurance", "310", "310", "310", "3,720"],
    ["Travel", "0", "850", "0", "4,100"],
    ["Total", "25,750", "26,900", "31,750", "333,000"],
  ];
  return (
    <div className={cx(MOCK, "flex flex-col text-[0.78em]")}>
      <div className="flex items-center gap-[0.6em] border-b border-line bg-paper px-[2%] py-[1%]">
        <span className="rounded-chip border border-line bg-card px-[0.6em] py-[0.15em] font-mono">F7</span>
        <span className="font-mono text-ink-soft">=SUM(B7:M7)</span>
      </div>
      <div className="grid flex-1 grid-cols-[1.6fr_1fr_1fr_1fr_1.2fr] content-start">
        {["", "Jan", "Feb", "Mar", "Year"].map((h) => (
          <span key={h} className="border-b border-r border-line-soft bg-paper px-[0.6em] py-[0.35em] font-bold text-ink-soft last:border-r-0">{h}</span>
        ))}
        {rows.map((r, i) =>
          r.map((c, j) => (
            <span
              key={`${i}-${j}`}
              className={cx(
                "border-b border-r border-line-soft px-[0.6em] py-[0.35em] last:border-r-0",
                j > 0 && "text-right font-mono tabular-nums",
                i === rows.length - 1 && "bg-green-tint font-bold text-green-deep",
                i === rows.length - 1 && j === 4 && "ring-2 ring-green ring-inset",
              )}
            >
              {c}
            </span>
          )),
        )}
        <span className="col-span-5 mt-[1em] flex flex-col gap-[0.5em] px-[0.6em] text-ink-soft">
          <span className="flex items-center justify-between"><span>Cash on hand, next 12 months</span><span>Runway at current burn: <strong className="text-ink">14 months</strong></span></span>
          <span className="flex h-[5.5em] items-end gap-[3px] border-b border-line pb-[1px]">
            {[70, 66, 62, 60, 55, 52, 50, 46, 42, 38, 33, 28].map((h, i) => (
              <span key={i} className={cx("flex-1 rounded-t-[2px]", i < 9 ? "bg-green-tint" : "bg-honey-tint")} style={{ height: `${h}%` }} />
            ))}
          </span>
        </span>
      </div>
    </div>
  );
}

export function VideoMock() {
  return (
    <div className={cx(MOCK, "flex flex-col bg-ink text-paper")}>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(80%_80%_at_30%_20%,#3a5a4a,#1a2b24_60%,#0f1a15)]">
        <span className="absolute top-[8%] left-[6%] text-[0.62em] font-bold tracking-[0.14em] text-honey uppercase">Album teaser · 0:40</span>
        <p className="max-w-[70%] text-center text-[1.9em] leading-tight font-serif">&ldquo;we kept the porch light on&rdquo;</p>
        <span className="absolute right-[6%] bottom-[8%] flex size-[2.4em] items-center justify-center rounded-full bg-paper/95 text-ink"><span className="ml-[2px] border-y-[0.45em] border-l-[0.75em] border-y-transparent border-l-ink" /></span>
      </div>
      <div className="flex items-center gap-[0.8em] px-[4%] py-[2.5%]">
        <span className="font-mono text-[0.7em] text-paper/70">0:12</span>
        <span className="relative h-[0.35em] flex-1 rounded-full bg-paper/20"><span className="absolute inset-y-0 left-0 w-[30%] rounded-full bg-honey" /></span>
        <span className="font-mono text-[0.7em] text-paper/70">0:40</span>
      </div>
    </div>
  );
}

export function SiteMock() {
  return (
    <div className={cx(MOCK, "flex flex-col bg-[#fbf6ee]")}>
      <div className="flex items-center justify-between px-[5%] py-[2.5%] text-[0.75em]">
        <span className="font-serif text-[1.3em]">June Harbor</span>
        <span className="flex gap-[1.2em] text-ink-soft"><span>Tour</span><span>Music</span><span>Press</span></span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-[0.6em] px-[8%] text-center">
        <p className="text-[0.62em] font-bold tracking-[0.14em] text-honey-deep uppercase">New album · Out Sept 12</p>
        <p className="text-[2.2em] leading-none font-serif">Porch Light</p>
        <p className="max-w-[26em] text-[0.82em] text-ink-soft">Eleven songs recorded in a farmhouse over one long winter.</p>
        <div className="mt-[0.4em] flex w-[80%] max-w-[22em] gap-[0.4em]">
          <span className="flex-1 rounded-control border border-line bg-card px-[0.8em] py-[0.45em] text-left text-[0.78em] text-ink-soft">you@email.com</span>
          <span className="rounded-control bg-ink px-[0.9em] py-[0.45em] text-[0.78em] font-bold text-paper">Notify me</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-[2%] px-[5%] pb-[4%]">
        {["#d9c9a6", "#b9c9b1", "#c9a97a"].map((c) => (
          <span key={c} className="aspect-[4/3] rounded-chip" style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

export function AppMock() {
  const habits = [
    { name: "Read 20 pages", done: [1, 1, 1, 0, 1, 1, 0] },
    { name: "Problem set", done: [1, 0, 1, 1, 1, 0, 0] },
    { name: "Sleep by 11", done: [0, 1, 1, 1, 0, 1, 1] },
  ];
  return (
    <div className={cx(MOCK, "flex items-center justify-center bg-sage-tint")}>
      <div className="flex h-[92%] w-[38%] min-w-[11em] flex-col gap-[0.8em] rounded-[1.4em] border-[0.28em] border-ink bg-card p-[1em] shadow-lift">
        <div className="flex items-center justify-between">
          <span className="text-[1.05em] font-bold">Study group</span>
          <span className="rounded-chip bg-green-tint px-[0.5em] py-[0.15em] text-[0.62em] font-bold text-green-deep">Week 6</span>
        </div>
        {habits.map((h) => (
          <div key={h.name} className="rounded-control border border-line-soft p-[0.6em]">
            <p className="mb-[0.4em] text-[0.78em] font-semibold">{h.name}</p>
            <div className="flex gap-[0.3em]">
              {h.done.map((d, i) => (
                <span key={i} className={cx("aspect-square flex-1 rounded-[3px]", d ? "bg-green" : "bg-line-soft")} />
              ))}
            </div>
          </div>
        ))}
        <span className="mt-auto rounded-control bg-ink py-[0.55em] text-center text-[0.78em] font-bold text-paper">Check in</span>
      </div>
    </div>
  );
}

export function VersionsMock() {
  const versions = [
    { v: "v4", when: "Just now", note: "Added the press kit link", live: true },
    { v: "v3", when: "Yesterday", note: "New hero photo" },
    { v: "v2", when: "Tue", note: "Mailing list signup" },
    { v: "v1", when: "Mon", note: "First launch" },
  ];
  return (
    <div className={cx(MOCK, "flex flex-col rounded-card border border-line shadow-lift !text-[clamp(11px,2.6cqw,15px)]")}>
      <div className="flex items-center justify-between border-b border-line-soft bg-paper px-[4%] py-[2.5%]">
        <span className="text-[0.85em] font-bold">Versions · album-launch</span>
        <span className="inline-flex items-center gap-[0.4em] font-mono text-[0.72em] text-ink-soft"><span className="size-[0.5em] rounded-full bg-green" />allr.app/album-launch</span>
      </div>
      <div className="flex flex-col divide-y divide-line-soft">
        {versions.map((x) => (
          <div key={x.v} className="flex items-center gap-[0.8em] px-[4%] py-[2.4%] text-[0.82em]">
            <span className="w-[2.2em] font-mono font-bold">{x.v}</span>
            <span className="flex-1 truncate">{x.note}</span>
            <span className="text-ink-soft">{x.when}</span>
            {x.live ? (
              <span className="rounded-chip bg-green px-[0.6em] py-[0.15em] text-[0.7em] font-bold tracking-[0.04em] text-white uppercase">Live</span>
            ) : (
              <span className="rounded-chip border border-line px-[0.6em] py-[0.15em] text-[0.7em] font-bold text-ink-soft">Roll back</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MockFor({ id }: { id: ShowcaseId }) {
  switch (id) {
    case "decks": return <DeckMock />;
    case "docs": return <DocMock />;
    case "spreadsheets": return <SheetMock />;
    case "video": return <VideoMock />;
    case "websites": return <SiteMock />;
    case "apps": return <AppMock />;
  }
}

/** Frame a mock at a fixed aspect. Sizes from its own width. */
export function MockFrame({
  id,
  className,
  aspect = "aspect-[16/10]",
}: {
  id: ShowcaseId;
  className?: string;
  aspect?: string;
}) {
  return (
    <div className={cx("mock-frame overflow-hidden rounded-card border border-line bg-card", aspect, className)}>
      <MockFor id={id} />
    </div>
  );
}

/** Small brand chip used inside windows. */
export function MarkChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-[0.35em] text-[0.8em] font-bold">
      <AllrMark size={14} /> {label}
    </span>
  );
}
