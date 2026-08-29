import { AllrMark } from "@/components/ui/AllrMark";
import { cx } from "@/lib/cx";

/*
 * The two drawn screens on `/app`.
 *
 * MOTION.md §5: every artifact on the site is drawn UI, never a photograph.
 * These follow the same rules as `mocks/Mocks.tsx` — each fills its parent and
 * sizes itself from the parent's width (`.mock` sets a container-query font
 * size), so the same drawing is crisp inside a 112px phone and a 700px laptop.
 */

const SCREEN = "mock-frame h-full w-full";

/** The desktop workspace: files, the work in progress, and Allr beside it. */
export function WorkspaceMock() {
  const files = ["launch/", "deck.key", "site/", "notes.md", "press.pdf"];
  const lines: { w: string; tone?: "add" | "dim" }[] = [
    { w: "72%" },
    { w: "54%", tone: "add" },
    { w: "88%" },
    { w: "40%", tone: "dim" },
    { w: "64%" },
    { w: "78%", tone: "add" },
    { w: "48%" },
  ];

  return (
    <div className={SCREEN}>
      <div className="mock flex h-full w-full flex-col bg-paper text-ink">
        {/* title bar */}
        <div className="flex items-center gap-[0.6em] border-b border-line-soft bg-card px-[0.9em] py-[0.5em]">
          <AllrMark size={11} />
          <span className="text-[0.72em] font-bold">Album launch</span>
          <span className="ml-auto rounded-chip bg-green-tint px-[0.5em] py-[0.12em] text-[0.58em] font-bold text-green-deep">
            Live
          </span>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* files */}
          <div className="flex w-[22%] shrink-0 flex-col gap-[0.42em] border-r border-line-soft bg-card px-[0.7em] py-[0.7em]">
            {files.map((f, i) => (
              <span
                key={f}
                className={cx(
                  "truncate rounded-[0.3em] px-[0.4em] py-[0.2em] text-[0.62em] font-semibold",
                  i === 1 ? "bg-honey-tint text-honey-deep" : "text-ink-soft",
                )}
              >
                {f}
              </span>
            ))}
          </div>

          {/* the work */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-1 flex-col gap-[0.4em] px-[0.9em] py-[0.8em]">
              {lines.map((l, i) => (
                <span
                  key={i}
                  className={cx(
                    "h-[0.42em] rounded-full",
                    l.tone === "add"
                      ? "bg-green/45"
                      : l.tone === "dim"
                        ? "bg-line"
                        : "bg-ink/18",
                  )}
                  style={{ width: l.w }}
                />
              ))}
            </div>
            {/* the running step */}
            <div className="border-t border-line-soft bg-ink px-[0.9em] py-[0.55em]">
              <span className="text-[0.6em] font-semibold text-paper/70">
                building site …
              </span>
              <span className="mt-[0.35em] block h-[0.22em] w-[62%] rounded-full bg-honey" />
            </div>
          </div>

          {/* Allr */}
          <div className="flex w-[28%] shrink-0 flex-col gap-[0.5em] border-l border-line-soft bg-card px-[0.7em] py-[0.7em]">
            <span className="ml-auto max-w-[88%] rounded-[0.6em] rounded-br-[0.2em] bg-green-tint px-[0.55em] py-[0.35em] text-[0.58em] font-semibold text-green-deep">
              Make the launch site
            </span>
            <span className="max-w-[92%] rounded-[0.6em] rounded-bl-[0.2em] bg-paper px-[0.55em] py-[0.35em] text-[0.58em] text-ink-soft">
              Done — it&rsquo;s live at your link.
            </span>
            <span className="mt-auto rounded-control bg-paper px-[0.55em] py-[0.35em] text-[0.58em] text-ink-soft/70">
              Describe it…
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The same thing on a phone: one conversation, one finished link. */
export function PhoneChatMock() {
  return (
    <div className={SCREEN}>
      <div className="mock flex h-full w-full flex-col bg-paper text-ink">
        <div className="flex items-center justify-center gap-[0.4em] border-b border-line-soft bg-card py-[0.7em]">
          <AllrMark size={9} />
          <span className="text-[0.7em] font-bold">allr</span>
        </div>
        <div className="flex flex-1 flex-col gap-[0.5em] px-[0.7em] py-[0.8em]">
          <span className="ml-auto max-w-[82%] rounded-[0.8em] rounded-br-[0.25em] bg-green-tint px-[0.6em] py-[0.4em] text-[0.62em] font-semibold text-green-deep">
            Add the tour dates
          </span>
          <span className="max-w-[86%] rounded-[0.8em] rounded-bl-[0.25em] bg-card px-[0.6em] py-[0.4em] text-[0.62em] text-ink-soft">
            Added. New version is live.
          </span>
          <span className="max-w-[86%] rounded-control border border-green-line bg-card px-[0.6em] py-[0.4em] text-[0.58em] font-bold text-green-deep">
            allr.app/album-launch
          </span>
        </div>
        <div className="border-t border-line-soft bg-card px-[0.7em] py-[0.6em]">
          <span className="block rounded-control bg-paper px-[0.6em] py-[0.4em] text-[0.6em] text-ink-soft/70">
            Describe it…
          </span>
        </div>
      </div>
    </div>
  );
}
