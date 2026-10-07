"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/account", label: "Library" },
  { href: "/account/favourites", label: "Favourites" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/settings", label: "Settings" },
];

export function AccountTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="mt-4 overflow-x-auto border-b border-line">
      <ul className="flex gap-1">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px block whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors ${
                  active ? "border-mint text-paper" : "border-transparent text-muted hover:text-paper"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
