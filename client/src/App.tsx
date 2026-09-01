import { useCallback, useEffect, useState, type MouseEvent } from "react";
import {
  getDevelopmentRequesters,
  type DevelopmentRequester,
} from "./api.js";
import "./app.css";
import { CreateTicketPage } from "./CreateTicketPage.js";
import { MyTicketsPage } from "./MyTicketsPage.js";

export const DEVELOPMENT_REQUESTER_STORAGE_KEY =
  "toktickit.developmentRequesterId";

type LoadState = "loading" | "ready" | "empty" | "error";

function isRequesterPath(path: string) {
  return path === "/tickets" || path === "/tickets/new";
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
  currentPath,
  onNavigate,
  onChangeRequester,
}: {
  requester: DevelopmentRequester;
  currentPath: string;
  onNavigate: (path: string) => void;
  onChangeRequester: () => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function followAppLink(event: MouseEvent<HTMLAnchorElement>, path: string) {
    event.preventDefault();
    setIsMenuOpen(false);
    onNavigate(path);
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <a
          className="brand"
          href="/tickets"
          aria-label="TokTickIT home"
          onClick={(event) => followAppLink(event, "/tickets")}
        >
          <span>TokTickIT</span>
          <small>IT Service Desk</small>
        </a>
        <button
          className="mobile-nav-toggle secondary-button"
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          Menu
        </button>
        <nav
          className={`primary-navigation${isMenuOpen ? " primary-navigation-open" : ""}`}
          id="primary-navigation"
          aria-label="Primary navigation"
        >
          <a
            href="/tickets"
            aria-current={currentPath === "/tickets" ? "page" : undefined}
            onClick={(event) => followAppLink(event, "/tickets")}
          >
            My Tickets
          </a>
          <a
            href="/tickets/new"
            aria-current={currentPath === "/tickets/new" ? "page" : undefined}
            onClick={(event) => followAppLink(event, "/tickets/new")}
          >
            Create Ticket
          </a>
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
        {currentPath === "/tickets/new" ? (
          <CreateTicketPage requester={requester} />
        ) : (
          <MyTicketsPage key={requester.id} requester={requester} onNavigate={onNavigate} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [requesters, setRequesters] = useState<DevelopmentRequester[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentRequester, setCurrentRequester] =
    useState<DevelopmentRequester | null>(null);

  const navigate = useCallback((path: string, replace = false) => {
    if (window.location.pathname !== path) {
      window.history[replace ? "replaceState" : "pushState"]({}, "", path);
    }
    setCurrentPath(path);
  }, []);

  const loadRequesters = useCallback(async () => {
    setLoadState("loading");
    setRequesters([]);

    try {
      const activeRequesters = await getDevelopmentRequesters();
      setRequesters(activeRequesters);

      if (activeRequesters.length === 0) {
        sessionStorage.removeItem(DEVELOPMENT_REQUESTER_STORAGE_KEY);
        setSelectedId("");
        setCurrentRequester(null);
        navigate("/select-requester", true);
        setLoadState("empty");
        return;
      }

      const storedId = sessionStorage.getItem(DEVELOPMENT_REQUESTER_STORAGE_KEY);
      const storedRequester = activeRequesters.find(
        (requester) => String(requester.id) === storedId,
      );

      if (storedRequester) {
        setSelectedId(String(storedRequester.id));
        setCurrentRequester(storedRequester);

        if (
          window.location.pathname !== "/select-requester" &&
          !isRequesterPath(window.location.pathname)
        ) {
          navigate("/select-requester", true);
        } else {
          setCurrentPath(window.location.pathname);
        }
      } else if (storedId && !storedRequester) {
        sessionStorage.removeItem(DEVELOPMENT_REQUESTER_STORAGE_KEY);
        setSelectedId("");
        setCurrentRequester(null);
        navigate("/select-requester", true);
      } else {
        setSelectedId("");
        setCurrentRequester(null);
        navigate("/select-requester", true);
      }

      setLoadState("ready");
    } catch {
      setRequesters([]);
      setSelectedId("");
      setCurrentRequester(null);
      setLoadState("error");
      navigate("/select-requester", true);
    }
  }, [navigate]);

  useEffect(() => {
    void loadRequesters();
  }, [loadRequesters]);

  useEffect(() => {
    function handlePopState() {
      setCurrentPath(window.location.pathname);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (
      loadState !== "loading" &&
      !currentRequester &&
      isRequesterPath(currentPath)
    ) {
      navigate("/select-requester", true);
    }
  }, [currentPath, currentRequester, loadState, navigate]);

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

  if (currentRequester && isRequesterPath(currentPath)) {
    return (
      <AppShell
        requester={currentRequester}
        currentPath={currentPath}
        onNavigate={navigate}
        onChangeRequester={changeRequester}
      />
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
