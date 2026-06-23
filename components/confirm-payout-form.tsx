"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, type DriverPayout } from "@/lib/api";
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  User,
  MapPin,
  CreditCard,
  Calendar,
  Copy,
  Check,
} from "lucide-react";

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

function InfoRow({
  label,
  value,
  stacked = false,
}: {
  label: string;
  value: React.ReactNode;
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <div className="py-2.5 border-b border-slate-100 last:border-0 space-y-0.5">
        <p className="text-sm text-slate-500">{label}</p>
        <div className="text-sm font-medium text-slate-800">{value}</div>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-start gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 text-right">{value}</span>
    </div>
  );
}

function PixKeyValue({ pixKey, pixKeyType }: { pixKey: string | null; pixKeyType: string | null }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!pixKey) return;
    navigator.clipboard.writeText(pixKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <span className="flex items-center gap-1.5 flex-wrap">
      <CreditCard size={12} className="text-slate-400 shrink-0" />
      <span className="font-mono text-xs break-all">{pixKey ?? "—"}</span>
      {pixKeyType && (
        <span className="text-xs text-slate-400 shrink-0">({pixKeyType})</span>
      )}
      {pixKey && (
        <button
          type="button"
          onClick={handleCopy}
          title="Copiar chave Pix"
          className="shrink-0 text-slate-400 hover:text-blue-600 transition-colors"
        >
          {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
        </button>
      )}
    </span>
  );
}

export default function ConfirmPayoutForm({ payoutId }: { payoutId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [payout, setPayout] = useState<DriverPayout | null>(null);
  const [loadError, setLoadError] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [fileDragOver, setFileDragOver] = useState(false);
  const [paidAt, setPaidAt] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api
      .get<DriverPayout>(`/admin/payouts/${payoutId}`)
      .then(setPayout)
      .catch((e: unknown) =>
        setLoadError(e instanceof Error ? e.message : "Erro ao carregar repasse")
      );
  }, [payoutId]);

  function handleFileChange(f: File | null) {
    if (!f) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(f.type)) {
      setSubmitError("Formato inválido. Use PDF, JPEG, PNG ou WebP.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setSubmitError("Arquivo muito grande. Máximo 10 MB.");
      return;
    }
    setFile(f);
    setSubmitError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setSubmitError("Selecione o comprovante."); return; }

    setSubmitting(true);
    setSubmitError("");

    const form = new FormData();
    form.append("receipt", file);
    if (paidAt) form.append("paidAt", new Date(paidAt).toISOString());
    if (notes) form.append("notes", notes);

    try {
      await api.patchForm(`/admin/payouts/${payoutId}/confirm`, form);
      setSuccess(true);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Erro ao confirmar repasse");
    } finally {
      setSubmitting(false);
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

  if (!payout) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-96 gap-4">
        <div className="bg-emerald-100 text-emerald-600 p-4 rounded-full">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Repasse confirmado!</h2>
        <p className="text-slate-500 text-sm text-center max-w-sm">
          O pagamento para <strong>{payout.driverNameSnapshot ?? "o motorista"}</strong> foi registrado com sucesso.
        </p>
        <button
          onClick={() => router.push("/billing")}
          className="mt-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Voltar ao Faturamento
        </button>
      </div>
    );
  }

  const alreadyPaid = payout.status === "PAID";

  return (
    <div className="p-8 max-w-2xl">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      <h1 className="text-2xl font-bold text-slate-800 mb-1">Registrar Repasse</h1>
      <p className="text-slate-500 text-sm mb-8">
        Preencha os dados do pagamento realizado ao motorista.
      </p>

      {alreadyPaid && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-lg mb-6">
          <CheckCircle2 size={16} />
          Este repasse já foi marcado como pago em {fmtDate(payout.paidAt)}.
        </div>
      )}

      {/* Payout summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <FileText size={15} className="text-slate-400" />
          Dados do Repasse
        </h2>
        <InfoRow label="Motorista" value={
          <span className="flex items-center gap-1">
            <User size={12} className="text-slate-400" />
            {payout.driverNameSnapshot ?? "—"}
          </span>
        } />
        <InfoRow label="Passageiro" value={
          payout.passengerNameSnapshot ?? payout.trip?.passenger?.name ?? "—"
        } />
        <InfoRow label="Rota" stacked value={
          <span className="flex items-center gap-1.5 flex-wrap">
            <MapPin size={12} className="text-slate-400 shrink-0" />
            <span>{payout.originSnapshot ?? payout.trip?.origin ?? "—"} → {payout.destinationSnapshot ?? payout.trip?.destination ?? "—"}</span>
          </span>
        } />
        <InfoRow label="Data do Pagamento" value={
          <span className="flex items-center gap-1">
            <Calendar size={12} className="text-slate-400" />
            {fmtDate(payout.paymentConfirmedAt)}
          </span>
        } />
        <InfoRow label="Chave Pix" stacked value={
          <PixKeyValue pixKey={payout.pixKeySnapshot} pixKeyType={payout.pixKeyTypeSnapshot} />
        } />
        <InfoRow label="Valor Bruto" value={fmt(payout.grossAmount)} />
        <InfoRow label={`Taxa (${payout.feePercent}%)`} value={
          <span className="text-red-600">− {fmt(payout.feeAmount)}</span>
        } />
        <InfoRow label="Valor a Repassar" value={
          <span className="text-lg font-bold text-emerald-600">{fmt(payout.netAmount)}</span>
        } />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Upload size={15} className="text-slate-400" />
          Comprovante de Pagamento
        </h2>

        {/* File drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setFileDragOver(true); }}
          onDragLeave={() => setFileDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setFileDragOver(false); handleFileChange(e.dataTransfer.files[0] ?? null); }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            fileDragOver
              ? "border-blue-400 bg-blue-50"
              : file
              ? "border-emerald-400 bg-emerald-50"
              : "border-slate-300 hover:border-slate-400"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText size={20} className="text-emerald-600" />
              <div className="text-left">
                <p className="text-sm font-medium text-emerald-700">{file.name}</p>
                <p className="text-xs text-emerald-600">
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="ml-2 text-slate-400 hover:text-red-500"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <Upload size={24} className="mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-medium text-slate-600">
                Clique ou arraste o comprovante aqui
              </p>
              <p className="text-xs text-slate-400 mt-1">PDF, JPEG, PNG ou WebP · max 10 MB</p>
            </>
          )}
        </div>

        {/* Paid at */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Data/hora do Repasse <span className="text-slate-400 font-normal">(opcional — padrão: agora)</span>
          </label>
          <input
            type="datetime-local"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Observações <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Ex: Pix realizado às 14h, comprovante em anexo"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {submitError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">
            <AlertCircle size={15} />
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || alreadyPaid}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? "Confirmando..." : alreadyPaid ? "Já registrado" : `Confirmar Repasse de ${fmt(payout.netAmount)}`}
        </button>
      </form>
    </div>
  );
}
