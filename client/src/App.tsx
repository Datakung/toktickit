import { useState } from "react";
import { checkSystem, Category } from "./api.js";

// Issue 2 handles these health-check states. Issue 4 will extend the success
// state by displaying the categories returned by the backend.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  void categories;
  void setCategories;

  async function handleCheck() {
    // Issue 4 will also store result.categories after this health check.
    setState("loading");
    setErrorMessage("");

    try {
      await checkSystem();
      setState("success");
    } catch {
      setErrorMessage(
        "Cannot reach the TokTickIT API. Make sure the backend is running and try again.",
      );
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "loading" && (
        <p className="mt-3 text-secondary">Checking the backend…</p>
      )}

      {state === "success" && (
        <div className="alert alert-success mt-3" role="status">
          <strong>Online.</strong> TokTickIT API is available.
        </div>
      )}

      {state === "error" && (
        <div className="alert alert-danger mt-3" role="alert">
          <strong>Offline.</strong> {errorMessage}
        </div>
      )}
    </div>
  );
}
