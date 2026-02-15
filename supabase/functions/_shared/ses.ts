/**
 * AWS SES v2 email helper for Edge Functions.
 *
 * Uses @aws-sdk/client-sesv2 via npm: specifier (NOT SMTP -- ports 25/587
 * are blocked on Deno Deploy).
 *
 * Required env vars: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, SES_FROM_EMAIL
 * Optional: AWS_SES_REGION (defaults to 'eu-north-1')
 * Graceful degradation: logs warning and returns false if env vars missing.
 */

import {
  SESv2Client,
  SendEmailCommand,
} from "npm:@aws-sdk/client-sesv2";

export interface EmailPayload {
  to: string; // Recipient email
  subject: string;
  html: string;
}

let _client: SESv2Client | null = null;

function getClient(): SESv2Client | null {
  if (_client) return _client;

  const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");

  if (!accessKeyId || !secretAccessKey) {
    console.warn(
      "AWS SES not configured: AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY missing. Skipping email.",
    );
    return null;
  }

  _client = new SESv2Client({
    region: Deno.env.get("AWS_SES_REGION") || "eu-north-1",
    credentials: { accessKeyId, secretAccessKey },
  });

  return _client;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const fromEmail = Deno.env.get("SES_FROM_EMAIL");
  if (!fromEmail) {
    console.warn("SES_FROM_EMAIL not configured. Skipping email.");
    return false;
  }

  try {
    const command = new SendEmailCommand({
      FromEmailAddress: fromEmail,
      Destination: {
        ToAddresses: [payload.to],
      },
      Content: {
        Simple: {
          Subject: { Data: payload.subject },
          Body: { Html: { Data: payload.html } },
        },
      },
    });

    const result = await client.send(command);
    return result.$metadata.httpStatusCode === 200;
  } catch (error) {
    console.error("SES email error:", error);
    return false;
  }
}
