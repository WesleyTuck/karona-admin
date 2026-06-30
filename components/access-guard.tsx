"use client";

import { useEffect, useState } from "react";
import { hasPermission } from "@/lib/api";
import { Loader2, ShieldOff } from "lucide-react";

interface Props {
  permission: string;
  children: React.ReactNode;
}

export default function AccessGuard({ permission, children }: Props) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    setAllowed(hasPermission(permission));
  }, [permission]);

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

  return <>{children}</>;
}
