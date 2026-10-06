export type SquareMoney = {
  amount: number;
  currency: string;
};

export type SquareErrorBody = {
  category?: string;
  code?: string;
  detail?: string;
  field?: string;
};

export type SquareDisabled = {
  enabled: false;
  reason: "not_configured";
};

export type SquareFailure = {
  enabled: true;
  ok: false;
  status: number;
  errors: SquareErrorBody[];
};

export type SquareSuccess<T> = {
  enabled: true;
  ok: true;
  data: T;
};

export type SquareResult<T> = SquareDisabled | SquareFailure | SquareSuccess<T>;

export type SquareCustomer = {
  id: string;
  givenName?: string;
  familyName?: string;
  emailAddress?: string;
  referenceId?: string;
};

export type SquareLocation = {
  id: string;
  name?: string;
  timezone?: string;
  status?: string;
};

export type SquareCatalogObject = {
  id: string;
  type: string;
  updatedAt?: string;
  isDeleted?: boolean;
  itemData?: {
    name?: string;
    description?: string;
    variations?: Array<{
      id: string;
      type?: string;
      itemVariationData?: {
        name?: string;
        sku?: string;
        priceMoney?: SquareMoney;
      };
    }>;
  };
};

export type SquareInventoryCount = {
  catalogObjectId: string;
  quantity?: string;
  state?: string;
  locationId?: string;
};

export type SquareOrder = {
  id: string;
  locationId: string;
  state?: string;
  fulfillments?: Array<{ type?: string; state?: string }>;
};

export type SquareBooking = {
  id: string;
  status?: string;
  startAt?: string;
  locationId?: string;
  customerId?: string;
};

export type SquareSubscription = {
  id: string;
  status?: string;
  planVariationId?: string;
  customerId?: string;
  locationId?: string;
};

export type SquarePayment = {
  id: string;
  status?: string;
  orderId?: string;
  locationId?: string;
};

export type SquareWebhookEvent = {
  merchant_id?: string;
  type: string;
  event_id: string;
  created_at?: string;
  data?: {
    type?: string;
    id?: string;
    object?: unknown;
  };
};

export const fulfillmentIntents = [
  "in_location_take_home",
  "online_ship",
  "in_location_ship",
  "online_pickup",
  "location_fulfill",
] as const;

export type FulfillmentIntent = (typeof fulfillmentIntents)[number];

export function squareFulfillmentType(
  intent: FulfillmentIntent,
): "PICKUP" | "SHIPMENT" {
  return intent === "online_ship" || intent === "in_location_ship"
    ? "SHIPMENT"
    : "PICKUP";
}

export type MappingKind = "service" | "product" | "membership_plan";

export type SquareMapping = {
  internalId: string;
  internalKind?: MappingKind;
  squareId: string;
  squareSecondaryId?: string | null;
  environment: string;
};
