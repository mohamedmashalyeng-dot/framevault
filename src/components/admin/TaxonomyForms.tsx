"use client";

import { useActionState } from "react";
import type { AdminFormState } from "@/server/actions/admin";
import { FormStatus } from "./ActionButton";

const INITIAL: AdminFormState = { error: null, success: null };

export function CategoryForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>;
  initial?: { name: string; slug: string; description: string; sortOrder: number };
  submitLabel: string;
}) {
  const [state, run, pending] = useActionState(action, INITIAL);
  return (
    <form action={run} className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_5rem_auto] md:items-end">
      <label className="text-sm">
        <span className="label">Name</span>
        <input name="name" required defaultValue={initial?.name} className="field h-10" />
      </label>
      <label className="text-sm">
        <span className="label">Slug</span>
        <input name="slug" defaultValue={initial?.slug} placeholder="auto" className="field h-10 font-mono text-sm" />
      </label>
      <label className="text-sm">
        <span className="label">Description</span>
        <input name="description" defaultValue={initial?.description} maxLength={300} className="field h-10" />
      </label>
      <label className="text-sm">
        <span className="label">Order</span>
        <input name="sortOrder" type="number" min={0} max={999} defaultValue={initial?.sortOrder ?? 0} className="field h-10" />
      </label>
      <button type="submit" disabled={pending} className="btn btn-secondary btn-sm h-10">
        {pending ? "Saving…" : submitLabel}
      </button>
      <div className="md:col-span-5">
        <FormStatus state={state} />
      </div>
    </form>
  );
}

export function TagCreateForm({ action }: { action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState> }) {
  const [state, run, pending] = useActionState(action, INITIAL);
  return (
    <form action={run} className="flex flex-wrap items-end gap-3">
      <label className="text-sm">
        <span className="label">Type</span>
        <select name="kind" className="field h-10 w-auto" defaultValue="technology">
          <option value="technology">Technology</option>
          <option value="style">Visual style</option>
          <option value="topic">Topic</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="label">Name</span>
        <input name="name" required maxLength={40} className="field h-10" />
      </label>
      <button type="submit" disabled={pending} className="btn btn-secondary btn-sm h-10">
        Add tag
      </button>
      <div className="w-full">
        <FormStatus state={state} />
      </div>
    </form>
  );
}

export function TagRenameForm({ action, name }: { action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>; name: string }) {
  const [state, run, pending] = useActionState(action, INITIAL);
  return (
    <form action={run} className="flex items-center gap-2">
      <label className="sr-only" htmlFor={`tag-${name}`}>
        Tag name
      </label>
      <input id={`tag-${name}`} name="name" defaultValue={name} maxLength={40} className="field h-8 w-40 text-sm" />
      <button type="submit" disabled={pending} className="btn btn-ghost btn-sm">
        Rename
      </button>
      {state.error && <span className="text-xs text-danger">{state.error}</span>}
    </form>
  );
}

export function AllAccessForm({
  action,
  enabled,
  price,
  currency,
}: {
  action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>;
  enabled: boolean;
  price: string;
  currency: string;
}) {
  const [state, run, pending] = useActionState(action, INITIAL);
  return (
    <form action={run} className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={enabled} className="size-4 accent-[var(--color-mint)]" />
        Offer the one-time all-access bundle
      </label>
      <div className="max-w-xs">
        <label htmlFor="price" className="label">
          Price ({currency})
        </label>
        <input id="price" name="price" defaultValue={price} inputMode="decimal" pattern="\d{1,5}(\.\d{1,2})?" className="field font-mono" />
      </div>
      <FormStatus state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
