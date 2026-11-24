"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, type OnDemandSettings, type UpdateOnDemandSettingsPayload } from "@/lib/api";
import { AlertCircle, Car, CheckCircle2, Loader2, Save } from "lucide-react";
import AccessGuard from "@/components/access-guard";

const money = z.coerce.number().min(0, "Não pode ser negativo");

const schema = z
  .object({
    enabled: z.boolean(),
    baseFare: money,
    pricePerKm: money,
    pricePerMinute: money,
    minimumFare: money,
    radiusKm: z.coerce.number().min(0.5, "Mínimo 0,5 km").max(50, "Máximo 50 km"),
    offerTimeoutSeconds: z.coerce
      .number()
      .int("Deve ser inteiro")
      .min(5, "Mínimo 5 s")
      .max(120, "Máximo 120 s"),
    searchTimeoutSeconds: z.coerce
      .number()
      .int("Deve ser inteiro")
      .min(30, "Mínimo 30 s")
      .max(1800, "Máximo 1800 s"),
    scheduledBufferMinutes: z.coerce
      .number()
      .int("Deve ser inteiro")
      .min(0, "Não pode ser negativo")
      .max(240, "Máximo 240 min"),
    presenceTtlSeconds: z.coerce
      .number()
      .int("Deve ser inteiro")
      .min(15, "Mínimo 15 s")
      .max(600, "Máximo 600 s"),
  })
  .refine((v) => v.searchTimeoutSeconds >= v.offerTimeoutSeconds, {
    path: ["searchTimeoutSeconds"],
    message: "Não pode ser menor que o tempo de cada motorista",
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

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const inputClass =
  "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const labelClass = "block text-sm font-medium text-slate-700 mb-1";
const hintClass = "text-xs text-slate-400 font-normal";
const errorClass = "mt-1 text-xs text-red-600";
const sectionClass = "bg-white rounded-xl border border-slate-200 p-5 space-y-5";
const sectionTitleClass = "text-sm font-semibold text-slate-800";

function SobDemandaContent() {
  const [settings, setSettings] = useState<OnDemandSettings | null>(null);
  const [loadError, setLoadError] = useState("");
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [simKm, setSimKm] = useState(10);
  const [simMin, setSimMin] = useState(20);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({ resolver: zodResolver(schema) });

  useEffect(() => {
    api
      .get<OnDemandSettings>("/admin/settings/on-demand")
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
      const updated = await api.patch<OnDemandSettings>(
        "/admin/settings/on-demand",
        data as UpdateOnDemandSettingsPayload,
      );
      setSettings(updated);
      reset(updated);
      setSuccess(true);
    } catch (e: unknown) {
      setServerError(e instanceof Error ? e.message : "Erro ao salvar configurações");
    }
  }

  // Simulador: mesma fórmula do servidor (max(mínima, base + km·valor/km + min·valor/min)).
  const base = Number(watch("baseFare")) || 0;
  const perKm = Number(watch("pricePerKm")) || 0;
  const perMin = Number(watch("pricePerMinute")) || 0;
  const minimum = Number(watch("minimumFare")) || 0;
  const subtotal = base + simKm * perKm + simMin * perMin;
  const simPrice = Math.max(subtotal, minimum);

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
        <Car size={22} className="text-slate-400" />
        <h1 className="text-2xl font-bold text-slate-800">Viagem sob demanda</h1>
      </div>
      <p className="text-slate-500 text-sm mb-2">
        O passageiro solicita uma corrida e os motoristas próximos recebem o alerta. O app lê estes
        valores a cada cálculo de preço: a mudança vale na hora.
      </p>
      {settings.updatedByAdminEmail && settings.updatedAt ? (
        <p className="text-xs text-slate-400 mb-8">
          Última alteração em {fmtDate(settings.updatedAt)} por {settings.updatedByAdminEmail}
        </p>
      ) : (
        <div className="mb-8" />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className={sectionClass}>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" {...register("enabled")} className="mt-1 h-4 w-4" />
            <span>
              <span className={sectionTitleClass}>Modalidade ligada</span>
              <span className="block text-xs text-slate-500">
                Desligada, ninguém consegue solicitar corridas sob demanda (a viagem agendada não é
                afetada).
              </span>
            </span>
          </label>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Preço</h2>
          <p className="text-xs text-slate-500 -mt-3">
            preço = o maior entre a tarifa mínima e (base + km × valor por km + minutos × valor por
            minuto)
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Tarifa base <span className={hintClass}>(R$)</span>
              </label>
              <input type="number" step="0.01" {...register("baseFare")} className={inputClass} />
              {errors.baseFare && <p className={errorClass}>{errors.baseFare.message}</p>}
            </div>
            <div>
              <label className={labelClass}>
                Valor por km <span className={hintClass}>(R$)</span>
              </label>
              <input type="number" step="0.01" {...register("pricePerKm")} className={inputClass} />
              {errors.pricePerKm && <p className={errorClass}>{errors.pricePerKm.message}</p>}
            </div>
            <div>
              <label className={labelClass}>
                Valor por minuto <span className={hintClass}>(R$)</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register("pricePerMinute")}
                className={inputClass}
              />
              {errors.pricePerMinute && (
                <p className={errorClass}>{errors.pricePerMinute.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>
                Tarifa mínima <span className={hintClass}>(R$)</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register("minimumFare")}
                className={inputClass}
              />
              {errors.minimumFare && <p className={errorClass}>{errors.minimumFare.message}</p>}
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 mb-3">Simulador</p>
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Distância (km)</label>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={simKm}
                  onChange={(e) => setSimKm(Number(e.target.value) || 0)}
                  className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Tempo (min)</label>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={simMin}
                  onChange={(e) => setSimMin(Number(e.target.value) || 0)}
                  className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-500">
                  {simPrice > subtotal ? "Tarifa mínima aplicada" : "Preço ao passageiro"}
                </p>
                <p className="text-xl font-bold text-slate-800">{brl(simPrice)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Alerta aos motoristas</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Raio <span className={hintClass}>(km — um motorista por vez, do mais perto)</span>
              </label>
              <input type="number" step="0.5" {...register("radiusKm")} className={inputClass} />
              {errors.radiusKm && <p className={errorClass}>{errors.radiusKm.message}</p>}
            </div>
            <div>
              <label className={labelClass}>
                Tempo por motorista <span className={hintClass}>(s)</span>
              </label>
              <input
                type="number"
                step="1"
                {...register("offerTimeoutSeconds")}
                className={inputClass}
              />
              {errors.offerTimeoutSeconds && (
                <p className={errorClass}>{errors.offerTimeoutSeconds.message}</p>
              )}
            </div>
            <div className="col-span-2">
              <label className={labelClass}>
                Tempo total de busca{" "}
                <span className={hintClass}>
                  (s — passado isso o pedido expira e o valor é estornado em até 7 dias úteis)
                </span>
              </label>
              <input
                type="number"
                step="1"
                {...register("searchTimeoutSeconds")}
                className={inputClass}
              />
              {errors.searchTimeoutSeconds && (
                <p className={errorClass}>{errors.searchTimeoutSeconds.message}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Sem motorista no raio, o alerta vai para todos os motoristas livres da cidade do
            passageiro ao mesmo tempo.
          </p>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Motoristas</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Carona agendada próxima{" "}
                <span className={hintClass}>(min — saindo antes disso, o motorista não é livre)</span>
              </label>
              <input
                type="number"
                step="1"
                {...register("scheduledBufferMinutes")}
                className={inputClass}
              />
              {errors.scheduledBufferMinutes && (
                <p className={errorClass}>{errors.scheduledBufferMinutes.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>
                Validade da posição{" "}
                <span className={hintClass}>(s — sem posição nova, deixa de estar logado)</span>
              </label>
              <input
                type="number"
                step="1"
                {...register("presenceTtlSeconds")}
                className={inputClass}
              />
              {errors.presenceTtlSeconds && (
                <p className={errorClass}>{errors.presenceTtlSeconds.message}</p>
              )}
            </div>
          </div>
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

export default function SobDemandaPage() {
  return (
    <AccessGuard permission="MANAGE_SETTINGS">
      <SobDemandaContent />
    </AccessGuard>
  );
}
