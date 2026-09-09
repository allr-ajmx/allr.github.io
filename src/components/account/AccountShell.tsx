"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "./AuthProvider";
import { ACCOUNT_NAV } from "./nav";
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

function Waiting({ label }: { label: string }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* Fast enough to read as "working", not as the homepage drift. */}
        <AllrMark size={44} spin spinSeconds={1.8} />
        <p className="text-[.95rem] font-bold text-ink-soft">{label}</p>
      </div>
    </div>
  );
}

function Rail() {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const router = useRouter();

  const isCurrent = (href: string) =>
    // trailingSlash: true, so both sides end in "/" and "/account/" would
    // otherwise prefix-match every page in the shell.
    pathname === href || pathname === href.replace(/\/$/, "");

  const items = (
    <>
      {ACCOUNT_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isCurrent(item.href) ? "page" : undefined}
          className={cx(
            "flex items-center justify-between gap-2 rounded-control px-3 py-2 text-[.95rem] font-bold no-underline transition-colors duration-150",
            isCurrent(item.href)
              ? "bg-green-tint text-green-deep"
              : "text-ink-soft hover:bg-line-soft hover:text-ink",
          )}
        >
          {item.label}
          {item.soon && (
            <span className="rounded-chip border border-line px-1.5 py-0.5 text-[.68rem] font-bold tracking-[0.04em] text-ink-soft uppercase">
              Soon
            </span>
          )}
        </Link>
      ))}
    </>
  );

  const signOut = async () => {
    await signOutOfAllr();
    router.replace("/login/");
  };

  return (
    <>
      {/* Wide: a rail. */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-card px-4 py-5 min-[900px]:flex">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 px-2 font-serif text-[1.4rem] text-ink no-underline transition-opacity duration-200 hover:opacity-80"
        >
          <AllrMark size={30} />
          {WORDMARK}
        </Link>

        <nav className="flex flex-col gap-1" aria-label="Account">
          {items}
        </nav>

        <div className="mt-auto border-t border-line pt-4">
          <div className="mb-3 flex items-center gap-2.5 px-2">
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
            className="w-full cursor-pointer rounded-control px-3 py-2 text-left text-[.9rem] font-bold text-ink-soft transition-colors duration-150 hover:bg-line-soft hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Narrow: a bar and a scrolling row of the same links. A drawer would
          need focus management and a scroll lock to earn four items. */}
      <div className="sticky top-0 z-40 border-b border-line bg-card min-[900px]:hidden">
        <div className="flex items-center justify-between px-5 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-serif text-[1.3rem] text-ink no-underline"
          >
            <AllrMark size={26} />
            {WORDMARK}
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="cursor-pointer text-[.88rem] font-bold text-ink-soft hover:text-ink"
          >
            Sign out
          </button>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none]"
          aria-label="Account"
        >
          {items}
        </nav>
      </div>
    </>
  );
}

function Avatar() {
  const { user } = useAuth();
  const initial = (user?.displayName || user?.email || "?").trim().charAt(0);
  // Google's photo URL is a remote host and `next/image` is unoptimized here,
  // so a plain <img> is the honest element — and it falls back to the initial
  // when Google serves nothing.
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

function Gate({ children }: { children: React.ReactNode }) {
  const { status, unreachable, refresh } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const onWelcome = pathname === WELCOME || pathname === `${WELCOME}/`;

  useEffect(() => {
    if (status === "signedOut") router.replace("/login/");
    else if (status === "needsProfile" && !onWelcome) {
      router.replace("/account/welcome/");
    } else if (status !== "needsProfile" && status !== "loading" && status !== "error" && onWelcome) {
      // Registered already — the form has nothing left to ask. This is the bug
      // that sent somebody who already had an account back to signup.
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
          {/* Actually re-runs the read. Navigating to this same page would not:
              the shell is already mounted and would ask for nothing. */}
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

  // Registration owns the whole window: no rail to wander into, because there
  // is nothing behind it to see yet.
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

export function AccountShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-dvh bg-paper">
        <Gate>{children}</Gate>
      </div>
    </AuthProvider>
  );
}
