"use client";

import { useActionState, useEffect, useState } from "react";
import type { AdminFormState } from "@/server/actions/admin";
import { Spinner } from "../icons";
import { FormStatus } from "./ActionButton";
import { EMPTY_PRODUCT, ProductFields } from "./ProductForm";

const fileInput =
  "field py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-graphite-700 file:px-3 file:py-1 file:text-paper";

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line p-5" aria-labelledby={`step-${n}`}>
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-sm text-mint">{String(n).padStart(2, "0")}</span>
        <div>
          <h2 id={`step-${n}`} className="font-medium">
            {title}
          </h2>
          {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
        </div>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function waitFor(video: HTMLVideoElement, event: string, ms: number) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}.`)), ms);
    video.addEventListener(event, () => (clearTimeout(timer), resolve()), { once: true });
    video.addEventListener("error", () => (clearTimeout(timer), reject(new Error("The video could not be decoded."))), { once: true });
  });
}

/**
 * Grabs a frame about a second into the clip as a JPEG poster, scaled up to
 * the 1200 px minimum when the video is smaller. Runs in the browser, since
 * the server has no video decoder.
 */
async function posterFromVideo(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await waitFor(video, "loadeddata", 15_000);
    // Skip the opening frame (often black) when the length is known. Browser
    // recordings without a duration may not seek, so they keep the first frame.
    if (Number.isFinite(video.duration) && video.duration > 0) {
      video.currentTime = Math.min(1, video.duration / 3);
      await waitFor(video, "seeked", 5_000).catch(() => {});
    }
    const scale = Math.max(1, 1200 / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) throw new Error("The frame could not be encoded.");
    return new File([blob], "poster.jpg", { type: "image/jpeg" });
  } finally {
    video.removeAttribute("src");
    URL.revokeObjectURL(url);
  }
}

/** One form for everything: video, details, preview images, source ZIP, demo and prompt. */
export function UploadProductForm({
  action,
  categories,
  tagSuggestions,
}: {
  action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>;
  categories: { id: string; name: string }[];
  tagSuggestions: { technology: string[]; style: string[]; topic: string[] };
}) {
  const [state, run, pending] = useActionState(async (prev: AdminFormState, data: FormData): Promise<AdminFormState> => {
    const video = data.get("video");
    const poster = data.get("poster");
    if (video instanceof File && video.size > 0 && !(poster instanceof File && poster.size > 0)) {
      try {
        data.set("poster", await posterFromVideo(video));
      } catch {
        return { error: "Your browser could not take a poster frame from this video. Upload a poster image instead.", success: null };
      }
    }
    return action(prev, data);
  }, { error: null, success: null });
  const [hasArchive, setHasArchive] = useState(false);
  const [hasDemo, setHasDemo] = useState(false);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  useEffect(() => () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
  }, [videoPreview]);

  return (
    <form
      action={run}
      // React clears the file inputs after each submit; keep the dependent UI in step.
      onReset={() => {
        setHasArchive(false);
        setHasDemo(false);
        setVideoPreview(null);
      }}
      className="space-y-6"
    >
      <Step n={1} title="Preview video" hint="MP4 or WebM, up to 50 MB. It plays on the product card and in the quick-view pop-up.">
        <div>
          <label htmlFor="video" className="label">
            Video
          </label>
          <input
            id="video"
            name="video"
            type="file"
            accept="video/mp4,video/webm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setVideoPreview(file ? URL.createObjectURL(file) : null);
            }}
            className={fileInput}
          />
          <p className="mt-1 text-xs text-subtle">Short, silent loops work best. Without a video, the card shows the poster image.</p>
        </div>
        {videoPreview && (
          <video
            src={videoPreview}
            muted
            loop
            autoPlay
            playsInline
            controls
            aria-label="Selected video"
            className="aspect-video w-full rounded-xl border border-line bg-black object-contain"
          />
        )}
      </Step>

      <Step n={2} title="Product details" hint="Title, description and price: what customers see in the catalogue and on the product page.">
        <div className="space-y-6">
          <ProductFields categories={categories} initial={EMPTY_PRODUCT} tagSuggestions={tagSuggestions} />
        </div>
      </Step>

      <Step n={3} title="Preview images" hint="JPEG, PNG, WebP or AVIF, up to 10 MB each. A screenshot of the live project works best.">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="poster" className="label">
              {videoPreview ? "Poster (optional: a frame from the video is used otherwise)" : "Poster (required, cropped to 16:10, at least 1200 px wide)"}
            </label>
            <input
              id="poster"
              name="poster"
              type="file"
              required={!videoPreview}
              accept="image/jpeg,image/png,image/webp,image/avif"
              className={fileInput}
            />
          </div>
          <div>
            <label htmlFor="posterAlt" className="label">
              Poster description (alt text)
            </label>
            <input id="posterAlt" name="posterAlt" maxLength={200} placeholder="e.g. Dark SaaS landing page with a live chart" className="field" />
          </div>
        </div>
        <div>
          <label htmlFor="screenshots" className="label">
            Screenshots (optional, up to 6)
          </label>
          <input id="screenshots" name="screenshots" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className={fileInput} />
        </div>
      </Step>

      <Step
        n={4}
        title="Source code and live demo"
        hint="The source ZIP is stored privately and only delivered to customers with access. The demo is public and runs in a sandbox."
      >
        <div>
          <label htmlFor="archive" className="label">
            Source code ZIP (max 50 MB)
          </label>
          <input
            id="archive"
            name="archive"
            type="file"
            accept=".zip,application/zip"
            onChange={(e) => setHasArchive(Boolean(e.target.files?.length))}
            className={fileInput}
          />
          <p className="mt-1 text-xs text-subtle">
            Must contain a README (install and run steps) and a LICENCE file. Leave empty for a prompt-only product.
          </p>
        </div>
        <div>
          <label htmlFor="demo" className="label">
            Live demo ZIP (optional, max 40 MB)
          </label>
          <input
            id="demo"
            name="demo"
            type="file"
            accept=".zip,application/zip"
            onChange={(e) => setHasDemo(Boolean(e.target.files?.length))}
            className={fileInput}
          />
          <p className="mt-1 text-xs text-subtle">
            The built, static site with an index.html (for Vite or Next static export, zip the <code>dist</code> or <code>out</code> folder).
          </p>
        </div>
        <label className={`flex items-start gap-2 text-sm ${!hasArchive || hasDemo ? "opacity-50" : ""}`}>
          <input
            type="checkbox"
            name="useSourceAsDemo"
            disabled={!hasArchive || hasDemo}
            className="mt-0.5 size-4 accent-[var(--color-mint)]"
          />
          <span>
            No build step? Use the source ZIP itself as the live demo.
            <span className="block text-xs text-subtle">
              For plain HTML/CSS/JS projects only. Its HTML, CSS and JS files become publicly viewable as the preview; README and
              other non-web files are not published.
            </span>
          </span>
        </label>
      </Step>

      <Step n={5} title="AI prompt" hint="Protected: only shown to customers with access, never in public pages.">
        <div>
          <label htmlFor="prompt" className="label">
            Prompt {hasArchive ? "(optional)" : "(required without a source ZIP)"}
          </label>
          <textarea id="prompt" name="prompt" rows={12} maxLength={60000} className="field font-mono text-[0.8rem]" placeholder="Paste the full prompt here…" />
        </div>
      </Step>

      <Step n={6} title="Release">
        <div className="grid gap-5 md:grid-cols-[10rem_1fr]">
          <div>
            <label htmlFor="version" className="label">
              Version
            </label>
            <input id="version" name="version" defaultValue="1.0.0" pattern="\d+\.\d+\.\d+(-[a-z0-9.]+)?" className="field font-mono" />
          </div>
          <div>
            <label htmlFor="changelog" className="label">
              Release notes
            </label>
            <input id="changelog" name="changelog" maxLength={4000} placeholder="Initial release." className="field" />
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="requirements" className="label">
              Setup requirements (one per line)
            </label>
            <textarea id="requirements" name="requirements" rows={3} placeholder={"Node.js 20+\nnpm 10+"} className="field" />
          </div>
          <div>
            <label htmlFor="technologyNotes" className="label">
              Technology notes
            </label>
            <textarea id="technologyNotes" name="technologyNotes" rows={3} maxLength={2000} className="field" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="publish" defaultChecked className="size-4 accent-[var(--color-mint)]" />
          Publish immediately (otherwise it is saved as a draft)
        </label>
      </Step>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-4 border-t border-line bg-graphite-950/90 px-1 py-4 backdrop-blur">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending && <Spinner size={15} />}
          {pending ? "Uploading and checking files…" : "Upload product"}
        </button>
        <p className="text-xs text-subtle">All files together must stay under 100 MB.</p>
        <div className="w-full">
          <FormStatus state={state} />
        </div>
      </div>
    </form>
  );
}
