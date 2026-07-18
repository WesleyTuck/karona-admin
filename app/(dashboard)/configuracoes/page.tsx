"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, type PlatformFinancialSettings, type UpdateFinancialSettingsPayload } from "@/lib/api";
import { AlertCircle, CheckCircle2, Loader2, Save, Settings } from "lucide-react";
import AccessGuard from "@/components/access-guard";

const schema = z.object({
  commissionPercent: z.coerce.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
  pixGatewayFeePercent: z.coerce.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
  withdrawFee: z.coerce.number().min(0, "Não pode ser negativo"),
  minimumWithdrawAmount: z.coerce.number().min(0, "Não pode ser negativo"),
  freeWithdrawsPerDay: z.coerce.number().int("Deve ser um número inteiro").min(0, "Não pode ser negativo"),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

function fmtDate(d: string) {
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const inputClass =
  "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const labelClass = "block text-sm font-medium text-slate-700 mb-1";
const hintClass = "text-xs text-slate-400 font-normal";
const errorClass = "mt-1 text-xs text-red-600";

function ConfiguracoesContent() {
  const [settings, setSettings] = useState<PlatformFinancialSettings | null>(null);
  const [loadError, setLoadError] = useState("");
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({ resolver: zodResolver(schema) });

  useEffect(() => {
    api
      .get<PlatformFinancialSettings>("/admin/settings/financial")
      .then((data) => {
        setSettings(data);
        reset(data);
      })
      .catch((e: unknown) =>
        setLoadError(e instanceof Error ? e.message : "Erro ao carregar configurações"),
      );
  }, [reset]);

  async function onSubmit(data: FormOutput) {
    setServerError("");
    setSuccess(false);
    try {
      const updated = await api.patch<PlatformFinancialSettings>(
        "/admin/settings/financial",
        data as UpdateFinancialSettingsPayload,
      );
      setSettings(updated);
      reset(updated);
      setSuccess(true);
    } catch (e: unknown) {
      setServerError(e instanceof Error ? e.message : "Erro ao salvar configurações");
    }
  }

  if (loadError) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          <AlertCircle size={16} />
          {loadError}
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-1">
        <Settings size={22} className="text-slate-400" />
        <h1 className="text-2xl font-bold text-slate-800">Configurações Financeiras</h1>
      </div>
      <p className="text-slate-500 text-sm mb-2">
        Regras de comissão e saque aplicadas em toda a plataforma.
      </p>
      {settings.updatedByAdminEmail && (
        <p className="text-xs text-slate-400 mb-8">
          Última alteração em {fmtDate(settings.updatedAt)} por {settings.updatedByAdminEmail}
        </p>
      )}
      {!settings.updatedByAdminEmail && <div className="mb-8" />}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-xl border border-slate-200 p-5 space-y-5"
      >
        <div>
          <label className={labelClass}>
            Comissão da plataforma <span className={hintClass}>(% sobre o valor da corrida, já descontada a taxa Pix)</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...register("commissionPercent")}
            className={inputClass}
          />
          {errors.commissionPercent && <p className={errorClass}>{errors.commissionPercent.message}</p>}
        </div>

        <div>
          <label className={labelClass}>
            Taxa do gateway Pix <span className={hintClass}>(% cobrado pela Woovi, descontado antes do split com o motorista)</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...register("pixGatewayFeePercent")}
            className={inputClass}
          />
          {errors.pixGatewayFeePercent && (
            <p className={errorClass}>{errors.pixGatewayFeePercent.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>
            Taxa de saque <span className={hintClass}>(R$ cobrado após o saque gratuito diário)</span>
          </label>
          <input type="number" step="0.01" {...register("withdrawFee")} className={inputClass} />
          {errors.withdrawFee && <p className={errorClass}>{errors.withdrawFee.message}</p>}
        </div>

        <div>
          <label className={labelClass}>
            Valor mínimo de saque <span className={hintClass}>(R$)</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...register("minimumWithdrawAmount")}
            className={inputClass}
          />
          {errors.minimumWithdrawAmount && (
            <p className={errorClass}>{errors.minimumWithdrawAmount.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>
            Saques gratuitos por dia <span className={hintClass}>(quantidade)</span>
          </label>
          <input
            type="number"
            step="1"
            {...register("freeWithdrawsPerDay")}
            className={inputClass}
          />
          {errors.freeWithdrawsPerDay && (
            <p className={errorClass}>{errors.freeWithdrawsPerDay.message}</p>
          )}
        </div>

        {serverError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">
            <AlertCircle size={15} />
            {serverError}
          </div>
        )}

        {success && !serverError && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-3 py-2.5 rounded-lg">
            <CheckCircle2 size={15} />
            Configurações salvas com sucesso.
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isSubmitting ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <AccessGuard permission="MANAGE_SETTINGS">
      <ConfiguracoesContent />
    </AccessGuard>
  );
}
