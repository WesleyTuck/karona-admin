"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type DriverVerification } from "@/lib/api";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  User,
  Car,
  Star,
  Maximize2,
  ExternalLink,
  X,
} from "lucide-react";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-800">{value ?? "—"}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "VERIFIED")
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700"><ShieldCheck size={14} />Verificado</span>;
  if (status === "UNDER_REVIEW")
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-700"><Clock size={14} />Em análise</span>;
  return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700"><ShieldAlert size={14} />Pendente</span>;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function isPdf(url: string) {
  return url.split("?")[0].toLowerCase().endsWith(".pdf");
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-w-5xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="absolute -top-10 right-0 flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={14} /> Abrir em nova aba
          </a>
          <button
            onClick={onClose}
            className="ml-2 text-white/70 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X size={22} />
          </button>
        </div>
        <img
          src={url}
          alt="Visualização completa"
          className="w-full max-h-[90vh] object-contain rounded-lg"
        />
      </div>
    </div>
  );
}

function DocCard({ title, url }: { title: string; url: string | null | undefined }) {
  const [expanded, setExpanded] = useState(false);

  if (!url) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-sm font-semibold text-slate-600 mb-3">{title}</p>
        <div className="flex items-center justify-center h-40 bg-slate-50 rounded-lg text-slate-400 text-sm">
          Nenhuma foto enviada
        </div>
      </div>
    );
  }

  const pdf = isPdf(url);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
              title="Abrir em nova aba"
            >
              <ExternalLink size={14} />
            </a>
            {!pdf && (
              <button
                onClick={() => setExpanded(true)}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                title="Expandir"
              >
                <Maximize2 size={14} />
              </button>
            )}
          </div>
        </div>

        {pdf ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center h-40 bg-slate-50 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-slate-100 transition-colors gap-2 text-sm font-medium border border-dashed border-slate-300"
          >
            <ExternalLink size={16} /> Abrir PDF em nova aba
          </a>
        ) : (
          <button
            onClick={() => setExpanded(true)}
            className="w-full focus:outline-none group"
          >
            <img
              src={url}
              alt={title}
              className="w-full rounded-lg object-cover max-h-64 group-hover:opacity-90 transition-opacity cursor-zoom-in"
            />
          </button>
        )}
      </div>

      {expanded && <Lightbox url={url} onClose={() => setExpanded(false)} />}
    </>
  );
}

export default function VerificacaoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [driver, setDriver] = useState<DriverVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<DriverVerification>(`/admin/verifications/${id}`);
      setDriver(data);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async () => {
    if (!driver || approving) return;
    setApproving(true);
    try {
      await api.patch(`/admin/verifications/${id}/approve`, {});
      router.push("/verificacoes");
    } catch (e: any) {
      setError(e.message ?? "Erro ao aprovar");
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-3 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle size={18} />
          <span className="text-sm">{error ?? "Motorista não encontrado"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/verificacoes" className="text-slate-400 hover:text-slate-600">
          <ChevronLeft size={22} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{driver.user.name}</h1>
          <p className="text-slate-400 text-sm">{driver.user.email}</p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={driver.verificationStatus} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Driver info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4 text-slate-600 font-semibold">
            <User size={16} /> Dados pessoais
          </div>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Nome" value={driver.user.name} />
            <Field label="CPF" value={driver.cpf} />
            <Field label="E-mail" value={driver.user.email} />
            <Field label="Telefone" value={driver.user.phone} />
            <Field label="Cadastrado em" value={fmtDate(driver.user.createdAt)} />
            <Field label="Avaliação" value={
              <span className="flex items-center gap-1">
                <Star size={13} className="text-yellow-500 fill-yellow-500" />
                {driver.user.rating.toFixed(1)}
              </span>
            } />
          </dl>
        </div>

        {/* Vehicle info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4 text-slate-600 font-semibold">
            <Car size={16} /> Veículo
          </div>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Modelo" value={driver.vehicleModel} />
            <Field label="Placa" value={<span className="font-mono">{driver.vehiclePlate}</span>} />
            <Field label="Cor" value={driver.vehicleColor} />
            <Field label="Vagas" value={driver.seats} />
            <Field label="Total de viagens" value={driver.user.totalTrips} />
          </dl>
        </div>
      </div>

      {/* Photos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <DocCard title="Foto da CNH" url={driver.cnhSignedUrl} />
        <DocCard title="Selfie" url={driver.selfieSignedUrl} />
      </div>

      {/* Approve button */}
      {driver.verificationStatus === "UNDER_REVIEW" && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleApprove}
            disabled={approving}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            {approving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            Aprovar cadastro
          </button>
        </div>
      )}
    </div>
  );
}
