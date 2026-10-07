"use client";

import { useActionState, useState } from "react";
import type { AdminFormState } from "@/server/actions/admin";
import { FormStatus } from "./ActionButton";

export type ProductFormValues = {
  title: string;
  slug: string;
  tagline: string;
  description: string;
  categoryId: string;
  price: string;
  licenceType: "free" | "standard";
  licenceSummary: string;
  isFeatured: boolean;
  featuredRank: number;
  technologies: string;
  styles: string;
  topics: string;
};

export const EMPTY_PRODUCT: ProductFormValues = {
  title: "",
  slug: "",
  tagline: "",
  description: "",
  categoryId: "",
  price: "0",
  licenceType: "standard",
  licenceSummary: "",
  isFeatured: false,
  featuredRank: 0,
  technologies: "",
  styles: "",
  topics: "",
};

export function ProductForm({
  action,
  categories,
  initial,
  submitLabel,
  tagSuggestions,
}: {
  action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>;
  categories: { id: string; name: string }[];
  initial: ProductFormValues;
  submitLabel: string;
  tagSuggestions: { technology: string[]; style: string[]; topic: string[] };
}) {
  const [state, run, pending] = useActionState(action, { error: null, success: null });
  const [price, setPrice] = useState(initial.price);
  const free = Number.parseFloat(price || "0") === 0;

  return (
    <form action={run} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="title" className="label">
            Title
          </label>
          <input id="title" name="title" required minLength={3} maxLength={90} defaultValue={initial.title} className="field" />
        </div>
        <div>
          <label htmlFor="slug" className="label">
            URL slug
          </label>
          <input id="slug" name="slug" defaultValue={initial.slug} placeholder="generated from the title" pattern="[a-z0-9-]*" className="field font-mono text-sm" />
          <p className="mt-1 text-xs text-subtle">Lowercase letters, numbers and dashes. Changing it breaks old links.</p>
        </div>
        <div>
          <label htmlFor="categoryId" className="label">
            Category
          </label>
          <select id="categoryId" name="categoryId" required defaultValue={initial.categoryId} className="field">
            <option value="" disabled>
              Choose a category
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="tagline" className="label">
            Tagline
          </label>
          <input id="tagline" name="tagline" maxLength={160} defaultValue={initial.tagline} className="field" />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="description" className="label">
            Description
          </label>
          <textarea id="description" name="description" rows={7} maxLength={6000} defaultValue={initial.description} className="field" />
          <p className="mt-1 text-xs text-subtle">Plain text. Separate paragraphs with a blank line.</p>
        </div>
      </div>

      <fieldset className="grid gap-5 rounded-xl border border-line p-4 md:grid-cols-3">
        <legend className="px-1 text-sm font-medium">Pricing and licence</legend>
        <div>
          <label htmlFor="price" className="label">
            Price
          </label>
          <input
            id="price"
            name="price"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            pattern="\d{1,5}(\.\d{1,2})?"
            className="field font-mono"
          />
          <p className="mt-1 text-xs text-subtle">0 makes the product free.</p>
        </div>
        <div>
          <label htmlFor="licenceType" className="label">
            Licence
          </label>
          <select id="licenceType" name="licenceType" defaultValue={initial.licenceType} disabled={free} className="field">
            <option value="standard">Standard (paid)</option>
            <option value="free">Free</option>
          </select>
          {free && <input type="hidden" name="licenceType" value="free" />}
        </div>
        <div className="flex items-end gap-3">
          <label className="flex h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="isFeatured" defaultChecked={initial.isFeatured} className="size-4 accent-[var(--color-mint)]" />
            Featured
          </label>
          <div className="w-24">
            <label htmlFor="featuredRank" className="label">
              Rank
            </label>
            <input id="featuredRank" name="featuredRank" type="number" min={0} max={99} defaultValue={initial.featuredRank} className="field" />
          </div>
        </div>
        <div className="md:col-span-3">
          <label htmlFor="licenceSummary" className="label">
            Licence summary
          </label>
          <textarea
            id="licenceSummary"
            name="licenceSummary"
            rows={3}
            maxLength={800}
            defaultValue={initial.licenceSummary}
            placeholder="Leave empty to use the default summary for the licence type."
            className="field"
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 rounded-xl border border-line p-4 md:grid-cols-3">
        <legend className="px-1 text-sm font-medium">Tags</legend>
        {(
          [
            ["technologies", "Technologies", "technology"],
            ["styles", "Visual styles", "style"],
            ["topics", "Topics", "topic"],
          ] as const
        ).map(([name, label, kind]) => (
          <div key={name}>
            <label htmlFor={name} className="label">
              {label}
            </label>
            <input id={name} name={name} defaultValue={initial[name]} list={`${name}-list`} className="field" placeholder="Comma separated" />
            <datalist id={`${name}-list`}>
              {tagSuggestions[kind].map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            {tagSuggestions[kind].length > 0 && (
              <p className="mt-1 text-xs text-subtle">Existing: {tagSuggestions[kind].slice(0, 8).join(", ")}</p>
            )}
          </div>
        ))}
      </fieldset>

      <FormStatus state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
