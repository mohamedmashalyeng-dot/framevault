"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/taxonomy", label: "Categories & tags" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/settings", label: "Store settings" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="mt-4 flex gap-1 overflow-x-auto lg:flex-col">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
              active ? "bg-graphite-800 text-paper" : "text-muted hover:bg-white/[0.04] hover:text-paper"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
