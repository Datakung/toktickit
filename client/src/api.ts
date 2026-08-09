const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

// Issue 2 checks the backend health endpoint and returns an empty category list.
// Issue 4 will extend this function to fetch `/api/categories` from PostgreSQL.
// Throwing on failure lets the UI show an Offline/error state.
export async function checkSystem(): Promise<SystemStatus> {
  const response = await fetch(`${API_URL}/api/health`);

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  const health = await response.json();

  if (health.status !== "ok") {
    throw new Error("The backend returned an unhealthy status");
  }

  return {
    online: true,
    categories: [],
  };
}
