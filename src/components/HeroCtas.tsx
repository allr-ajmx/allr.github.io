import Link from "next/link";
import { PlatformIcon } from "@/components/ui/PlatformIcon";
import { CTA } from "@/lib/brand";

const BASE =
  "inline-flex items-center justify-center gap-2.5 rounded-full border px-6 py-3 text-[1.02rem] font-bold tracking-[-0.01em] no-underline transition-[transform,box-shadow,background-color,border-color] duration-150 hover:-translate-y-0.5 active:translate-y-0";

/** Desktop gets the app; phones get on the list. */
export function HeroCtas() {
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <Link
        href="/download"
        className={`${BASE} border-transparent bg-ink text-paper shadow-[0_10px_24px_rgba(34,59,51,.22)] hover:bg-[#1a2e28]`}
      >
        <span className="inline-flex items-center gap-1.5 text-paper/85" aria-hidden="true">
          <PlatformIcon platform="macos" size={17} />
          <PlatformIcon platform="windows" size={16} />
          <PlatformIcon platform="linux" size={17} />
        </span>
        {CTA.download}
      </Link>
      <a
        href="#early-access"
        className={`${BASE} border-line bg-card text-ink shadow-soft hover:border-honey-line hover:bg-paper`}
      >
        <PlatformIcon platform="mobile" size={18} className="text-ink-soft" />
        {CTA.primary}
      </a>
    </div>
  );
}
