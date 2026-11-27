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
};

// ─── Types ───────────────────────────────────────────────────────────────────

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

export interface UpdateAdminUserPayload {
  name: string;
  email: string;
  password?: string;
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

export interface PlatformFinancialSettings {
  commissionPercent: number;
  pixGatewayFeePercent: number;
  withdrawFee: number;
  minimumWithdrawAmount: number;
  /** Saque especial: a partir deste saldo disponível o motorista saca sem pagar a taxa. */
  specialWithdrawMinimum: number;
  updatedAt: string;
  updatedByAdminEmail: string | null;
}

export type UpdateFinancialSettingsPayload = Omit<
  PlatformFinancialSettings,
  "updatedAt" | "updatedByAdminEmail"
>;

/** Parâmetros da viagem sob demanda (estilo Uber). */
export interface OnDemandSettings {
  enabled: boolean;
  baseFare: number;
  pricePerKm: number;
  pricePerMinute: number;
  minimumFare: number;
  radiusKm: number;
  offerTimeoutSeconds: number;
  searchTimeoutSeconds: number;
  scheduledBufferMinutes: number;
  presenceTtlSeconds: number;
  updatedAt: string | null;
  updatedByAdminEmail: string | null;
}

/** Recebedores da AppMax (motoristas que recebem split): GET /admin/recipients. */
export type RecipientStatusKey =
  | "AWAITING_FACEMATCH"
  | "ON_VERIFICATION"
  | "COMPLETED"
  | "UNKNOWN";

export interface AdminRecipientRow {
  recipientHash: string;
  status: RecipientStatusKey;
  statusLabel: string;
  appmaxStatus: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  /** Mascarado: só os 4 últimos dígitos. */
  document: string | null;
  companyName: string | null;
  /** "YYYY-MM-DD HH:MM:SS" (horário da AppMax) */
  createdAt: string | null;
  inAppmax: boolean;
  driver: {
    id: string;
    userId: string;
    name: string;
    email: string;
    personType: string;
    autoWithdraw: boolean;
  } | null;
  /** Em reais; null = ainda não aprovado (sem saldo na AppMax). */
  balance: { available: number; toRelease: number } | null;
  balanceError: string | null;
  payouts: {
    pendingCount: number;
    pendingAmount: number;
    failedCount: number;
    failedAmount: number;
    paidAmount: number;
  };
}

export interface AdminRecipientsOverview {
  generatedAt: string;
  cached: boolean;
  totals: {
    recipients: number;
    byStatus: Record<RecipientStatusKey, number>;
    available: number;
    toRelease: number;
    withAvailable: number;
    withToRelease: number;
    pendingPayoutsAmount: number;
    pendingPayoutsCount: number;
    failedPayoutsAmount: number;
    failedPayoutsCount: number;
  };
  recipients: AdminRecipientRow[];
}

/** Saques dos motoristas na AppMax: GET /admin/recipients/withdrawals. */
export interface AdminWithdrawalRow {
  id: string;
  type: "REGULAR" | "SPECIAL";
  driver: { id: string; name: string; email: string };
  amount: number;
  status: string | null;
  net: number | null;
  fee: number;
  feeToReimburse: number;
  reimbursedAt: string | null;
  createdAt: string;
}

export interface AdminWithdrawalsOverview {
  totals: {
    count: number;
    specialCount: number;
    feeToReimburseAmount: number;
    feeToReimburseCount: number;
    reimbursedAmount: number;
  };
  withdrawals: AdminWithdrawalRow[];
}

export type UpdateOnDemandSettingsPayload = Omit<
  OnDemandSettings,
  "updatedAt" | "updatedByAdminEmail"
>;
