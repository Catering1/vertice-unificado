import { describe, expect, it } from "vitest";
import { contactEmailUrl } from "@/lib/contact";

describe("contact request handoff", () => {
  const request = { name: "João", email: "joao@example.com", subject: "Interesse: S26+ 512 GB", message: "Olá!\nInclui caixa? & acessórios" };
  it("keeps the selected product and encodes the message for the email application", () => {
    const url = new URL(contactEmailUrl("loja@example.com", request)!);
    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe("loja@example.com");
    expect(url.searchParams.get("subject")).toBe(request.subject);
    expect(url.searchParams.get("body")).toContain(request.message);
    expect(url.searchParams.get("body")).toContain(request.email);
  });
  it.each(["", "sem-email", "a@example.com,b@example.com", "a@example.com\nBcc:x@example.com"])("does not claim a request can be sent with destination %s", email => {
    expect(contactEmailUrl(email, request)).toBeNull();
  });
});
