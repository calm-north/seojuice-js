/**
 * Express Webhook Receiver — Handle SEOJuice change lifecycle events.
 *
 * Verifies HMAC-SHA256 signatures, routes events by type, and
 * processes heavy work async to respond 200 quickly.
 *
 * Setup:
 *   1. Set SEOJUICE_WEBHOOK_SECRET in your environment (from the dashboard)
 *   2. Set SEOJUICE_API_KEY for API callbacks
 *   3. Configure the webhook URL in SEOJuice: https://yoursite.com/webhooks/seojuice
 */
import crypto from "node:crypto";
import express from "express";
import { SEOJuice } from "seojuice";
import type { ChangeWebhookPayload, ChangeRecord } from "seojuice";

const app = express();
const WEBHOOK_SECRET = process.env.SEOJUICE_WEBHOOK_SECRET!;

const client = new SEOJuice({
  apiKey: process.env.SEOJUICE_API_KEY!,
});

// --- Signature verification ---

function verifySignature(
  payload: string,
  signature: string | undefined,
): boolean {
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  );
}

// --- Event handlers (run async after responding) ---

async function onChangeCreated(
  payload: ChangeWebhookPayload,
): Promise<void> {
  const { change } = payload;
  console.log(
    `[webhook] New ${change.change_type} change #${change.id} ` +
      `for ${change.page_url}`,
  );
}

async function onChangeApproved(
  payload: ChangeWebhookPayload,
): Promise<void> {
  const { change } = payload;
  console.log(
    `[webhook] Change #${change.id} approved — ` +
      `ready for integration to pull`,
  );

  // Optionally trigger your CMS sync pipeline here
  // await triggerCmsSync();
}

async function onChangeApplied(
  payload: ChangeWebhookPayload,
): Promise<void> {
  const { change, website } = payload;
  console.log(
    `[webhook] Change #${change.id} applied to ${change.page_url}`,
  );

  // Trigger a CMS rebuild / cache purge so the change goes live
  await triggerRebuild(website.domain, change);
}

async function onChangeReverted(
  payload: ChangeWebhookPayload,
): Promise<void> {
  const { change, website } = payload;
  console.log(
    `[webhook] Change #${change.id} reverted` +
      (payload.revert_reason ? `: ${payload.revert_reason}` : ""),
  );

  // Trigger rebuild to remove the reverted change
  await triggerRebuild(website.domain, change);
}

async function onChangeRejected(
  payload: ChangeWebhookPayload,
): Promise<void> {
  const { change, website } = payload;
  console.log(
    `[webhook] Change #${change.id} rejected` +
      (payload.reason ? `: ${payload.reason}` : ""),
  );

  // Nothing to deploy — log for audit trail
}

// --- Rebuild trigger (replace with your actual build system) ---

async function triggerRebuild(
  domain: string,
  change: ChangeRecord,
): Promise<void> {
  // Examples:
  //   await fetch('https://api.vercel.com/v1/deployments', { method: 'POST', ... })
  //   await fetch('https://api.netlify.com/build_hooks/YOUR_HOOK', { method: 'POST' })
  //   await cmsClient.publishEntry(change.page_url)
  console.log(
    `[rebuild] Triggering rebuild for ${domain} (change #${change.id})`,
  );
}

// --- Webhook route ---

app.post(
  "/webhooks/seojuice",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const rawBody = req.body.toString();
    const signature = req.headers["x-seojuice-signature"] as
      | string
      | undefined;

    // Verify HMAC signature
    if (!verifySignature(rawBody, signature)) {
      console.warn("[webhook] Invalid signature, rejecting");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const payload: ChangeWebhookPayload = JSON.parse(rawBody);

    // Respond 200 immediately — process the event async
    res.status(200).json({ received: true });

    // Route by event type
    const handler = (async () => {
      switch (payload.event) {
        case "change.created":
          return onChangeCreated(payload);
        case "change.approved":
          return onChangeApproved(payload);
        case "change.applied":
          return onChangeApplied(payload);
        case "change.reverted":
          return onChangeReverted(payload);
        case "change.rejected":
          return onChangeRejected(payload);
        default:
          console.log(`[webhook] Unhandled event: ${payload.event}`);
      }
    })();

    handler.catch((err) => {
      console.error(`[webhook] Error processing ${payload.event}:`, err);
    });
  },
);

// --- Health check ---

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = parseInt(process.env.PORT ?? "3000", 10);
app.listen(PORT, () => {
  console.log(`[webhook] Listening on port ${PORT}`);
});

// Usage:
//   SEOJUICE_WEBHOOK_SECRET=whsec_xxx SEOJUICE_API_KEY=sk_xxx npx tsx examples/changes-webhook-receiver.ts
//
// Test with curl:
//   BODY='{"event":"change.created","change":{"id":1,"change_type":"meta_description","page_url":"/blog/test","status":"pending"},"website":{"domain":"example.com"},"timestamp":"2026-03-10T00:00:00Z"}'
//   SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "your-secret" | awk '{print $2}')
//   curl -X POST http://localhost:3000/webhooks/seojuice \
//     -H "Content-Type: application/json" \
//     -H "X-SEOJuice-Signature: $SIG" \
//     -d "$BODY"
