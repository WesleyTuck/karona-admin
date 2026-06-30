"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  hasPermission,
  type AppUser,
  type UsersResponse,
  type UserRole,
} from "@/lib/api";
import {
  Users,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldOff,
} from "lucide-react";

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  if (role === "DRIVER") {
    return (
      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
        Motorista
      </span>
    );
  }
  return (
    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
      Passageiro
    </span>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");

  useEffect(() => {
    setAllowed(hasPermission("MANAGE_USERS"));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      const res = await api.get<UsersResponse>(`/admin/users?${params}`);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    if (allowed) load();
  }, [load, allowed]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setRoleFilter(e.target.value as UserRole | "");
    setPage(1);
  }

  const items = data?.items ?? [];

  if (allowed === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400">
        <ShieldOff size={48} className="mb-4" />
        <p className="text-lg font-semibold text-slate-600">Acesso negado</p>
        <p className="text-sm mt-1">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Usuários</h1>
        <p className="text-slate-500 text-sm mt-1">
          Passageiros e motoristas cadastrados na plataforma
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por nome, e-mail..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={handleRoleChange}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value="">Todos os tipos</option>
          <option value="PASSENGER">Passageiros</option>
          <option value="DRIVER">Motoristas</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Users size={40} className="mb-3" />
          <p className="font-medium">Nenhum usuário encontrado</p>
          <p className="text-sm">Tente ajustar os filtros.</p>
        </div>
      )}

      {/* Table */}
      {!loading && items.length > 0 && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Usuário</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Telefone</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Tipo</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Avaliação</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Viagens</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">
                    Cadastrado em
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((user: AppUser) => (
                  <tr
                    key={user.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{user.name}</div>
                      <div className="text-slate-400 text-xs">{user.email}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{user.phone}</td>
                    <td className="px-5 py-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-5 py-4 text-slate-600">★ {user.rating.toFixed(1)}</td>
                    <td className="px-5 py-4 text-slate-600">{user.totalTrips}</td>
                    <td className="px-5 py-4 text-slate-500">{fmtDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-500">
                {data.total} usuário{data.total !== 1 ? "s" : ""} encontrado
                {data.total !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="p-1.5 rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-slate-600 px-1">
                  {page} / {data.pages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === data.pages}
                  className="p-1.5 rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
