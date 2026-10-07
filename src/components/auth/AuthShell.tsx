import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
      <div className="mt-8">{children}</div>
      {footer && <div className="mt-8 border-t border-line pt-6 text-sm text-muted">{footer}</div>}
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-danger">
      {message}
    </p>
  );
}

export function FormAlert({ message, tone = "error" }: { message?: string | null; tone?: "error" | "success" }) {
  if (!message) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg px-3 py-2.5 text-sm ${tone === "error" ? "bg-danger/10 text-danger" : "bg-mint/10 text-mint"}`}
    >
      {message}
    </p>
  );
}
