import type { AccountNavIcon } from "./nav";

/** Stroke icons for the account rail — `currentColor`, 20×20 viewBox. */
export function NavIcon({
  name,
  className = "size-5 shrink-0",
}: {
  name: AccountNavIcon;
  className?: string;
}) {
  const common = {
    viewBox: "0 0 20 20",
    fill: "none",
    "aria-hidden": true as const,
    className,
  };

  switch (name) {
    case "overview":
      return (
        <svg {...common}>
          <path
            d="M3.5 8.5 10 3l6.5 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-4V17H4.5a1 1 0 0 1-1-1V8.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "profile":
      return (
        <svg {...common}>
          <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M4 16.5c1.2-2.4 3.2-3.5 6-3.5s4.8 1.1 6 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "products":
      return (
        <svg {...common}>
          <path
            d="M3.5 7.2 10 3.5l6.5 3.7v5.6L10 16.5 3.5 12.8V7.2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M10 9.5v7M3.5 7.2 10 9.5l6.5-2.3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "revenue":
      return (
        <svg {...common}>
          <path
            d="M3.5 14.5 7.5 10l3 3 6-7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13 6h3.5v3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "credits":
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M10 6.5v7M8 8.2c.5-.7 1.2-1 2-1s1.6.4 1.6 1.3c0 1.8-3.6 1-3.6 3 0 .9.8 1.4 2 1.4s1.5-.3 2-.9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "billing":
      return (
        <svg {...common}>
          <rect
            x="2.5"
            y="5"
            width="15"
            height="10"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M2.5 8.5h15" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M5.5 12h3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "memories":
      return (
        <svg {...common}>
          <path
            d="M10 3.5c2.8 0 5 2.1 5 4.8 0 3.4-3.2 6.2-5 7.7-1.8-1.5-5-4.3-5-7.7 0-2.7 2.2-4.8 5-4.8Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="8.5" r="1.5" fill="currentColor" />
        </svg>
      );
    case "integrations":
      return (
        <svg {...common}>
          <path
            d="M8 5.5V4a1.5 1.5 0 0 1 3 0v1.5M8 14.5V16a1.5 1.5 0 0 0 3 0v-1.5M5.5 8H4a1.5 1.5 0 0 0 0 3h1.5M14.5 8H16a1.5 1.5 0 0 1 0 3h-1.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <rect
            x="7"
            y="7"
            width="6"
            height="6"
            rx="1.2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "keys":
      return (
        <svg {...common}>
          <circle cx="7.5" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M10.5 10h6v2.5M14 10v2.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M10 3.5v1.4M10 15.1v1.4M3.5 10h1.4M15.1 10h1.4M5.4 5.4l1 1M13.6 13.6l1 1M14.6 5.4l-1 1M6.4 13.6l-1 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

export function MenuIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CloseIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M5 5l10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PanelOpenIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <rect
        x="3"
        y="3.5"
        width="14"
        height="13"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M8 3.5v13" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M11 10h4M13.5 8l1.5 2-1.5 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PanelCloseIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <rect
        x="3"
        y="3.5"
        width="14"
        height="13"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M8 3.5v13" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M15 10h-4M12.5 8 11 10l1.5 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SignOutIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M8.5 4.5H5.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M11.5 13.5 15.5 10 11.5 6.5M15.5 10h-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
