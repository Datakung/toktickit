import { useCallback, useEffect, useState } from "react";
import {
  getDevelopmentRequesters,
  type DevelopmentRequester,
} from "./api.js";
import "./app.css";

export const DEVELOPMENT_REQUESTER_STORAGE_KEY =
  "toktickit.developmentRequesterId";

type LoadState = "loading" | "ready" | "empty" | "error";

function navigate(path: string) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, "", path);
  }
}

function RequesterSelection({
  loadState,
  requesters,
  selectedId,
  onSelectedIdChange,
  onContinue,
  onRetry,
}: {
  loadState: LoadState;
  requesters: DevelopmentRequester[];
  selectedId: string;
  onSelectedIdChange: (id: string) => void;
  onContinue: () => void;
  onRetry: () => void;
}) {
  return (
    <main className="selection-page">
      <section className="selection-card" aria-labelledby="selection-title">
        <p className="eyebrow">TokTickIT IT Service Desk</p>
        <h1 id="selection-title">Select a Development Requester</h1>
        <p className="selection-intro">
          Select a Development Requester to test requester-specific ticket behavior.
          This is not a login screen. Authentication and role-based access will be
          introduced in Lab 3.
        </p>

        {loadState === "loading" && (
          <div className="selection-form" aria-busy="true">
            <label htmlFor="development-requester">Development Requester</label>
            <select id="development-requester" disabled>
              <option>Loading…</option>
            </select>
            <p className="helper-text" aria-live="polite">
              Loading Development Requesters…
            </p>
            <button className="primary-button" type="button" disabled>
              Continue
            </button>
          </div>
        )}

        {loadState === "ready" && (
          <div className="selection-form">
            <label htmlFor="development-requester">
              Development Requester <span aria-hidden="true">*</span>
            </label>
            <p className="helper-text" id="requester-help">
              Required testing context for requester-specific screens.
            </p>
            <select
              id="development-requester"
              aria-describedby="requester-help"
              value={selectedId}
              onChange={(event) => onSelectedIdChange(event.target.value)}
            >
              <option value="">Choose a Development Requester</option>
              {requesters.map((requester) => (
                <option key={requester.id} value={requester.id}>
                  {requester.displayName} — {requester.email}
                </option>
              ))}
            </select>
            <button
              className="primary-button"
              type="button"
              disabled={!selectedId}
              onClick={onContinue}
            >
              Continue
            </button>
          </div>
        )}

        {loadState === "empty" && (
          <div className="feedback-panel" role="status">
            <h2>No Requesters available</h2>
            <p>No active Development Requesters are available.</p>
          </div>
        )}

        {loadState === "error" && (
          <div className="feedback-panel feedback-panel-error" role="alert">
            <h2>Development Requesters are unavailable</h2>
            <p>We could not load the testing list. Try again.</p>
            <button className="secondary-button" type="button" onClick={onRetry}>
              Retry
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function AppShell({
  requester,
  onChangeRequester,
}: {
  requester: DevelopmentRequester;
  onChangeRequester: () => void;
}) {
  return (
    <div className="app-layout">
      <header className="app-header">
        <a className="brand" href="/tickets" aria-label="TokTickIT home">
          <span>TokTickIT</span>
          <small>IT Service Desk</small>
        </a>
        <nav aria-label="Primary navigation">
          <span aria-current="page">My Tickets</span>
          <span>Create Ticket</span>
        </nav>
        <div className="requester-context">
          <span className="context-label">Development Requester</span>
          <strong>{requester.displayName}</strong>
          <button className="text-button" type="button" onClick={onChangeRequester}>
            Change Requester
          </button>
        </div>
      </header>
      <main className="app-content">
        <p className="eyebrow">Development Requester testing context</p>
        <h1>Requester context ready</h1>
        <p>
          You are testing as <strong>{requester.displayName}</strong>. Ticket features
          will be added in the next Lab 2 Issues.
        </p>
      </main>
    </div>
  );
}

export default function App() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [requesters, setRequesters] = useState<DevelopmentRequester[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [currentRequester, setCurrentRequester] =
    useState<DevelopmentRequester | null>(null);

  const loadRequesters = useCallback(async () => {
    setLoadState("loading");
    setRequesters([]);

    try {
      const activeRequesters = await getDevelopmentRequesters();
      setRequesters(activeRequesters);

      if (activeRequesters.length === 0) {
        sessionStorage.removeItem(DEVELOPMENT_REQUESTER_STORAGE_KEY);
        setCurrentRequester(null);
        navigate("/select-requester");
        setLoadState("empty");
        return;
      }

      const storedId = sessionStorage.getItem(DEVELOPMENT_REQUESTER_STORAGE_KEY);
      const storedRequester = activeRequesters.find(
        (requester) => String(requester.id) === storedId,
      );

      if (storedRequester && window.location.pathname !== "/select-requester") {
        setSelectedId(String(storedRequester.id));
        setCurrentRequester(storedRequester);
      } else if (storedId && !storedRequester) {
        sessionStorage.removeItem(DEVELOPMENT_REQUESTER_STORAGE_KEY);
        setSelectedId("");
        setCurrentRequester(null);
        navigate("/select-requester");
      } else {
        setCurrentRequester(null);
        navigate("/select-requester");
      }

      setLoadState("ready");
    } catch {
      setRequesters([]);
      setCurrentRequester(null);
      setLoadState("error");
      navigate("/select-requester");
    }
  }, []);

  useEffect(() => {
    void loadRequesters();
  }, [loadRequesters]);

  function continueAsRequester() {
    const requester = requesters.find(
      (candidate) => String(candidate.id) === selectedId,
    );
    if (!requester) return;

    sessionStorage.setItem(DEVELOPMENT_REQUESTER_STORAGE_KEY, selectedId);
    setCurrentRequester(requester);
    navigate("/tickets");
  }

  function changeRequester() {
    sessionStorage.removeItem(DEVELOPMENT_REQUESTER_STORAGE_KEY);
    setCurrentRequester(null);
    setSelectedId("");
    navigate("/select-requester");
    setLoadState(requesters.length === 0 ? "empty" : "ready");
  }

  if (currentRequester) {
    return (
      <AppShell requester={currentRequester} onChangeRequester={changeRequester} />
    );
  }

  return (
    <RequesterSelection
      loadState={loadState}
      requesters={requesters}
      selectedId={selectedId}
      onSelectedIdChange={setSelectedId}
      onContinue={continueAsRequester}
      onRetry={() => void loadRequesters()}
    />
  );
}
