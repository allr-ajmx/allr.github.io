/**
 * The pages in the signed-in shell.
 *
 * `/account/welcome` is deliberately absent: registration is a gate, not a
 * destination, and it must not appear as somewhere you can wander back to.
 */

export type AccountNavItem = {
  href: string;
  label: string;
  /** Shown as a quiet chip in the rail while the page is still a placeholder. */
  soon?: boolean;
};

export const ACCOUNT_NAV: readonly AccountNavItem[] = [
  { href: "/account/", label: "Overview" },
  { href: "/account/profile/", label: "Profile" },
  { href: "/account/billing/", label: "Billing", soon: true },
  { href: "/account/settings/", label: "Settings" },
];
