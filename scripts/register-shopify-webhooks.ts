import { graphql } from "../domains/shopify/client";
import { BookingError } from "../lib/booking";
async function main() {
  const origin = new URL(process.env.APP_ORIGIN || "");
  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    origin.pathname !== "/"
  )
    throw new BookingError(
      "Use the approved HTTPS Reserve origin without a path or credentials.",
      400,
    );
  const uri = new URL("/api/shopify/webhook", origin).toString();
  const existing = await graphql<{
    webhookSubscriptions: {
      nodes: { id: string; topic: string; uri: string }[];
      pageInfo: { hasNextPage: boolean };
    };
  }>(`
    query {
      webhookSubscriptions(first: 100) {
        nodes {
          id
          topic
          uri
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  `);
  if (existing.webhookSubscriptions.pageInfo.hasNextPage)
    throw new BookingError(
      "Review the connector's existing subscriptions before adding more.",
      409,
    );
  for (const topic of [
    "ORDERS_CREATE",
    "ORDERS_PAID",
    "ORDERS_UPDATED",
    "ORDERS_CANCELLED",
    "REFUNDS_CREATE",
  ]) {
    if (
      existing.webhookSubscriptions.nodes.some(
        (s) => s.topic === topic && s.uri === uri,
      )
    ) {
      console.log(`${topic}: already connected`);
      continue;
    }
    const result = await graphql<{
      webhookSubscriptionCreate: {
        webhookSubscription: { id: string } | null;
        userErrors: { message: string }[];
      };
    }>(
      `
        mutation (
          $topic: WebhookSubscriptionTopic!
          $input: WebhookSubscriptionInput!
        ) {
          webhookSubscriptionCreate(
            topic: $topic
            webhookSubscription: $input
          ) {
            webhookSubscription {
              id
            }
            userErrors {
              message
            }
          }
        }
      `,
      { topic, input: { uri, format: "JSON" } },
    );
    if (
      result.webhookSubscriptionCreate.userErrors.length ||
      !result.webhookSubscriptionCreate.webhookSubscription
    )
      throw new BookingError(
        "Shopify notification registration failed. Check the installed app's scopes.",
        503,
      );
    console.log(`${topic}: connected`);
  }
}
main().catch((error) => {
  console.error(
    error instanceof BookingError
      ? error.message
      : "Shopify notification setup failed.",
  );
  process.exitCode = 1;
});
