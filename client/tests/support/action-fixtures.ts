import { afterEach, beforeEach, expect, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as api from "../../src/api.js";
import type { ActionPage } from "../../src/api.js";

export function emptyActionPage(ticketVersion: number, currentCycle = 1, page = 1): ActionPage {
  return {
    items: [], page, pageSize: 20, total: 0, totalPages: 1,
    ticketVersion, currentCycle,
    resolutionGate: {
      cycle: currentCycle, completedCount: 0, unfinishedCount: 0,
      outstandingFollowUpCount: 0, meetsActionRequirements: false,
    },
  };
}

export const emptyWorkflowHistory = (): api.WorkflowHistoryPage => ({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 });

// API-mocked component fixtures must never fall through to a real local server.
export function requireMockedNetwork() {
  let requests: Parameters<typeof fetch>[0][] = [];
  let restoreFetch = () => {};
  beforeEach(() => {
    requests = [];
    // Every legacy detail fixture now includes the additive workflow-history read.
    vi.spyOn(api, "getWorkflowHistory").mockResolvedValue(emptyWorkflowHistory());
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      requests.push(input);
      throw new Error("Unexpected fetch: mock every API read in this component fixture.");
    });
    restoreFetch = () => fetchSpy.mockRestore();
  });
  afterEach(() => {
    try {
      cleanup();
      expect(requests, "API-mocked component tests must not make network requests").toEqual([]);
    } finally {
      restoreFetch();
      vi.restoreAllMocks();
    }
  });
}
