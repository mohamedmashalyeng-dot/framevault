import { useState, type FormEvent } from "react";

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || "studio@example.com";
const types = ["New home", "Extension or retrofit", "Cultural or civic", "Workplace", "Something else"];

type Errors = Partial<Record<"name" | "email" | "message", string>>;

export function Contact() {
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const type = String(data.get("type") ?? "");

    const next: Errors = {};
    if (!name) next.name = "Please tell us your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter an email address we can reply to.";
    if (message.length < 20) next.message = "A sentence or two about the project helps us reply properly.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const subject = encodeURIComponent(`Project enquiry: ${type}`);
    const body = encodeURIComponent(`${message}\n\n${name}\n${email}`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  const field =
    "mt-2 w-full rounded-sm border border-ink/20 bg-paper px-4 py-3 outline-none transition-colors focus:border-ink";

  return (
    <section id="contact" className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid gap-14 md:grid-cols-[1fr_1.3fr]">
        <div>
          <h2 className="font-serif text-4xl tracking-tight md:text-5xl">Start a project</h2>
          <p className="mt-6 leading-relaxed text-ink-soft">
            Tell us about the site, the brief and your timing. A partner replies to every enquiry within three working
            days.
          </p>
          <p className="mt-8 text-sm">
            <a
              className="underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
        <form noValidate onSubmit={onSubmit} className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm">
              Name
              <input
                name="name"
                autoComplete="name"
                className={field}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <span id="name-error" className="mt-1 block text-clay">
                  {errors.name}
                </span>
              )}
            </label>
            <label className="text-sm">
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                className={field}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <span id="email-error" className="mt-1 block text-clay">
                  {errors.email}
                </span>
              )}
            </label>
          </div>
          <label className="text-sm">
            Project type
            <select name="type" className={field} defaultValue={types[0]}>
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            About the project
            <textarea
              name="message"
              rows={5}
              className={field}
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? "message-error" : undefined}
            />
            {errors.message && (
              <span id="message-error" className="mt-1 block text-clay">
                {errors.message}
              </span>
            )}
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              className="rounded-full bg-ink px-7 py-3 text-sm text-paper transition-colors hover:bg-clay"
            >
              Send enquiry
            </button>
            {sent && (
              <p role="status" className="text-sm text-moss">
                Your mail app should open with the enquiry ready to send.
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
