import Image from "next/image";
import { asset } from "@/lib/asset";
import { cx } from "@/lib/cx";

export type FrameVariant = "laptop" | "desktop" | "phone" | "flat";

/**
 * Puts a screen inside a frame that crops its own edges.
 *
 * What goes on the screen, in order of preference:
 *
 * 1. `children` — a drawn UI mock. This is the normal case here. MOTION.md is
 *    explicit that every artifact on the site is drawn HTML, never a
 *    photograph, so the app page fills its frames with mocks.
 * 2. `src` — a real capture, for the day we ship one. Raw captures arrive with
 *    an OS window border, a shadow fringe and hard 90° corners, none of which
 *    suit the page. Rather than editing every file, the frame clips: the shell
 *    is `overflow-hidden` and the image sits `bleed` pixels outside it on every
 *    side, so those pixels are simply never painted.
 * 3. Neither — a correctly-sized placeholder, so a layout still has its real
 *    rhythm before any content exists.
 */
export function DeviceFrame({
  variant = "laptop",
  src,
  alt,
  width,
  height,
  bleed = 2,
  priority = false,
  className,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  children,
}: {
  variant?: FrameVariant;
  /** Path under `public/`. Ignored when `children` is given. */
  src?: string;
  alt: string;
  width: number;
  height: number;
  /** Source pixels cropped off every edge. Only applies to `src`. */
  bleed?: number;
  priority?: boolean;
  className?: string;
  sizes?: string;
  /** A drawn mock to show instead of an image. */
  children?: React.ReactNode;
}) {
  const media = children ? (
    <div className="absolute inset-0 overflow-hidden">{children}</div>
  ) : (
    <div
      className="absolute overflow-hidden"
      style={{ inset: `${-bleed}px` }}
      aria-hidden={src ? undefined : "true"}
    >
      {src ? (
        <Image
          src={asset(src)}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          priority={priority}
          unoptimized
          className="size-full object-cover"
        />
      ) : (
        <Placeholder variant={variant} />
      )}
    </div>
  );

  const screen = (radius: string) => (
    <div
      className={cx("relative overflow-hidden", radius)}
      style={{ aspectRatio: `${width} / ${height}` }}
      role={children ? "img" : undefined}
      aria-label={children ? alt : undefined}
    >
      {media}
    </div>
  );

  // A lid on a base — reads unmistakably as a computer, so the phone beside it
  // reads as a phone without either being labelled.
  if (variant === "laptop") {
    return (
      <div className={className}>
        <div className="rounded-[17px] bg-ink p-2.5 shadow-lift">
          {screen("rounded-[9px] bg-card")}
        </div>
        <div className="relative left-1/2 h-2.5 w-[107%] -translate-x-1/2 rounded-b-[11px] bg-[#1B3129] shadow-[0_12px_22px_rgba(34,59,51,.16)]">
          <span
            className="absolute top-0 left-1/2 h-[3px] w-16 -translate-x-1/2 rounded-b-full bg-white/15"
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }

  // A modern iPhone: titanium rail, an even black bezel on all four sides, and
  // the buttons where they actually sit. Every dimension is a percentage of the
  // frame's own width, because this renders at 112px in the app hero and could
  // render at 400px elsewhere — the fixed 36px --radius-phone was a 32% corner
  // at hero size, which is what made it read as a blob rather than a phone.
  //
  // Note the bezel is even top and bottom. Phones since the X have no chin;
  // giving one a deeper bottom rail is what makes it look like the wrong phone.
  if (variant === "phone") {
    return (
      <div className={cx("relative", className)}>
        <SideButtons />
        {/* rail */}
        <div className="rounded-[13%/6%] bg-[linear-gradient(150deg,#9C968E,#6B655F_38%,#8B857D_68%,#5A554F)] p-[1.6%] shadow-lift">
          {/* bezel */}
          <div className="rounded-[12%/5.6%] bg-ink p-[2.6%]">
            {screen("rounded-[10.6%/4.9%] bg-card")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cx(
        "overflow-hidden rounded-frame border border-line bg-card shadow-lift",
        className,
      )}
    >
      {variant === "desktop" ? <WindowBar /> : null}
      {screen("")}
    </div>
  );
}

/** Reads as an app window without imitating any particular OS. */
function WindowBar() {
  return (
    <div
      className="flex h-[34px] items-center gap-1.5 border-b border-line-soft bg-paper px-3.5"
      aria-hidden="true"
    >
      <span className="size-2.5 rounded-full bg-honey" />
      <span className="size-2.5 rounded-full bg-green" />
      <span className="size-2.5 rounded-full bg-line" />
    </div>
  );
}

/** Stands in when a frame has neither a mock nor a capture. */
function Placeholder({ variant }: { variant: FrameVariant }) {
  return (
    <div className="flex size-full items-center justify-center bg-sage-tint text-ink-soft/70">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={variant === "phone" ? "size-7" : "size-10"}
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <circle cx="8.5" cy="9.5" r="1.8" />
        <path d="M21 16l-5-5-6 6" />
      </svg>
    </div>
  );
}

/**
 * Volume rocker and action button on the left, power on the right. Sized in
 * percentages so they stay proportional at any frame width, and drawn behind
 * the rail's own gradient so they read as part of the same machined edge.
 */
function SideButtons() {
  const rail =
    "absolute w-[1.5%] min-w-[1.5px] rounded-full bg-[linear-gradient(180deg,#8D877F,#615C57)]";
  return (
    <span aria-hidden="true">
      <span className={cx(rail, "top-[16%] left-[-1%] h-[4.5%] rounded-r-none")} />
      <span className={cx(rail, "top-[24%] left-[-1%] h-[8%] rounded-r-none")} />
      <span className={cx(rail, "top-[34%] left-[-1%] h-[8%] rounded-r-none")} />
      <span className={cx(rail, "top-[27%] right-[-1%] h-[11%] rounded-l-none")} />
    </span>
  );
}
