/**
 * Send SMS Edge Function - Custom Supabase Auth SMS Hook.
 *
 * Receives OTP from Supabase Auth and delivers it via AWS SNS.
 * Configure in: Supabase Dashboard -> Authentication -> Hooks -> Send SMS
 *
 * Required environment variables:
 *   AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 *
 * Hook payload format:
 *   { user: { phone: string }, sms: { otp: string } }
 *
 * Returns 200 with empty JSON body on success (required by Supabase hook contract).
 */
import {
  SNSClient,
  PublishCommand,
} from "https://esm.sh/@aws-sdk/client-sns@3";

const sns = new SNSClient({
  region: Deno.env.get("AWS_REGION") ?? "eu-central-1",
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
  },
});

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const { user, sms } = payload;

    await sns.send(
      new PublishCommand({
        PhoneNumber: user.phone,
        Message: `Your spolujizda.online code is: ${sms.otp}`,
        MessageAttributes: {
          "AWS.SNS.SMS.SMSType": {
            DataType: "String",
            StringValue: "Transactional",
          },
        },
      }),
    );

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to send SMS:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
