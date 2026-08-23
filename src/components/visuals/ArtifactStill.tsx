import Image from "next/image";
import { asset } from "@/lib/asset";
import { cx } from "@/lib/cx";
import { ARTIFACTS, type ArtifactId, type ArtifactState } from "@/lib/visuals";

export function ArtifactStill({
  id,
  state = "idle",
  sizes,
  className,
  bare = false,
}: {
  id: ArtifactId;
  state?: ArtifactState;
  /** next/image sizes hint, e.g. "(max-width: 720px) 50vw, 220px" */
  sizes: string;
  className?: string;
  /** Photo only — parent owns the frame (console tiles). */
  bare?: boolean;
}) {
  const still = ARTIFACTS[id];

  return (
    <div
      className={cx(
        "artifact-still",
        !bare && "aspect-[4/3] w-full",
        bare && "border-0 shadow-none rounded-none",
        state === "working" && "artifact-still--working",
        state === "done" && "artifact-still--done",
        className,
      )}
    >
      <Image
        src={asset(still.src)}
        alt={still.alt}
        fill
        sizes={sizes}
        className="artifact-still__photo"
        unoptimized
      />
      <span className="artifact-still__sweep" aria-hidden="true" />
      <span className="artifact-still__bar" aria-hidden="true" />
    </div>
  );
}
