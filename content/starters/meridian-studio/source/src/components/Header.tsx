import { useEffect, useState } from "react";

const links = [
  { href: "#work", label: "Work" },
  { href: "#studio", label: "Studio" },
  { href: "#process", label: "Process" },
  { href: "#contact", label: "Contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-colors ${
        scrolled ? "border-ink/10 bg-paper/90 backdrop-blur" : "border-transparent bg-paper"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <a href="#top" className="font-serif text-2xl tracking-tight">
          Meridian
        </a>
        <nav aria-label="Primary" className="hidden gap-9 text-sm md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-ink-soft transition-colors hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>
        <button
          type="button"
          className="text-sm md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-ink/10 px-6 pb-6 md:hidden">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-3 font-serif text-2xl">
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
