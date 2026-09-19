"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "./AuthProvider";
import { ACCOUNT_NAV_SECTIONS, type AccountNavItem } from "./nav";
import {
  CloseIcon,
  MenuIcon,
  NavIcon,
  PanelCloseIcon,
  PanelOpenIcon,
  SignOutIcon,
} from "./NavIcons";
import { AllrMark } from "@/components/ui/AllrMark";
import { signOutOfAllr } from "@/lib/firebase/auth";
import { WORDMARK } from "@/lib/brand";
import { cx } from "@/lib/cx";

/**
 * The signed-in chrome, and the gate in front of it.
 *
 * The site is a static export, so this page ships to the browser as HTML that
 * knows nothing about who is asking — there is no middleware and no cookie to
 * check. The redirect below is therefore a courtesy, not a lock: the lock is
 * `firebase/firestore.rules`, which is what actually refuses to hand anyone
 * else's data over. Nothing secret is ever in the exported HTML.
 *
 * No `AmbientShader` here (DESIGN.md §16). The shader is one fixed
 * full-viewport WebGL canvas; behind a dense dashboard it fights the content
 * and holds a GPU context on every navigation. Flat paper instead.
 */

/** Registration is a gate inside the shell, so it renders without the rail. */
const WELCOME = "/account/welcome";
const RAIL_COLLAPSED_KEY = "allr-account-rail-collapsed";

function Waiting({ label }: { label: string }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <AllrMark size={44} spin spinSeconds={1.8} />
        <p className="text-[.95rem] font-bold text-ink-soft">{label}</p>
      </div>
    </div>
  );
}

function isCurrentPath(pathname: string, href: string) {
  // trailingSlash: true, so both sides end in "/" and "/account/" would
  // otherwise prefix-match every page in the shell.
  return pathname === href || pathname === href.replace(/\/$/, "");
}

/**
 * The desktop rail's collapsed preference, kept in localStorage.
 *
 * Read as an external store rather than copied into state after mount: the
 * preference lives outside React, and `useSyncExternalStore` reads it during
 * render. When storage is blocked (private mode) the choice still holds for the
 * session, in memory.
 */
const railListeners = new Set<() => void>();
let railCollapsedInMemory = false;

function subscribeRail(onChange: () => void) {
  railListeners.add(onChange);
  // Another tab changing the preference updates this one too.
  window.addEventListener("storage", onChange);
  return () => {
    railListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readRailCollapsed() {
  try {
    const stored = window.localStorage.getItem(RAIL_COLLAPSED_KEY);
    return stored === null ? railCollapsedInMemory : stored === "1";
  } catch {
    return railCollapsedInMemory;
  }
}

const subscribeNothing = () => () => {};

function useRailCollapsed() {
  const collapsed = useSyncExternalStore(subscribeRail, readRailCollapsed, () => false);
  // False on the server and while hydrating, true once rendering in the
  // browser, so the rail stays hidden until it knows which width it should be.
  const ready = useSyncExternalStore(subscribeNothing, () => true, () => false);

  const set = useCallback((next: boolean) => {
    railCollapsedInMemory = next;
    try {
      window.localStorage.setItem(RAIL_COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // Ignore — the in-memory value still applies for this session.
    }
    railListeners.forEach((listener) => listener());
  }, []);

  return { collapsed, setCollapsed: set, ready };
}

function NavLink({
  item,
  current,
  collapsed,
  onNavigate,
}: {
  item: AccountNavItem;
  current: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-current={current ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={cx(
        "group/link flex items-center gap-2.5 rounded-control text-[.95rem] font-bold no-underline transition-colors duration-150",
        collapsed ? "justify-center px-2 py-2.5" : "justify-between px-3 py-2",
        current
          ? "bg-green-tint text-green-deep"
          : "text-ink-soft hover:bg-line-soft hover:text-ink",
      )}
    >
      <span className={cx("flex min-w-0 items-center gap-2.5", collapsed && "justify-center")}>
        <NavIcon name={item.icon} className="size-[1.15rem] shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </span>
      {!collapsed && item.soon && (
        <span className="shrink-0 rounded-chip border border-line px-1.5 py-0.5 text-[.68rem] font-bold tracking-[0.04em] text-ink-soft uppercase">
          Soon
        </span>
      )}
    </Link>
  );
}

function NavSections({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {ACCOUNT_NAV_SECTIONS.map((section) => (
        <div key={section.id}>
          {!collapsed && (
            <p className="mb-1.5 px-3 text-[.68rem] font-bold tracking-[0.08em] text-ink-soft uppercase">
              {section.label}
            </p>
          )}
          {collapsed && (
            <div
              className="mx-auto mb-1.5 h-px w-6 bg-line"
              aria-hidden="true"
              title={section.label}
            />
          )}
          <div className="flex flex-col gap-0.5" role="group" aria-label={section.label}>
            {section.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                current={isCurrentPath(pathname, item.href)}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Rail() {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const router = useRouter();
  const { collapsed, setCollapsed, ready } = useRailCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Navigating must not leave the drawer open over the new page. Adjusting
  // state while rendering, rather than in an effect, closes it in the same
  // render the route changes in.
  const [drawerPath, setDrawerPath] = useState(pathname);
  if (drawerPath !== pathname) {
    setDrawerPath(pathname);
    setMobileOpen(false);
  }
  const drawerId = useId();

  const signOut = async () => {
    await signOutOfAllr();
    router.replace("/login/");
  };

  // Lock scroll and close on Escape while the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  // Nor should resizing up to desktop.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const onChange = () => {
      if (mq.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      {/* Desktop rail */}
      <aside
        className={cx(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-card py-5 transition-[width] duration-200 ease-out min-[900px]:flex",
          collapsed ? "w-[72px] px-2" : "w-[260px] px-4",
          !ready && "opacity-0",
        )}
        data-collapsed={collapsed ? "true" : "false"}
      >
        <div
          className={cx(
            "mb-5 flex items-center",
            collapsed ? "flex-col gap-2" : "justify-between gap-2 px-1",
          )}
        >
          {collapsed ? (
            <div className="relative flex w-full justify-center">
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                aria-expanded={false}
                aria-label="Open sidebar"
                title="Open sidebar"
                className="group relative grid size-11 place-items-center rounded-control text-ink transition-colors duration-150 hover:bg-line-soft"
              >
                <AllrMark size={28} />
                <span
                  className={cx(
                    "pointer-events-none absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full border border-line bg-card text-ink shadow-soft",
                    "scale-90 opacity-0 transition-all duration-150",
                    "group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100",
                  )}
                  aria-hidden="true"
                >
                  <PanelOpenIcon className="size-3.5" />
                </span>
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/"
                className="inline-flex min-w-0 items-center gap-2 px-1 font-serif text-[1.35rem] text-ink no-underline transition-opacity duration-200 hover:opacity-80"
              >
                <AllrMark size={28} />
                <span className="truncate">{WORDMARK}</span>
              </Link>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-expanded={true}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="grid size-9 shrink-0 place-items-center rounded-control text-ink-soft transition-colors duration-150 hover:bg-line-soft hover:text-ink"
              >
                <PanelCloseIcon />
              </button>
            </>
          )}
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto" aria-label="Account">
          <NavSections pathname={pathname} collapsed={collapsed} />
        </nav>

        <div className="mt-auto border-t border-line pt-4">
          <div
            className={cx(
              "mb-3 flex items-center gap-2.5",
              collapsed ? "justify-center px-0" : "px-2",
            )}
            title={collapsed ? profile?.name || user?.displayName || "Signed in" : undefined}
          >
            <Avatar />
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[.9rem] font-bold text-ink">
                  {profile?.name || user?.displayName || "Signed in"}
                </p>
                <p className="truncate text-[.8rem] font-semibold text-ink-soft">
                  {user?.email}
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={signOut}
            title={collapsed ? "Sign out" : undefined}
            aria-label={collapsed ? "Sign out" : undefined}
            className={cx(
              "cursor-pointer rounded-control text-[.9rem] font-bold text-ink-soft transition-colors duration-150 hover:bg-line-soft hover:text-ink",
              collapsed
                ? "mx-auto grid size-10 place-items-center"
                : "flex w-full items-center gap-2.5 px-3 py-2 text-left",
            )}
          >
            {collapsed ? <SignOutIcon className="size-[1.15rem]" /> : "Sign out"}
          </button>
        </div>
      </aside>

      {/* Mobile top bar + hamburger drawer */}
      <div className="sticky top-0 z-40 border-b border-line bg-card min-[900px]:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-serif text-[1.25rem] text-ink no-underline"
          >
            <AllrMark size={26} />
            {WORDMARK}
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
            aria-controls={drawerId}
            aria-label="Open menu"
            className="grid size-10 place-items-center rounded-control text-ink transition-colors duration-150 hover:bg-line-soft"
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 min-[900px]:hidden" role="presentation">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/35"
            onClick={() => setMobileOpen(false)}
          />
          <div
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-label="Account menu"
            className="absolute inset-y-0 right-0 flex w-[min(100%,320px)] flex-col bg-card shadow-soft"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="font-serif text-[1.2rem] text-ink">Menu</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="grid size-10 place-items-center rounded-control text-ink transition-colors duration-150 hover:bg-line-soft"
              >
                <CloseIcon />
              </button>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Account">
              <NavSections
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            </nav>

            <div className="border-t border-line px-4 py-4">
              <div className="mb-3 flex items-center gap-2.5">
                <Avatar />
                <div className="min-w-0">
                  <p className="truncate text-[.9rem] font-bold text-ink">
                    {profile?.name || user?.displayName || "Signed in"}
                  </p>
                  <p className="truncate text-[.8rem] font-semibold text-ink-soft">
                    {user?.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="w-full cursor-pointer rounded-control px-3 py-2.5 text-left text-[.9rem] font-bold text-ink-soft transition-colors duration-150 hover:bg-line-soft hover:text-ink"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Avatar() {
  const { user } = useAuth();
  const initial = (user?.displayName || user?.email || "?").trim().charAt(0);
  if (user?.photoURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.photoURL}
        alt=""
        width={32}
        height={32}
        referrerPolicy="no-referrer"
        className="size-8 shrink-0 rounded-full border border-line object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="grid size-8 shrink-0 place-items-center rounded-full bg-green-tint text-[.9rem] font-bold text-green-deep uppercase"
    >
      {initial}
    </span>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const { status, unreachable, refresh } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const onWelcome = pathname === WELCOME || pathname === `${WELCOME}/`;

  useEffect(() => {
    if (status === "signedOut") router.replace("/login/");
    else if (status === "needsProfile" && !onWelcome) {
      router.replace("/account/welcome/");
    } else if (
      status !== "needsProfile" &&
      status !== "loading" &&
      status !== "error" &&
      onWelcome
    ) {
      router.replace("/account/");
    }
  }, [status, onWelcome, router]);

  if (status === "loading") return <Waiting label="One moment…" />;
  if (status === "signedOut") return <Waiting label="Taking you to sign in…" />;

  if (status === "error") {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <div className="prose-block text-center">
          <h1 className="mb-3 font-serif text-[1.6rem] text-ink">
            {unreachable
              ? "We couldn\u2019t reach your account"
              : "Something went wrong loading your account"}
          </h1>
          <p className="mb-6">
            {unreachable
              ? "Nothing answered when we asked for your details. That is usually a connection dropping out \u2014 your account is untouched."
              : "Your details are there; we just could not read them. Signing out and back in is the quickest fix."}
          </p>
          <button
            type="button"
            disabled={retrying}
            onClick={async () => {
              setRetrying(true);
              await refresh();
              setRetrying(false);
            }}
            className="cursor-pointer rounded-control border border-line bg-card px-5 py-2.5 font-bold text-ink transition-colors duration-150 hover:border-[#D8CFBB] hover:bg-paper disabled:cursor-wait disabled:opacity-70"
          >
            {retrying ? "Trying\u2026" : "Try again"}
          </button>
        </div>
      </div>
    );
  }

  if (status === "needsProfile") {
    if (!onWelcome) return <Waiting label="Just one more step…" />;
    return <main className="min-h-dvh">{children}</main>;
  }

  if (onWelcome) return <Waiting label="You’re already set up…" />;

  return (
    <div className="flex min-h-dvh flex-col min-[900px]:flex-row">
      <Rail />
      <main className="min-w-0 flex-1 px-6 py-9 min-[900px]:px-10 min-[900px]:py-12">
        <div className="mx-auto w-full max-w-[820px]">{children}</div>
      </main>
    </div>
  );
}

export function AccountShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-dvh bg-paper">
        <Gate>{children}</Gate>
      </div>
    </AuthProvider>
  );
}
