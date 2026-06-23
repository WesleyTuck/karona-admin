"use client";

import { useEffect, useState } from "react";
import { api, type PayoutsResponse } from "@/lib/api";
import { DollarSign, Clock, TrendingUp, CheckCircle, Loader2, AlertCircle } from "lucide-react";

interface Stats {
  totalRevenue: number;
  totalFees: number;
  pendingCount: number;
  pendingAmount: number;
  paidCount: number;
  paidAmount: number;
}

function fmt(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<PayoutsResponse>("/admin/payouts?limit=500")
      .then((res) => {
        const items = res.items;
        setStats({
          totalRevenue: items.reduce((s, p) => s + p.grossAmount, 0),
          totalFees: items.reduce((s, p) => s + p.feeAmount, 0),
          pendingCount: items.filter((p) => p.status === "PENDING").length,
          pendingAmount: items
            .filter((p) => p.status === "PENDING")
            .reduce((s, p) => s + p.netAmount, 0),
          paidCount: items.filter((p) => p.status === "PAID").length,
          paidAmount: items
            .filter((p) => p.status === "PAID")
            .reduce((s, p) => s + p.netAmount, 0),
        });
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Erro ao carregar dados")
      );
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Visão geral da plataforma</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {!stats && !error && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Receita Total"
              value={fmt(stats.totalRevenue)}
              sub="Pagamentos dos passageiros"
              icon={TrendingUp}
              color="bg-blue-500"
            />
            <StatCard
              label="Comissões Retidas"
              value={fmt(stats.totalFees)}
              sub="Taxa da plataforma"
              icon={DollarSign}
              color="bg-emerald-500"
            />
            <StatCard
              label="Repasses Pendentes"
              value={String(stats.pendingCount)}
              sub={`${fmt(stats.pendingAmount)} a transferir`}
              icon={Clock}
              color="bg-amber-500"
            />
            <StatCard
              label="Repasses Realizados"
              value={String(stats.paidCount)}
              sub={fmt(stats.paidAmount)}
              icon={CheckCircle}
              color="bg-violet-500"
            />
          </div>

          {stats.pendingCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <p className="text-amber-800 font-medium text-sm">
                Você tem{" "}
                <strong>{stats.pendingCount} repasse{stats.pendingCount !== 1 ? "s" : ""} pendente{stats.pendingCount !== 1 ? "s" : ""}</strong>{" "}
                totalizando <strong>{fmt(stats.pendingAmount)}</strong> a transferir para os motoristas.
              </p>
              <a
                href="/billing"
                className="inline-block mt-3 text-sm font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2"
              >
                Ir para Faturamento →
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
