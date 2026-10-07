"use client";

import { useActionState, useId, useRef } from "react";
import type { AdminFormState } from "@/server/actions/admin";
import { FormStatus } from "./ActionButton";

const INITIAL: AdminFormState = { error: null, success: null };

export function MediaUploadForm({ action }: { action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState> }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, run, pending] = useActionState(async (prev: AdminFormState, data: FormData) => {
    const result = await action(prev, data);
    if (result.success) formRef.current?.reset();
    return result;
  }, INITIAL);

  return (
    <form ref={formRef} action={run} className="grid gap-4 rounded-xl border border-line p-4 md:grid-cols-[10rem_1fr_1fr_auto] md:items-end">
      <div>
        <label htmlFor="media-kind" className="label">
          Type
        </label>
        <select id="media-kind" name="kind" className="field" defaultValue="screenshot">
          <option value="poster">Poster (cropped 16:10)</option>
          <option value="screenshot">Screenshot</option>
        </select>
      </div>
      <div>
        <label htmlFor="media-file" className="label">
          Image (JPEG, PNG, WebP, AVIF · max 10 MB)
        </label>
        <input id="media-file" name="file" type="file" required accept="image/jpeg,image/png,image/webp,image/avif" className="field py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-graphite-700 file:px-3 file:py-1 file:text-paper" />
      </div>
      <div>
        <label htmlFor="media-alt" className="label">
          Alt text
        </label>
        <input id="media-alt" name="alt" required maxLength={200} placeholder="Describe what the image shows" className="field" />
      </div>
      <button type="submit" disabled={pending} className="btn btn-secondary">
        {pending ? "Uploading…" : "Upload"}
      </button>
      <div className="md:col-span-4">
        <FormStatus state={state} />
      </div>
    </form>
  );
}

export function NewVersionForm({
  action,
  suggestedVersion,
  currentPrompt,
  currentRequirements,
  currentTechnologyNotes,
  hasCurrentDemo,
}: {
  action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>;
  suggestedVersion: string;
  currentPrompt: string;
  currentRequirements: string[];
  currentTechnologyNotes: string;
  hasCurrentDemo: boolean;
}) {
  const [state, run, pending] = useActionState(action, INITIAL);
  return (
    <form action={run} className="space-y-5 rounded-xl border border-line p-4">
      <div className="grid gap-5 md:grid-cols-[10rem_1fr]">
        <div>
          <label htmlFor="version" className="label">
            Version
          </label>
          <input id="version" name="version" required defaultValue={suggestedVersion} pattern="\d+\.\d+\.\d+(-[a-z0-9.]+)?" className="field font-mono" />
        </div>
        <div>
          <label htmlFor="changelog" className="label">
            Changelog
          </label>
          <input id="changelog" name="changelog" maxLength={4000} placeholder="What changed in this release" className="field" />
        </div>
      </div>
      <div>
        <label htmlFor="prompt" className="label">
          Prompt (protected deliverable)
        </label>
        <textarea id="prompt" name="prompt" rows={10} defaultValue={currentPrompt} className="field font-mono text-[0.8rem]" />
        <p className="mt-1 text-xs text-subtle">Leave empty for a code-only product. A version needs a prompt, a source archive, or both.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="archive" className="label">
            Source archive (.zip, max 50 MB)
          </label>
          <input id="archive" name="archive" type="file" accept=".zip,application/zip" className="field py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-graphite-700 file:px-3 file:py-1 file:text-paper" />
          <p className="mt-1 text-xs text-subtle">Must include a README and a LICENCE file. Stored privately; dependencies are read from package.json.</p>
        </div>
        <div>
          <label htmlFor="demo" className="label">
            Demo bundle (.zip of static files, max 40 MB)
          </label>
          <input id="demo" name="demo" type="file" accept=".zip,application/zip" className="field py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-graphite-700 file:px-3 file:py-1 file:text-paper" />
          <p className="mt-1 text-xs text-subtle">
            Built HTML/CSS/JS with an index.html. {hasCurrentDemo ? "Leave empty to keep the current demo." : "Served in a sandbox."}
          </p>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="requirements" className="label">
            Setup requirements (one per line)
          </label>
          <textarea id="requirements" name="requirements" rows={3} defaultValue={currentRequirements.join("\n")} className="field" />
        </div>
        <div>
          <label htmlFor="technologyNotes" className="label">
            Technology notes
          </label>
          <textarea id="technologyNotes" name="technologyNotes" rows={3} maxLength={2000} defaultValue={currentTechnologyNotes} className="field" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="release" defaultChecked className="size-4 accent-[var(--color-mint)]" />
        Release immediately (make it the current version customers receive)
      </label>
      <FormStatus state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Uploading and validating…" : "Create version"}
      </button>
    </form>
  );
}

export function VersionTextForm({
  action,
  prompt,
  changelog,
  requirements,
  technologyNotes,
}: {
  action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>;
  prompt: string;
  changelog: string;
  requirements: string[];
  technologyNotes: string;
}) {
  const [state, run, pending] = useActionState(action, INITIAL);
  const promptId = useId();
  return (
    <form action={run} className="mt-4 space-y-4">
      <div>
        <label className="label" htmlFor={promptId}>
          Prompt
        </label>
        <textarea id={promptId} name="prompt" rows={12} defaultValue={prompt} className="field font-mono text-[0.8rem]" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="label">
            Changelog
            <textarea name="changelog" rows={3} defaultValue={changelog} className="field mt-1.5" />
          </label>
        </div>
        <div>
          <label className="label">
            Requirements (one per line)
            <textarea name="requirements" rows={3} defaultValue={requirements.join("\n")} className="field mt-1.5" />
          </label>
        </div>
        <div>
          <label className="label">
            Technology notes
            <textarea name="technologyNotes" rows={3} defaultValue={technologyNotes} className="field mt-1.5" />
          </label>
        </div>
      </div>
      <FormStatus state={state} />
      <button type="submit" disabled={pending} className="btn btn-secondary btn-sm">
        {pending ? "Saving…" : "Save version text"}
      </button>
    </form>
  );
}
