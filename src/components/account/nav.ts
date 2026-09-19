/**
 * The pages in the signed-in shell, grouped for the account rail.
 *
 * `/account/welcome` is deliberately absent: registration is a gate, not a
 * destination, and it must not appear as somewhere you can wander back to.
 *
 * Items marked `soon` are honest placeholders — no payment or self-serve
 * checkout is surfaced from this rail yet.
 */

export type AccountNavIcon =
  | "overview"
  | "profile"
  | "products"
  | "revenue"
  | "credits"
  | "billing"
  | "memories"
  | "integrations"
  | "keys"
  | "settings";

export type AccountNavItem = {
  href: string;
  label: string;
  icon: AccountNavIcon;
  /** Shown as a quiet chip in the rail while the page is still a placeholder. */
  soon?: boolean;
};

export type AccountNavSection = {
  id: string;
  label: string;
  items: readonly AccountNavItem[];
};

export const ACCOUNT_NAV_SECTIONS: readonly AccountNavSection[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { href: "/account/", label: "Overview", icon: "overview" },
      { href: "/account/products/", label: "Product management", icon: "products", soon: true },
      { href: "/account/revenue/", label: "Revenue", icon: "revenue", soon: true },
    ],
  },
  {
    id: "connect",
    label: "Connect",
    items: [
      { href: "/account/memories/", label: "Memories", icon: "memories", soon: true },
      { href: "/account/integrations/", label: "Integrations", icon: "integrations", soon: true },
      { href: "/account/keys/", label: "Key management", icon: "keys", soon: true },
    ],
  },
  {
    id: "plan",
    label: "Plan",
    items: [
      { href: "/account/credits/", label: "Credit management", icon: "credits", soon: true },
      { href: "/account/billing/", label: "Billing", icon: "billing", soon: true },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { href: "/account/profile/", label: "Profile", icon: "profile" },
      { href: "/account/settings/", label: "Settings", icon: "settings" },
    ],
  },
];
