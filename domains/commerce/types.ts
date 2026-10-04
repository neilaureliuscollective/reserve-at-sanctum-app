import type { Row } from "../../lib/db";
export type Order = Row & {
  id: string;
  location_id: string;
  organization_id: string;
  customer_id: string | null;
  appointment_id: string | null;
  created_by: string;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
  refunded: number;
  revision: number;
  tax_snapshot: { bps: number; note: string };
  created_at: Date | string;
};
export type Line = Row & {
  id: string;
  order_id: string;
  sku_id: string | null;
  kind: string;
  name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
};
export type Payment = Row & {
  id: string;
  order_id: string;
  method: "cash" | "stripe";
  state: string;
  session_id: string | null;
  payment_intent: string | null;
  amount: number;
  checkout_url: string | null;
  created_at: Date | string;
};
export type Refund = Row & {
  id: string;
  order_id: string;
  created_by: string;
  request_key: string;
  amount: number;
  reason: string;
  state: string;
  processor_id: string | null;
};
export type Session = {
  id: string;
  status: string;
  payment_status: string;
  amount_total: number | null;
  currency: string | null;
  payment_intent: string | null;
  url: string | null;
  expires_at: number;
  metadata: Record<string, string>;
  livemode: boolean;
};
export type ProcessorRefund = {
  id: string;
  amount: number;
  status: string | null;
  payment_intent: string | null;
  metadata: Record<string, string>;
};
export interface Processor {
  create(order: Order, lines: Line[]): Promise<Session>;
  session(id: string): Promise<Session>;
  expire(id: string): Promise<Session>;
  refund(refund: Refund, paymentIntent: string): Promise<ProcessorRefund>;
  getRefund(id: string): Promise<ProcessorRefund>;
}
