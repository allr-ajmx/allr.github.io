"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/ui/Button";
import { PlatformIcon } from "@/components/ui/PlatformIcon";
import {
  DESKTOP_LABELS,
  type AppConfig,
  type DesktopPlatform,
} from "@/lib/account/app-config";

/**
 * The three ways in.
 *
 * Mobile is listed only for the tracks somebody actually joined — offering an
 * iOS build to someone who chose Android is offering them nothing, and a
 * download button that cannot work is worse than no button.
 *
 * Links come from `app_configuration` so a bad build can be rolled back from
 * the database. When it falls back to GitHub the desktop links still work and
 * the phone builds are simply absent, which is the truth.
 */
export function WorkspaceAccess() {
  const { profile } = useAuth();
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/app-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => live && setConfig(c))
      .catch(() => live && setConfig(null));
    return () => {
      live = false;
    };
  }, []);

  if (!profile) return null;
  const downloads = config?.current?.downloads ?? {};
  const chosen = profile.mobilePlatforms;

  return (
    <section className="rounded-card border border-line bg-card p-6 shadow-soft">
      <h2 className="mb-1 font-serif text-[1.2rem] text-ink">
        Reach your workspace
      </h2>
      <p className="mb-5 text-[.96rem] leading-[1.7] text-ink-soft">
        The same workspace, wherever you open it.
        {config?.current && (
          <>
            {" "}
            Current version{" "}
            <span className="font-bold text-ink">{config.current.version}</span>.
          </>
        )}
      </p>

      <div className="flex flex-col gap-3">
        <Row
          title="On the web"
          detail={profile.workspace_address ?? "Your dashboard"}
          action={
            profile.workspace_address ? (
              <Button href={profile.workspace_address} size="sm">
                Open dashboard
              </Button>
            ) : null
          }
        />

        {(["macos", "windows", "linux"] as DesktopPlatform[]).map((p) =>
          downloads[p] ? (
            <Row
              key={p}
              icon={<PlatformIcon platform={p} size={18} />}
              title={DESKTOP_LABELS[p]}
              detail="Desktop app"
              action={
                <Button href={downloads[p]!} variant="ghost" size="sm">
                  Download
                </Button>
              }
            />
          ) : null,
        )}

        {chosen.length === 0 ? (
          <p className="text-[.9rem] text-ink-soft">
            You aren’t in a phone testing track. Pick one under Profile.
          </p>
        ) : (
          chosen.map((p) => (
            <Row
              key={p}
              icon={<PlatformIcon platform="mobile" size={18} />}
              title={p === "ios" ? "iPhone" : "Android"}
              detail={downloads[p] ? "Testing build" : "Invite on its way"}
              action={
                downloads[p] ? (
                  <Button href={downloads[p]!} variant="ghost" size="sm">
                    Get the build
                  </Button>
                ) : (
                  <span className="text-[.85rem] font-bold text-ink-soft">
                    Soon
                  </span>
                )
              }
            />
          ))
        )}
      </div>
    </section>
  );
}

function Row({
  icon,
  title,
  detail,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  detail: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line-soft px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {icon && <span className="shrink-0 text-ink-soft">{icon}</span>}
        <div className="min-w-0">
          <p className="text-[.95rem] font-bold text-ink">{title}</p>
          <p className="truncate text-[.85rem] text-ink-soft">{detail}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
