import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTHENTICATION_LOST, authenticatedHeaders, clearAuthentication, getCurrentUser, getTicket, getCategories, getRelatedSystems, getTicketAttachments, getAttachmentContent } from "../../src/api.js";

afterEach(() => { clearAuthentication(); vi.unstubAllGlobals(); });
describe("central session invalidation", () => {
  it.each([
    ["Ticket", () => getTicket(1, 1)],
    ["categories", () => getCategories()],
    ["related systems", () => getRelatedSystems()],
    ["attachments", () => getTicketAttachments(1, 1)],
    ["download", () => getAttachmentContent(1, 1, 1, "attachment")],
  ] as const)("clears CSRF and signals login on an expired %s request", async (_name, load) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: 1 }, csrfToken: "old-session-token" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "AUTHENTICATION_REQUIRED" } }), { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    await getCurrentUser();
    expect(authenticatedHeaders(1)).toEqual({ "X-CSRF-Token": "old-session-token" });
    const lost = vi.fn(); window.addEventListener(AUTHENTICATION_LOST, lost);
    try {
      await expect(load()).rejects.toMatchObject({ status: 401, code: "AUTHENTICATION_REQUIRED" });
      expect(lost).toHaveBeenCalledOnce();
      expect(authenticatedHeaders(1)).toEqual({});
    } finally { window.removeEventListener(AUTHENTICATION_LOST, lost); }
  });
  it.each(["FORBIDDEN", "PASSWORD_CHANGE_REQUIRED"])("does not treat 403 %s as an expired session", async code => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code } }), { status: 403 })));
    const lost = vi.fn(); window.addEventListener(AUTHENTICATION_LOST, lost);
    try {
      await expect(getTicket(1, 1)).rejects.toMatchObject({ status: 403, code });
      expect(lost).not.toHaveBeenCalled();
    } finally { window.removeEventListener(AUTHENTICATION_LOST, lost); }
  });
});
