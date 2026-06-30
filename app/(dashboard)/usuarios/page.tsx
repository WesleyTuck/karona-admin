"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  api,
  hasPermission,
  type AppUser,
  type UsersResponse,
  type UserRole,
  type CreateUserPayload,
} from "@/lib/api";
import {
  Users,
  Loader2,
  AlertCircle,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldOff,
} from "lucide-react";

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  role: z.enum(["PASSENGER", "DRIVER"]),
});

type FormData = z.infer<typeof schema>;

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

// ─── Register Form Modal ──────────────────────────────────────────────────────

function RegisterModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "PASSENGER" },
  });

  async function onSubmit(data: FormData) {
    setServerError("");
    try {
      await api.post<AppUser>("/admin/users", data as CreateUserPayload);
      onSuccess();
    } catch (e: unknown) {
      setServerError(e instanceof Error ? e.message : "Erro ao cadastrar usuário");
    }
  }

  const inputClass =
    "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1";
  const errorClass = "mt-1 text-xs text-red-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Cadastrar usuário</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelClass}>Nome completo</label>
            <input
              type="text"
              {...register("name")}
              className={inputClass}
              placeholder="João da Silva"
            />
            {errors.name && <p className={errorClass}>{errors.name.message}</p>}
          </div>

          <div>
            <label className={labelClass}>E-mail</label>
            <input
              type="email"
              {...register("email")}
              className={inputClass}
              placeholder="joao@exemplo.com"
            />
            {errors.email && <p className={errorClass}>{errors.email.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Telefone</label>
            <input
              type="tel"
              {...register("phone")}
              className={inputClass}
              placeholder="(11) 99999-9999"
            />
            {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Senha</label>
            <input
              type="password"
              {...register("password")}
              className={inputClass}
              placeholder="Mínimo 6 caracteres"
            />
            {errors.password && <p className={errorClass}>{errors.password.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Tipo de conta</label>
            <select {...register("role")} className={inputClass}>
              <option value="PASSENGER">Passageiro</option>
              <option value="DRIVER">Motorista</option>
            </select>
            {errors.role && <p className={errorClass}>{errors.role.message}</p>}
          </div>

          {serverError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              <AlertCircle size={14} />
              {serverError}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isSubmitting ? "Cadastrando..." : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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
  const [showModal, setShowModal] = useState(false);

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
    load();
  }, [load]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setRoleFilter(e.target.value as UserRole | "");
    setPage(1);
  }

  function handleSuccess() {
    setShowModal(false);
    load();
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
    <>
      {showModal && (
        <RegisterModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />
      )}

      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Usuários</h1>
            <p className="text-slate-500 text-sm mt-1">
              Passageiros e motoristas cadastrados na plataforma
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Cadastrar usuário
          </button>
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
            <p className="text-sm">Tente ajustar os filtros ou cadastre um novo usuário.</p>
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
                    <th className="text-left px-5 py-3 text-slate-500 font-semibold">
                      Avaliação
                    </th>
                    <th className="text-left px-5 py-3 text-slate-500 font-semibold">Viagens</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-semibold">
                      Cadastrado em
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((user) => (
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
                      <td className="px-5 py-4 text-slate-600">
                        ★ {user.rating.toFixed(1)}
                      </td>
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
    </>
  );
}
