import { createAnonClient, createAdminClient } from "../helpers/supabase-client.js";
import { cleanupOtpCodes } from "../helpers/cleanup.js";
import { TEST_PHONE } from "../helpers/config.js";

const admin = createAdminClient();

describe.skipIf(!process.env.E2E)("auth - SMS OTP flow", () => {
  afterAll(async () => {
    await cleanupOtpCodes(TEST_PHONE);
  });

  it("sends OTP, retrieves from _test_otp_codes, verifies successfully", async () => {
    const client = createAnonClient();

    // Request OTP
    const { error: otpError } = await client.auth.signInWithOtp({
      phone: TEST_PHONE,
    });
    expect(otpError).toBeNull();

    // Wait for the OTP to be stored by the send-sms hook
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Retrieve OTP from _test_otp_codes via admin client
    const { data: otpRows, error: fetchError } = await admin
      .from("_test_otp_codes")
      .select("otp")
      .eq("phone", TEST_PHONE)
      .order("created_at", { ascending: false })
      .limit(1);

    expect(fetchError).toBeNull();
    expect(otpRows).toBeDefined();
    expect(otpRows!.length).toBeGreaterThan(0);

    const otp = otpRows![0]!.otp;
    expect(otp).toBeDefined();
    expect(otp.length).toBeGreaterThan(0);

    // Verify OTP
    const { data: verifyData, error: verifyError } = await client.auth.verifyOtp({
      phone: TEST_PHONE,
      token: otp,
      type: "sms",
    });

    expect(verifyError).toBeNull();
    expect(verifyData.session).toBeDefined();
    expect(verifyData.session!.access_token).toBeTruthy();
  });
});
