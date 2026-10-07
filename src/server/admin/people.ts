import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { entitlement, order, orderItem, product, session, user, type OrderStatus } from "@/db/schema";
import { AdminInputError } from "./catalogue";
import { contains } from "./search";

/** Customers, orders and dashboard figures for the admin area. */

export async function listCustomers(q = "", limit = 100) {
  return getDb()
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      paidOrders: sql<number>`(select count(*) from "order" o where o.user_id = ${user.id} and o.status = 'paid')`,
      spentCents: sql<number>`(select coalesce(sum(o.total_cents), 0) from "order" o where o.user_id = ${user.id} and o.status = 'paid')`,
      activeEntitlements: sql<number>`(select count(*) from entitlement e where e.user_id = ${user.id} and e.revoked_at is null)`,
    })
    .from(user)
    .where(q ? or(contains(user.email, q), contains(user.name, q)) : undefined)
    .orderBy(desc(user.createdAt))
    .limit(limit);
}

export async function setUserRole(actingAdminId: string, userId: string, role: "admin" | "customer") {
  if (actingAdminId === userId && role !== "admin") {
    throw new AdminInputError("You can't remove your own administrator role.");
  }
  const db = getDb();
  const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId));
  if (!target) throw new AdminInputError("User not found.");
  await db.update(user).set({ role }).where(eq(user.id, userId));
  // Sessions read the role fresh from the database, but end existing sessions
  // on demotion so nothing cached client-side outlives the change.
  if (role === "customer") await db.delete(session).where(eq(session.userId, userId));
}

export async function listOrdersForAdmin(filter: { status?: OrderStatus | "all"; q?: string } = {}, limit = 100) {
  const db = getDb();
  const conditions = [];
  if (filter.status && filter.status !== "all") conditions.push(eq(order.status, filter.status));
  if (filter.q) {
    conditions.push(or(contains(order.id, filter.q), contains(user.email, filter.q), contains(order.providerPaymentId, filter.q))!);
  }
  const rows = await db
    .select({
      id: order.id,
      status: order.status,
      kind: order.kind,
      provider: order.provider,
      currency: order.currency,
      totalCents: order.totalCents,
      statusReason: order.statusReason,
      providerPaymentId: order.providerPaymentId,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      email: user.email,
      items: sql<string>`(select group_concat(oi.title_snapshot, ', ') from order_item oi where oi.order_id = ${order.id})`,
    })
    .from(order)
    .innerJoin(user, eq(user.id, order.userId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(order.createdAt))
    .limit(limit);
  return rows;
}

export async function getDashboardStats() {
  const db = getDb();
  const [products, orders, [customers], [entitlements], recent] = await Promise.all([
    db.select({ status: product.status, count: sql<number>`count(*)` }).from(product).groupBy(product.status),
    db
      .select({ status: order.status, count: sql<number>`count(*)`, total: sql<number>`coalesce(sum(${order.totalCents}), 0)` })
      .from(order)
      .groupBy(order.status),
    db.select({ count: sql<number>`count(*)` }).from(user),
    db.select({ count: sql<number>`count(*)` }).from(entitlement).where(isNull(entitlement.revokedAt)),
    db
      .select({
        id: order.id,
        status: order.status,
        totalCents: order.totalCents,
        currency: order.currency,
        createdAt: order.createdAt,
        email: user.email,
        title: sql<string>`(select min(${orderItem.titleSnapshot}) from order_item where order_item.order_id = ${order.id})`,
      })
      .from(order)
      .innerJoin(user, eq(user.id, order.userId))
      .orderBy(desc(order.createdAt))
      .limit(6),
  ]);
  return { products, orders, customers: customers.count, entitlements: entitlements.count, recent };
}
