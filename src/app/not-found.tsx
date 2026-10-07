import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-24 text-center">
        <p className="font-mono text-sm text-mint">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">This page doesn&rsquo;t exist.</h1>
        <p className="mt-3 text-muted">The link may be broken, or the product may have been removed.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/catalogue" className="btn btn-primary">
            Browse the catalogue
          </Link>
          <Link href="/" className="btn btn-secondary">
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
