import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

describe("Zen Green requester-context foundation", () => {
  it("uses accessible control semantics and the approved component hierarchy", async () => {
    vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue([
      {
        id: 1,
        displayName: "Anan Chaiyasit",
        email: "anan.chaiyasit@example.test",
      },
    ]);

    render(<App />);

    await screen.findByRole("option", { name: /Anan Chaiyasit/i });
    const select = screen.getByRole("combobox", {
      name: /Development Requester/i,
    });
    expect(select).toHaveAttribute("aria-describedby", "requester-help");
    expect(select.closest(".selection-card")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Continue" })).toHaveClass(
      "primary-button",
    );
  });
});
