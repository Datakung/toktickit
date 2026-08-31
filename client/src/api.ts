const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export interface DevelopmentRequester {
  id: number;
  displayName: string;
  email: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

// Check both backend dependencies. Throwing on either failure lets the UI show
// one useful Offline/error state.
export async function checkSystem(): Promise<SystemStatus> {
  const response = await fetch(`${API_URL}/api/health`);

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  const health = await response.json();

  if (health.status !== "ok") {
    throw new Error("The backend returned an unhealthy status");
  }

  const categoriesResponse = await fetch(`${API_URL}/api/categories`);

  if (!categoriesResponse.ok) {
    throw new Error(
      `Category request failed with status ${categoriesResponse.status}`,
    );
  }

  const categories = (await categoriesResponse.json()) as Category[];

  return {
    online: true,
    categories,
  };
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getCategories(): Promise<Category[]> {
  return getJson<Category[]>("/api/categories");
}

export function getRelatedSystems(): Promise<RelatedSystem[]> {
  return getJson<RelatedSystem[]>("/api/related-systems");
}

export function getDevelopmentRequesters(): Promise<DevelopmentRequester[]> {
  return getJson<DevelopmentRequester[]>("/api/development-requesters");
}

export function developmentRequesterHeaders(requesterId: number): HeadersInit {
  return {
    "X-Development-Requester-Id": String(requesterId),
  };
}
