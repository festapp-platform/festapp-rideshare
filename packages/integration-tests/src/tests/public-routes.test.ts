import { SITE_URL } from "../helpers/config.js";

describe("public routes", () => {
  it("GET / returns 200", async () => {
    const response = await fetch(`${SITE_URL}/`);
    expect(response.status).toBe(200);
  });

  it("GET /login returns 200", async () => {
    const response = await fetch(`${SITE_URL}/login`);
    expect(response.status).toBe(200);
  });

  it("GET /signup returns 200", async () => {
    const response = await fetch(`${SITE_URL}/signup`);
    expect(response.status).toBe(200);
  });

  it("GET /help returns 200", async () => {
    const response = await fetch(`${SITE_URL}/help`);
    expect(response.status).toBe(200);
  });

  it("GET /terms returns 200", async () => {
    const response = await fetch(`${SITE_URL}/terms`);
    expect(response.status).toBe(200);
  });

  it("GET /privacy returns 200", async () => {
    const response = await fetch(`${SITE_URL}/privacy`);
    expect(response.status).toBe(200);
  });
});
