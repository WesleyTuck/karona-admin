"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, type DriverPayout, type PayoutStatus, type PayoutsResponse } from "@/lib/api";
import {
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PayoutStatus, { label: string; classes: string; icon: React.ElementType }> = {
  PENDING: { label: "Pendente", classes: "bg-amber-100 text-amber-800", icon: Clock },
  PAID: { label: "Pago", classes: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  FAILED: { label: "Falhou", classes: "bg-red-100 text-red-800", icon: XCircle },
};

function StatusBadge({ status }: { status: PayoutStatus }) {
  const { label, classes, icon: Icon } = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(items: DriverPayout[]) {
  const headers = [
    "ID",
    "Motorista",
    "Passageiro",
    "Origem",
    "Destino",
    "Data Pagamento",
    "Chave Pix",
    "Tipo Pix",
    "Valor Bruto",
    "Taxa %",
    "Taxa R$",
    "Valor Líquido",
    "Status",
  ];

  const rows = items.map((p) => [
    p.id,
    p.driverNameSnapshot ?? "",
    p.passengerNameSnapshot ?? p.trip?.passenger?.name ?? "",
    p.originSnapshot ?? p.trip?.origin ?? "",
    p.destinationSnapshot ?? p.trip?.destination ?? "",
    fmtDate(p.paymentConfirmedAt),
    p.pixKeySnapshot ?? "",
    p.pixKeyTypeSnapshot ?? "",
    p.grossAmount.toFixed(2),
    p.feePercent.toFixed(2),
    p.feeAmount.toFixed(2),
    p.netAmount.toFixed(2),
    p.status,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `repasses-pendentes-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Payout table row ─────────────────────────────────────────────────────────

function PayoutRow({ payout, showActions }: { payout: DriverPayout; showActions: boolean }) {
  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-slate-800">
          {payout.driverNameSnapshot ?? "—"}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {payout.pixKeyTypeSnapshot}: {payout.pixKeySnapshot ?? "—"}
        </p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-slate-700">
          {payout.passengerNameSnapshot ?? payout.trip?.passenger?.name ?? "—"}
        </p>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-slate-600 leading-snug">
          {payout.originSnapshot ?? payout.trip?.origin ?? "—"}
        </p>
        <p className="text-xs text-slate-400">↓ {payout.destinationSnapshot ?? payout.trip?.destination ?? "—"}</p>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {fmtDate(payout.paymentConfirmedAt)}
      </td>
      <td className="px-4 py-3 text-right">
        <p className="text-sm font-semibold text-slate-800">{fmt(payout.netAmount)}</p>
        <p className="text-xs text-slate-400">{fmt(payout.grossAmount)} − {payout.feePercent}%</p>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={payout.status} />
        {payout.status === "PAID" && payout.paidBy && (
          <p className="text-xs text-slate-400 mt-1">por {payout.paidBy.name}</p>
        )}
      </td>
      {showActions && (
        <td className="px-4 py-3 text-right">
          <Link
            href={`/billing/${payout.id}/confirm`}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            Registrar pagamento
            <ArrowRight size={12} />
          </Link>
        </td>
      )}
    </tr>
  );
}

// ─── Tab ──────────────────────────────────────────────────────────────────────

type Tab = "pending" | "history";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [data, setData] = useState<PayoutsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | "">("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (tab === "pending") {
      params.set("status", "PENDING");
    } else if (statusFilter) {
      params.set("status", statusFilter);
    }

    api
      .get<PayoutsResponse>(`/admin/payouts?${params}`)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, [tab, page, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [tab, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const items = data?.items ?? [];
  const pendingTotal = items.reduce((s, p) => (p.status !== "PAID" ? s + p.netAmount : s), 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Faturamento</h1>
          <p className="text-slate-500 text-sm mt-1">Gestão de repasses aos motoristas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {(["pending", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t
                ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "pending" ? "Pendentes" : "Histórico"}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {tab === "history" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PayoutStatus | "")}
              className="border border-slate-300 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os status</option>
              <option value="PENDING">Pendente</option>
              <option value="PAID">Pago</option>
              <option value="FAILED">Falhou</option>
            </select>
          )}
          {tab === "pending" && data && (
            <p className="text-sm text-slate-600">
              <strong>{data.total}</strong> pendente{data.total !== 1 ? "s" : ""} ·{" "}
              <strong className="text-amber-600">{fmt(pendingTotal)}</strong> a repassar
            </p>
          )}
        </div>

        {tab === "pending" && items.length > 0 && (
          <button
            onClick={() => exportCSV(items)}
            className="flex items-center gap-2 text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors"
          >
            <Download size={14} />
            Exportar CSV
          </button>
        )}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-2 m-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <CheckCircle2 size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm">
              {tab === "pending" ? "Nenhum repasse pendente. Tudo em dia!" : "Nenhum registro encontrado."}
            </p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Motorista</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Passageiro</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rota</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data Pag.</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Valor</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  {tab === "pending" && (
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Ação</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <PayoutRow key={p.id} payout={p} showActions={tab === "pending"} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <p>
            Página {page} de {data.pages} · {data.total} registros
          </p>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
