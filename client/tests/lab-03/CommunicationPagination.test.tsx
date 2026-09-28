import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { CommunicationPanel } from "../../src/CommunicationPanel.js";

afterEach(() => vi.restoreAllMocks());

describe.each(["comments", "notes"] as const)("%s pagination", kind => {
  it("reaches entries after the first 20 and retains a new entry after remount", async () => {
    const entries: api.CommunicationEntry[] = Array.from({ length: 21 }, (_, index) => ({
      id: index + 1,
      body: `Entry ${index + 1}`,
      author: { id: 1, displayName: "Mali" },
      createdAt: "2026-09-25T01:00:00Z",
    }));
    const getPage = vi.fn(async (_id: number, page = 1): Promise<api.EntryPage> => ({
      items: entries.slice((page - 1) * 20, page * 20),
      page,
      pageSize: 20,
      total: entries.length,
      totalPages: Math.ceil(entries.length / 20),
    }));
    const post = vi.fn(async (_id: number, body: string): Promise<api.CommunicationEntry> => {
      const entry = { id: entries.length + 1, body, author: { id: 1, displayName: "Mali" }, createdAt: "2026-09-25T02:00:00Z" };
      entries.push(entry);
      return entry;
    });
    vi.spyOn(api, "getPublicComments").mockImplementation(getPage);
    vi.spyOn(api, "getInternalNotes").mockImplementation(getPage);
    vi.spyOn(api, "postPublicComment").mockImplementation(post);
    vi.spyOn(api, "postInternalNote").mockImplementation(post);

    const user = userEvent.setup();
    const view = render(<CommunicationPanel ticketId={8} kind={kind} />);
    const title = kind === "comments" ? "Public Comments" : "Internal Notes";
    const pages = () => screen.getByRole("navigation", { name: `${title} pages` });
    expect(await screen.findByText("Entry 20")).toBeVisible();
    expect(screen.queryByText("Entry 21")).not.toBeInTheDocument();
    await user.click(within(pages()).getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Entry 21")).toBeVisible();
    expect(within(pages()).getByText("Page 2 of 2 · 21 entries")).toBeVisible();

    await user.type(screen.getByLabelText(kind === "comments" ? "Add a Public Comment" : "Add an Internal Note"), "Entry 22");
    await user.click(screen.getByRole("button", { name: "Post" }));
    expect(await screen.findByText("Entry 22")).toBeVisible();
    expect(getPage).toHaveBeenCalledWith(8, 2);

    view.unmount();
    render(<CommunicationPanel ticketId={8} kind={kind} />);
    expect(await screen.findByText("Entry 20")).toBeVisible();
    await user.click(within(pages()).getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Entry 22")).toBeVisible();
  });
});
