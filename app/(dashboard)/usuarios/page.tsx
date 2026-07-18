"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type AdminUserItem, type AdminUsersResponse } from "@/lib/api";
import { PERMISSION_LABELS } from "@/lib/permissions";
import {
  Users,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Pencil,
} from "lucide-react";
import AccessGuard from "@/components/access-guard";

function PermissionBadge({ permission }: { permission: string }) {
  const label = PERMISSION_LABELS[permission] ?? permission;
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      {label}
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

function UsuariosContent() {
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const res = await api.get<AdminUsersResponse>(`/admin/users?${params}`);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  const items = data?.items ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Administradores</h1>
          <p className="text-slate-500 text-sm mt-1">Usuários com acesso ao painel administrativo</p>
        </div>
        <Link
          href="/usuarios/novo"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Novo administrador
        </Link>
      </div>

      <div className="mb-5">
        <div className="relative max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Users size={40} className="mb-3" />
          <p className="font-medium">Nenhum administrador encontrado</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Administrador</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Permissões</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-semibold">Cadastrado em</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((admin: AdminUserItem) => (
                  <tr
                    key={admin.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{admin.name}</div>
                      <div className="text-slate-400 text-xs">{admin.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      {admin.permissions.length === 0 ? (
                        <span className="text-slate-400 text-xs">Sem permissões</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {admin.permissions.map((p) => (
                            <PermissionBadge key={p} permission={p} />
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{fmtDate(admin.createdAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/usuarios/${admin.id}`}
                        className="inline-flex items-center gap-1.5 text-slate-400 hover:text-blue-600 text-xs font-medium transition-colors"
                      >
                        <Pencil size={13} />
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && data.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-500">
                {data.total} administrador{data.total !== 1 ? "es" : ""} encontrado
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

export default function UsuariosPage() {
  return (
    <AccessGuard permission="MANAGE_USERS">
      <UsuariosContent />
    </AccessGuard>
  );
}
