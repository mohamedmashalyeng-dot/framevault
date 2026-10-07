"use client";

import Link from "next/link";

export default function CatalogueError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-lg rounded-2xl border border-line bg-graphite-900 p-8 text-center">
        <p className="eyebrow">Catalogue unavailable</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">We couldn&rsquo;t load the catalogue.</h1>
        <p className="mt-2 text-sm text-muted">This is usually temporary. Try again, or go back to the home page.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary btn-sm">
            Try again
          </button>
          <Link href="/" className="btn btn-secondary btn-sm">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
