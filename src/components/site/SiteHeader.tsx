import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { getSessionUser } from "@/server/session";
import { Menu, Search } from "../icons";
import { Logo } from "../Logo";
import { SignOutButton } from "./SignOutButton";

const NAV = [
  { href: "/catalogue", label: "Catalogue" },
  { href: "/catalogue?category=full-websites", label: "Websites" },
  { href: "/catalogue?category=components", label: "Components" },
  { href: "/all-access", label: "All-access" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-graphite-950/85 backdrop-blur-md supports-[backdrop-filter]:bg-graphite-950/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1.5 text-sm text-paper-dim transition-colors hover:bg-white/[0.04] hover:text-paper"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Form action="/catalogue" role="search" className="ml-auto hidden w-full max-w-xs md:block">
          <label htmlFor="site-search" className="sr-only">
            Search the catalogue
          </label>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              id="site-search"
              name="q"
              type="search"
              placeholder="Search templates, prompts…"
              autoComplete="off"
              maxLength={80}
              className="h-9 w-full rounded-full border border-line bg-graphite-900 pl-9 pr-3 text-sm placeholder:text-subtle hover:border-line-strong focus:border-mint focus:outline-none"
            />
          </div>
        </Form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Suspense fallback={<div className="h-9 w-20 rounded-full skeleton" aria-hidden />}>
            <AccountArea />
          </Suspense>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

async function AccountArea() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <Link href="/sign-in" className="btn btn-secondary btn-sm">
        Sign in
      </Link>
    );
  }
  const initial = (user.name || user.email).trim().charAt(0).toUpperCase();
  return (
    <details className="group relative">
      <summary
        className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-full border border-line pl-1 pr-3 text-sm hover:border-line-strong [&::-webkit-details-marker]:hidden"
        aria-label="Account menu"
      >
        <span className="grid size-7 place-items-center rounded-full bg-graphite-700 text-xs font-semibold">{initial}</span>
        <span className="hidden max-w-[9rem] truncate sm:inline">{user.name || "Account"}</span>
      </summary>
      <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line-strong bg-graphite-900 p-1.5 shadow-2xl shadow-black/50">
        <p className="truncate px-3 pb-2 pt-1.5 text-xs text-muted">{user.email}</p>
        {[
          ["/account", "Library"],
          ["/account/favourites", "Favourites"],
          ["/account/orders", "Orders"],
          ["/account/settings", "Settings"],
          ...(user.role === "admin" ? [["/admin", "Admin"]] : []),
        ].map(([href, label]) => (
          <Link key={href} href={href} className="block rounded-lg px-3 py-2 text-sm text-paper-dim hover:bg-white/[0.05] hover:text-paper">
            {label}
          </Link>
        ))}
        <div className="my-1 border-t border-line" />
        <SignOutButton className="block w-full rounded-lg px-3 py-2 text-left text-sm text-paper-dim hover:bg-white/[0.05] hover:text-paper" />
      </div>
    </details>
  );
}

function MobileMenu() {
  return (
    <details className="relative lg:hidden">
      <summary
        className="grid size-9 cursor-pointer list-none place-items-center rounded-full border border-line hover:border-line-strong [&::-webkit-details-marker]:hidden"
        aria-label="Open navigation"
      >
        <Menu size={17} />
      </summary>
      <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-line-strong bg-graphite-900 p-3 shadow-2xl shadow-black/50">
        <Form action="/catalogue" role="search" className="mb-2 md:hidden">
          <label htmlFor="mobile-search" className="sr-only">
            Search the catalogue
          </label>
          <input id="mobile-search" name="q" type="search" placeholder="Search…" maxLength={80} className="field h-10" />
        </Form>
        <nav aria-label="Mobile">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="block rounded-lg px-3 py-2.5 text-paper-dim hover:bg-white/[0.05] hover:text-paper">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </details>
  );
}
