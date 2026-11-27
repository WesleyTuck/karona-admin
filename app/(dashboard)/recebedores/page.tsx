"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  type AdminRecipientRow,
  type AdminRecipientsOverview,
  type AdminWithdrawalsOverview,
  type RecipientStatusKey,
} from "@/lib/api";
import {
  AlertCircle,
  BadgeCheck,
  Banknote,
  Clock,
  Hourglass,
  Loader2,
  RefreshCw,
  Search,
  Wallet,
  WalletCards,
  XCircle,
} from "lucide-react";
import AccessGuard from "@/components/access-guard";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** "2026-10-01 14:32:10" → "01/10/2026 14:32" (sem conversão de fuso). */
function fmtDateTime(s: string | null) {
  if (!s) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : s;
}

const STATUS_STYLE: Record<RecipientStatusKey, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700",
  ON_VERIFICATION: "bg-amber-100 text-amber-700",
  AWAITING_FACEMATCH: "bg-blue-100 text-blue-700",
  UNKNOWN: "bg-slate-100 text-slate-600",
};

const STATUS_FILTERS: { value: "ALL" | RecipientStatusKey; label: string }[] = [
  { value: "ALL", label: "Todos os status" },
  { value: "COMPLETED", label: "Aprovados" },
  { value: "ON_VERIFICATION", label: "Em análise" },
  { value: "AWAITING_FACEMATCH", label: "Aguardando verificação" },
  { value: "UNKNOWN", label: "Outros" },
];

type SortKey = "recent" | "available" | "toRelease" | "pending";

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "slate",
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
  tone?: "slate" | "emerald" | "amber" | "red" | "blue";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
    red: "bg-red-100 text-red-600",
    blue: "bg-blue-100 text-blue-600",
  } as const;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${tones[tone]}`}>
          <Icon size={18} />
        </div>
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-800">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

const WITHDRAW_STATUS: Record<string, string> = {
  pending: "Em processamento",
  paid: "Pago",
  refused: "Recusado",
  canceled: "Cancelado",
  cancelled: "Cancelado",
  failed: "Falhou",
};

/**
 * Saques feitos pelos motoristas. No saque ESPECIAL a taxa da AppMax é do Karona:
 * o que ela descontou do motorista aparece como "a ressarcir" até ser marcado.
 */
function WithdrawalsSection() {
  const [data, setData] = useState<AdminWithdrawalsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.get<AdminWithdrawalsOverview>("/admin/recipients/withdrawals"));
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar os saques");
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api
      .get<AdminWithdrawalsOverview>("/admin/recipients/withdrawals")
      .then((res) => alive && setData(res))
      .catch(
        (e: unknown) =>
          alive && setError(e instanceof Error ? e.message : "Erro ao carregar os saques"),
      );
    return () => {
      alive = false;
    };
  }, []);

  async function reimburse(id: string) {
    setBusyId(id);
    try {
      await api.post(`/admin/recipients/withdrawals/${id}/reimburse`, {});
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao marcar como ressarcido");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Saques dos motoristas</h2>
      <p className="text-sm text-slate-500 mb-4">
        Saque comum: o motorista paga a taxa da AppMax. Saque especial: a taxa é do Karona — o que
        a AppMax descontar do motorista fica “a ressarcir” até você marcar como devolvido.
      </p>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <SummaryCard
              icon={Banknote}
              tone="amber"
              label="Taxas a ressarcir"
              value={brl(data.totals.feeToReimburseAmount)}
              hint={`${data.totals.feeToReimburseCount} saque(s) especial(is) com taxa descontada`}
            />
            <SummaryCard
              icon={BadgeCheck}
              tone="emerald"
              label="Taxas já ressarcidas"
              value={brl(data.totals.reimbursedAmount)}
            />
            <SummaryCard
              icon={Wallet}
              label="Saques registrados"
              value={String(data.totals.count)}
              hint={`${data.totals.specialCount} especial(is)`}
            />
          </div>

          {data.withdrawals.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum saque feito pelo aplicativo ainda.</p>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Motorista</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3 text-right">Líquido</th>
                    <th className="px-4 py-3 text-right">Taxa AppMax</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">A ressarcir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.withdrawals.map((w) => (
                    <tr key={w.id}>
                      <td className="px-4 py-3 whitespace-nowrap">{fmtDateTime(w.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{w.driver.name}</div>
                        <div className="text-xs text-slate-400">{w.driver.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            w.type === "SPECIAL"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {w.type === "SPECIAL" ? "Especial" : "Comum"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{brl(w.amount)}</td>
                      <td className="px-4 py-3 text-right">{w.net == null ? "—" : brl(w.net)}</td>
                      <td className="px-4 py-3 text-right">{brl(w.fee)}</td>
                      <td className="px-4 py-3">
                        {WITHDRAW_STATUS[w.status ?? ""] ?? w.status ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {w.feeToReimburse > 0 ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-medium text-amber-700">
                              {brl(w.feeToReimburse)}
                            </span>
                            <button
                              onClick={() => reimburse(w.id)}
                              disabled={busyId === w.id}
                              className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {busyId === w.id ? "Salvando..." : "Marcar ressarcido"}
                            </button>
                          </div>
                        ) : w.reimbursedAt ? (
                          <span className="text-xs text-emerald-600">Ressarcido</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function RecipientsContent() {
  const [data, setData] = useState<AdminRecipientsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | RecipientStatusKey>("ALL");
  const [sort, setSort] = useState<SortKey>("recent");

  const load = useCallback(async (refresh = false) => {
    // Na 1ª carga o estado já nasce "carregando" (sem erro): nada a gravar aqui.
    if (refresh) {
      setRefreshing(true);
      setError(null);
    }
    try {
      const res = await api.get<AdminRecipientsOverview>(
        `/admin/recipients${refresh ? "?refresh=1" : ""}`,
      );
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar os recebedores");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = (data?.recipients ?? []).filter((r) => {
      if (status !== "ALL" && r.status !== status) return false;
      if (!term) return true;
      return [r.name, r.email, r.driver?.name, r.driver?.email, r.document, r.recipientHash]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
    const value = (r: AdminRecipientRow) => {
      if (sort === "available") return r.balance?.available ?? -1;
      if (sort === "toRelease") return r.balance?.toRelease ?? -1;
      if (sort === "pending") return r.payouts.pendingAmount + r.payouts.failedAmount;
      return 0;
    };
    // "recent" mantém a ordem da AppMax (mais recentes primeiro).
    return sort === "recent" ? filtered : [...filtered].sort((a, b) => value(b) - value(a));
  }, [data, search, status, sort]);

  const t = data?.totals;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Recebedores</h1>
          <p className="text-slate-500 text-sm mt-1">
            Motoristas cadastrados na AppMax para receber o split dos pagamentos
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-xs text-slate-400">
              {data.cached ? "Em cache · " : ""}atualizado às{" "}
              {new Date(data.generatedAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 mb-5">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {!loading && t && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <SummaryCard
              icon={Wallet}
              tone="emerald"
              label="Disponível para saque"
              value={brl(t.available)}
              hint={`${t.withAvailable} recebedor${t.withAvailable === 1 ? "" : "es"} com saldo`}
            />
            <SummaryCard
              icon={Hourglass}
              tone="amber"
              label="Aguardando liberação"
              value={brl(t.toRelease)}
              hint={`${t.withToRelease} recebedor${t.withToRelease === 1 ? "" : "es"} com valor a liberar`}
            />
            <SummaryCard
              icon={WalletCards}
              tone="blue"
              label="Repasses pendentes (Karona)"
              value={brl(t.pendingPayoutsAmount)}
              hint={`${t.pendingPayoutsCount} corrida${t.pendingPayoutsCount === 1 ? "" : "s"} a repassar`}
            />
            <SummaryCard
              icon={XCircle}
              tone={t.failedPayoutsCount > 0 ? "red" : "slate"}
              label="Repasses com falha"
              value={brl(t.failedPayoutsAmount)}
              hint={
                t.failedPayoutsCount > 0
                  ? `${t.failedPayoutsCount} precisa${t.failedPayoutsCount === 1 ? "" : "m"} de conferência`
                  : "Nenhum no momento"
              }
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <SummaryCard
              icon={BadgeCheck}
              tone="emerald"
              label="Aprovados"
              value={String(t.byStatus.COMPLETED)}
              hint={`de ${t.recipients} recebedor${t.recipients === 1 ? "" : "es"}`}
            />
            <SummaryCard
              icon={Clock}
              tone="amber"
              label="Em análise"
              value={String(t.byStatus.ON_VERIFICATION)}
              hint="Verificação feita; a AppMax analisa (24–48 h úteis)"
            />
            <SummaryCard
              icon={Hourglass}
              tone="blue"
              label="Aguardando verificação"
              value={String(t.byStatus.AWAITING_FACEMATCH)}
              hint="O motorista ainda não concluiu a selfie/documento"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative w-full max-w-xs">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, e-mail ou documento..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "ALL" | RecipientStatusKey)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="recent">Mais recentes</option>
              <option value="available">Maior saldo disponível</option>
              <option value="toRelease">Maior valor a liberar</option>
              <option value="pending">Maior repasse pendente</option>
            </select>
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Wallet size={40} className="mb-3" />
              <p className="font-medium">Nenhum recebedor encontrado</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-slate-500 font-semibold">Recebedor</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-semibold">Status</th>
                    <th className="text-right px-5 py-3 text-slate-500 font-semibold">Disponível</th>
                    <th className="text-right px-5 py-3 text-slate-500 font-semibold">A liberar</th>
                    <th className="text-right px-5 py-3 text-slate-500 font-semibold">Repasses (Karona)</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-semibold">Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.recipientHash}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors align-top"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">
                          {r.name ?? r.driver?.name ?? "—"}
                        </div>
                        <div className="text-slate-400 text-xs">{r.email ?? "—"}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                          {r.document && <span>Doc. {r.document}</span>}
                          {r.driver && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              {r.driver.personType === "PJ" ? "PJ" : "PF"}
                            </span>
                          )}
                          {r.driver?.autoWithdraw && (
                            <span
                              className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium"
                              title="A AppMax saca o saldo todo dia sozinha"
                            >
                              Saque automático
                            </span>
                          )}
                          {!r.driver && r.inAppmax && (
                            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                              Sem cadastro no Karona
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[r.status]}`}
                        >
                          {r.statusLabel}
                        </span>
                        {!r.inAppmax && (
                          <div className="mt-1 text-xs text-slate-400">Não consta na AppMax</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {r.balanceError ? (
                          <span className="text-xs text-red-600" title={r.balanceError}>
                            Erro ao consultar
                          </span>
                        ) : r.balance ? (
                          <span
                            className={`font-semibold ${r.balance.available > 0 ? "text-emerald-700" : "text-slate-400"}`}
                          >
                            {brl(r.balance.available)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {r.balance ? (
                          <span
                            className={`font-semibold ${r.balance.toRelease > 0 ? "text-amber-700" : "text-slate-400"}`}
                          >
                            {brl(r.balance.toRelease)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {r.payouts.pendingCount === 0 &&
                        r.payouts.failedCount === 0 ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <div className="space-y-0.5">
                            {r.payouts.pendingCount > 0 && (
                              <div className="text-slate-700">
                                <span className="font-semibold">{brl(r.payouts.pendingAmount)}</span>{" "}
                                <span className="text-xs text-slate-400">
                                  pendente{r.payouts.pendingCount > 1 ? `s (${r.payouts.pendingCount})` : ""}
                                </span>
                              </div>
                            )}
                            {r.payouts.failedCount > 0 && (
                              <div className="text-red-600">
                                <span className="font-semibold">{brl(r.payouts.failedAmount)}</span>{" "}
                                <span className="text-xs">
                                  com falha{r.payouts.failedCount > 1 ? ` (${r.payouts.failedCount})` : ""}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                        {fmtDateTime(r.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-400 leading-relaxed">
            Os saldos vêm direto da AppMax (a lista de recebedores só existe pela API, não no
            painel dela). Só recebedores aprovados têm saldo. “Repasses (Karona)” é o que o
            Karona ainda deve ao motorista pelos pagamentos feitos na AppMax, e nada tem a ver
            com o saldo que já está na conta dele lá.
          </p>

          <WithdrawalsSection />
        </>
      )}
    </div>
  );
}

export default function RecebedoresPage() {
  return (
    <AccessGuard permission="MANAGE_SETTINGS">
      <RecipientsContent />
    </AccessGuard>
  );
}
