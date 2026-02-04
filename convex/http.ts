import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

/**
 * Health check endpoint
 */
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({ status: "ok", timestamp: Date.now() }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

/**
 * Clerk webhook handler for organization events.
 * This creates/updates/deletes the Convex organization record
 * when changes happen in Clerk.
 *
 * Clerk webhook events handled:
 * - organization.created: Creates a new organization in Convex
 * - organization.updated: Updates organization name/slug/logo in Convex
 * - organization.deleted: Deletes the organization from Convex
 */
http.route({
  path: "/clerk/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("CLERK_WEBHOOK_SECRET is not set");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    // Get the headers for verification
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!(svixId && svixTimestamp && svixSignature)) {
      return new Response("Missing svix headers", { status: 400 });
    }

    // Get the body
    const body = await request.text();

    // Verify the webhook signature
    const wh = new Webhook(webhookSecret);
    let event: {
      type: string;
      data: {
        id: string;
        name?: string;
        slug?: string;
        image_url?: string;
      };
    };

    try {
      event = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as typeof event;
    } catch (err) {
      console.error("Webhook verification failed:", err);
      return new Response("Webhook verification failed", { status: 400 });
    }

    // Handle the event
    const { type, data } = event;

    switch (type) {
      case "organization.created": {
        console.log("Creating organization from Clerk:", data.id, data.name);
        await ctx.runMutation(internal.organizations.createFromClerk, {
          clerkOrgId: data.id,
          name: data.name ?? "Unnamed Organization",
          slug: data.slug ?? data.id,
          logo: data.image_url,
        });
        break;
      }

      case "organization.updated": {
        console.log("Updating organization from Clerk:", data.id);
        await ctx.runMutation(internal.organizations.updateFromClerk, {
          clerkOrgId: data.id,
          name: data.name,
          slug: data.slug,
          logo: data.image_url,
        });
        break;
      }

      case "organization.deleted": {
        console.log("Deleting organization from Clerk:", data.id);
        await ctx.runMutation(internal.organizations.deleteFromClerk, {
          clerkOrgId: data.id,
        });
        break;
      }

      default:
        // Ignore other event types
        console.log("Ignoring Clerk webhook event:", type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
