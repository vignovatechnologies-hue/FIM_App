export const API_URL = "http://localhost:8000";

export const TOKEN_KEY = "fim.auth.token";

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const headers = new Headers(options.headers || {});

  // Fetch token from local storage
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Set default JSON Content-Type if body is present and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = "Something went wrong";
    try {
      const data = await response.json();
      errorMsg = data.detail || data.message || errorMsg;
    } catch {
      // Not JSON
    }
    throw new Error(errorMsg);
  }

  // If response has no content (204 or empty string)
  const contentType = response.headers.get("content-type");
  if (response.status === 204 || (contentType && !contentType.includes("application/json"))) {
    return {} as any;
  }

  return response.json();
}
