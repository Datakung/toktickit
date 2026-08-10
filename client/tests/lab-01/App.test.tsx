import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  it("shows a loading state while checking the system", async () => {
    vi.spyOn(api, "checkSystem").mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: /Check System/i }),
    );

    expect(screen.getByText(/Checking the backend/i)).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows Online and the seeded categories on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: /Check System/i }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent("Online");
    expect(screen.getByText("Account and Access")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(
      new Error("API unavailable"),
    );

    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: /Check System/i }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Offline");
    expect(alert).toHaveTextContent("Cannot reach the TokTickIT API");
  });
});
