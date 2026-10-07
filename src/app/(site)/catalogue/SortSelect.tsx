"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { catalogueHref, SORT_OPTIONS, type CatalogueQuery, type CatalogueSort } from "@/lib/catalogue-params";

export function SortSelect({ query }: { query: CatalogueQuery }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="catalogue-sort" className="shrink-0 text-sm text-muted">
        Sort by
      </label>
      <select
        id="catalogue-sort"
        value={query.sort}
        aria-busy={pending}
        onChange={(e) =>
          startTransition(() => {
            router.push(catalogueHref({ ...query, sort: e.target.value as CatalogueSort, page: 1 }), { scroll: false });
          })
        }
        className="field h-10 w-auto min-w-[12rem] rounded-full text-sm"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
