const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
const API_URL = (
  configuredApiUrl ??
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:4001/api")
).replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_URL) {
    throw new ApiError(
      "Live API is not configured. Set NEXT_PUBLIC_API_URL in Vercel to your deployed API URL.",
      0,
    );
  }
  let response: Response;
  try {
    const headers = new Headers(options.headers);
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      cache: "no-store",
      headers,
    });
  } catch {
    throw new ApiError("Unable to reach the API. Check that the backend is running.", 0);
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new ApiError(payload?.message ?? "The request could not be completed.", response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}
