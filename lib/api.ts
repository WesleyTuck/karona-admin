const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

export function setToken(token: string) {
  localStorage.setItem("admin_token", token);
}

export function clearToken() {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_permissions");
}

export function setPermissions(permissions: string[]) {
  localStorage.setItem("admin_permissions", JSON.stringify(permissions));
}

export function getPermissions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("admin_permissions") ?? "[]");
  } catch {
    return [];
  }
}

export function hasPermission(permission: string): boolean {
  return getPermissions().includes(permission);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message ?? `Erro HTTP ${res.status}`;
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  patchForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: "PATCH", body: form }),
};

// ─── Types ───────────────────────────────────────────────────────────────────

export type PayoutStatus = "PENDING" | "PAID" | "FAILED";

export interface TripSummary {
  origin: string;
  destination: string;
  scheduledAt: string;
  status: string;
  payment: { amount: number; type: string; status: string; createdAt: string } | null;
  passenger: { id: string; name: string; email: string; phone: string } | null;
}

export interface DriverPayout {
  id: string;
  tripId: string;
  driverId: string;
  grossAmount: number;
  feePercent: number;
  feeAmount: number;
  netAmount: number;
  status: PayoutStatus;
  driverNameSnapshot: string | null;
  passengerNameSnapshot: string | null;
  pixKeySnapshot: string | null;
  pixKeyTypeSnapshot: string | null;
  originSnapshot: string | null;
  destinationSnapshot: string | null;
  paymentConfirmedAt: string | null;
  paidAt: string | null;
  receiptUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  trip: TripSummary;
  paidBy: { id: string; name: string; email: string } | null;
}

export interface PayoutsResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
  items: DriverPayout[];
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  permissions: string[];
  createdAt: string;
}

export interface AdminUsersResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
  items: AdminUserItem[];
}

export interface CreateAdminUserPayload {
  name: string;
  email: string;
  password: string;
  permissions: string[];
}

export type DriverVerificationStatus = "PENDING_VALIDATION" | "UNDER_REVIEW" | "VERIFIED";

export interface DriverVerification {
  id: string;
  userId: string;
  cpf: string | null;
  verified: boolean;
  verificationStatus: DriverVerificationStatus;
  cnhPhotoUrl: string | null;
  selfiePhotoUrl: string | null;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleColor: string;
  seats: number;
  totalEarnings: number;
  acceptanceRate: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    cpf: string | null;
    rating: number;
    totalTrips: number;
    createdAt: string;
  };
  cnhSignedUrl?: string | null;
  selfieSignedUrl?: string | null;
}
