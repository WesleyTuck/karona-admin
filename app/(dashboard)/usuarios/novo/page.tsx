"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, type CreateAdminUserPayload } from "@/lib/api";
import { ArrowLeft, Loader2 } from "lucide-react";
import AccessGuard from "@/components/access-guard";

const PERMISSIONS = [
  { value: "MANAGE_PAYOUTS", label: "Faturamento", description: "Visualizar e confirmar repasses" },
  { value: "MANAGE_VERIFICATIONS", label: "Verificações", description: "Analisar e aprovar motoristas" },
  { value: "MANAGE_USERS", label: "Usuários", description: "Gerenciar administradores" },
  { value: "MANAGE_SETTINGS", label: "Configurações", description: "Editar regras financeiras da plataforma" },
] as const;

const schema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  permissions: z.array(z.string()),
});

type FormData = z.infer<typeof schema>;

function NovoAdminContent() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { permissions: [] },
  });

  const selectedPermissions = watch("permissions");

  function togglePermission(value: string) {
    const current = selectedPermissions ?? [];
    setValue(
      "permissions",
      current.includes(value) ? current.filter((p) => p !== value) : [...current, value],
    );
  }

  async function onSubmit(data: FormData) {
    setServerError("");
    try {
      await api.post<{ access_token: string; permissions: string[] }>(
        "/admin/auth/register",
        data as CreateAdminUserPayload,
      );
      router.push("/usuarios");
    } catch (e: unknown) {
      setServerError(e instanceof Error ? e.message : "Erro ao cadastrar administrador");
    }
  }

  const inputClass =
    "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1";
  const errorClass = "mt-1 text-xs text-red-600";

  return (
    <div className="p-8 max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.push("/usuarios")}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Novo administrador</h1>
          <p className="text-slate-500 text-sm mt-0.5">Crie um novo acesso ao painel</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Nome */}
        <div>
          <label className={labelClass}>Nome completo</label>
          <input type="text" {...register("name")} className={inputClass} placeholder="João da Silva" />
          {errors.name && <p className={errorClass}>{errors.name.message}</p>}
        </div>

        {/* E-mail */}
        <div>
          <label className={labelClass}>E-mail</label>
          <input type="email" {...register("email")} className={inputClass} placeholder="joao@rotafacil.com" />
          {errors.email && <p className={errorClass}>{errors.email.message}</p>}
        </div>

        {/* Senha */}
        <div>
          <label className={labelClass}>Senha</label>
          <input type="password" {...register("password")} className={inputClass} placeholder="Mínimo 6 caracteres" />
          {errors.password && <p className={errorClass}>{errors.password.message}</p>}
        </div>

        {/* Permissões */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Permissões</label>
          <div className="space-y-2">
            {PERMISSIONS.map(({ value, label, description }) => {
              const checked = selectedPermissions?.includes(value) ?? false;
              return (
                <label
                  key={value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    checked
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePermission(value)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{label}</p>
                    <p className="text-xs text-slate-500">{description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
            {serverError}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => router.push("/usuarios")}
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
  );
}

export default function NovoAdminPage() {
  return (
    <AccessGuard permission="MANAGE_USERS">
      <NovoAdminContent />
    </AccessGuard>
  );
}
