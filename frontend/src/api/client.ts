export class ApiError extends Error {
  errorKey: string;
  status: number;

  constructor(errorKey: string, message: string, status: number) {
    super(message);
    this.errorKey = errorKey;
    this.status = status;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

async function parseErrorBody(response: Response): Promise<{ error_key: string; message: string }> {
  try {
    return await response.json();
  } catch {
    return { error_key: "error.unknown", message: "Noma'lum xatolik" };
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const body = await parseErrorBody(response);
    throw new ApiError(body.error_key, body.message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function uploadFile(path: string, file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const headers = new Headers();
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { method: "POST", body: formData, headers });
  if (!response.ok) {
    const body = await parseErrorBody(response);
    throw new ApiError(body.error_key, body.message, response.status);
  }
  return (await response.json()) as { url: string };
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
