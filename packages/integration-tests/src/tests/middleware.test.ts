import { SITE_URL } from "../helpers/config.js";

describe("middleware", () => {
  it("GET /search redirects to /login for unauthenticated users", async () => {
    const response = await fetch(`${SITE_URL}/search`, { redirect: "manual" });
    expect(response.status).toBe(307);

    const location = response.headers.get("location");
    expect(location).toBeDefined();
    expect(location).toContain("/login");
  });
});
