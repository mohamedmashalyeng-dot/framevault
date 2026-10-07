import Link from "next/link";
import { BRAND } from "@/config/brand";
import { Logo } from "../Logo";

const COLUMNS = [
  {
    title: "Catalogue",
    links: [
      ["/catalogue?category=full-websites", "Full websites"],
      ["/catalogue?category=landing-pages", "Landing pages"],
      ["/catalogue?category=components", "Components"],
      ["/catalogue?category=sections", "Sections"],
      ["/catalogue?category=backgrounds", "Backgrounds"],
    ],
  },
  {
    title: "Store",
    links: [
      ["/catalogue?price=free", "Free products"],
      ["/all-access", "All-access"],
      ["/licence", "Licence"],
      ["/#faq", "FAQ"],
    ],
  },
  {
    title: "Account",
    links: [
      ["/account", "Library"],
      ["/account/favourites", "Favourites"],
      ["/sign-in", "Sign in"],
      ["/sign-up", "Create account"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{BRAND.tagline}</p>
          <p className="mt-4 text-sm text-muted">
            Support:{" "}
            <a href={`mailto:${BRAND.supportEmail}`} className="text-paper-dim underline decoration-line-strong underline-offset-4 hover:text-paper">
              {BRAND.supportEmail}
            </a>
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="eyebrow">{col.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-paper-dim hover:text-paper">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-subtle sm:px-6">
          {BRAND.name} sells original templates, components and prompts. Product names in previews are fictional sample content.
        </p>
      </div>
    </footer>
  );
}
