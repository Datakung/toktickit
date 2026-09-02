import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

describe("Lab 1 regressions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("retains the TokTickIT product heading", () => {
    vi.spyOn(api, "getDevelopmentRequesters").mockReturnValue(new Promise(() => {}));

    render(<App />);

    expect(screen.getByText(/TokTickIT IT Service Desk/i)).toBeInTheDocument();
  });

  it("retains the Lab 1 health and category helper", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "ok", service: "TokTickIT API" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { id: 1, name: "Account and Access" },
            { id: 2, name: "Hardware" },
            { id: 3, name: "Software" },
            { id: 4, name: "Network" },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.checkSystem()).resolves.toEqual({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("still rejects an unhealthy backend response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "error" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(api.checkSystem()).rejects.toThrow(
      "The backend returned an unhealthy status",
    );
  });

  it("still rejects a failed Category request", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ status: "ok" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        )
        .mockResolvedValueOnce(new Response(null, { status: 500 })),
    );

    await expect(api.checkSystem()).rejects.toThrow(
      "Category request failed with status 500",
    );
  });
});
