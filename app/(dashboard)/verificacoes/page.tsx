"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, type DriverVerification, type DriverVerificationStatus } from "@/lib/api";
import { ShieldCheck, ShieldAlert, Clock, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import AccessGuard from "@/components/access-guard";

function StatusBadge({ status }: { status: DriverVerificationStatus }) {
  if (status === "VERIFIED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <ShieldCheck size={12} /> Verificado
      </span>
    );
  }
  if (status === "UNDER_REVIEW") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
        <Clock size={12} /> Em análise
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
      <ShieldAlert size={12} /> Pendente
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

function VerificacoesContent() {
  const [items, setItems] = useState<DriverVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<DriverVerification[]>("/admin/verifications");
      setItems(data);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar verificações");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Verificações de motoristas</h1>
        <p className="text-slate-500 text-sm mt-1">Motoristas aguardando validação de identidade</p>
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
          <ShieldCheck size={40} className="mb-3" />
          <p className="font-medium">Nenhuma verificação pendente</p>
          <p className="text-sm">Todos os motoristas estão validados.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-slate-500 font-semibold">Motorista</th>
                <th className="text-left px-5 py-3 text-slate-500 font-semibold">CNH</th>
                <th className="text-left px-5 py-3 text-slate-500 font-semibold">Veículo</th>
                <th className="text-left px-5 py-3 text-slate-500 font-semibold">Cadastrado em</th>
                <th className="text-left px-5 py-3 text-slate-500 font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-800">{item.user.name}</div>
                    <div className="text-slate-400 text-xs">{item.user.email}</div>
                  </td>
                  <td className="px-5 py-4 text-slate-600 font-mono text-xs">{item.cnh}</td>
                  <td className="px-5 py-4 text-slate-600">
                    {item.vehicleModel} · {item.vehiclePlate}
                  </td>
                  <td className="px-5 py-4 text-slate-500">{fmtDate(item.user.createdAt)}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={item.verificationStatus} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/verificacoes/${item.id}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-xs"
                    >
                      Ver detalhes <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function VerificacoesPage() {
  return (
    <AccessGuard permission="MANAGE_VERIFICATIONS">
      <VerificacoesContent />
    </AccessGuard>
  );
}
