import type { OrderStatus } from "@/db/schema";

const STYLES: Record<OrderStatus, string> = {
  paid: "border-mint/40 text-mint",
  pending: "border-warning/40 text-warning",
  failed: "border-danger/40 text-danger",
  cancelled: "border-line-strong text-muted",
  expired: "border-line-strong text-muted",
  refunded: "border-line-strong text-paper-dim",
};

const LABELS: Record<OrderStatus, string> = {
  paid: "Paid",
  pending: "Pending",
  failed: "Failed",
  cancelled: "Cancelled",
  expired: "Expired",
  refunded: "Refunded",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[0.68rem] uppercase tracking-wider ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
