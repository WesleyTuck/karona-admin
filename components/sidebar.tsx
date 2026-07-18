"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearToken, getPermissions } from "@/lib/api";
import { LayoutDashboard, Receipt, LogOut, MapPin, ShieldCheck, Users, Settings } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: null },
  { href: "/billing", label: "Faturamento", icon: Receipt, permission: "MANAGE_PAYOUTS" },
  { href: "/verificacoes", label: "Verificações", icon: ShieldCheck, permission: "MANAGE_VERIFICATIONS" },
  { href: "/usuarios", label: "Usuários", icon: Users, permission: "MANAGE_USERS" },
  { href: "/configuracoes", label: "Configurações", icon: Settings, permission: "MANAGE_SETTINGS" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    setPermissions(getPermissions());
  }, []);

  function logout() {
    clearToken();
    router.push("/login");
  }

  const visibleNav = NAV.filter(
    ({ permission }) => permission === null || permissions.includes(permission),
  );

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-slate-800 text-slate-100">
      {/* Brand */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-700">
        <div className="bg-blue-500 text-white p-1.5 rounded-md">
          <MapPin size={16} />
        </div>
        <span className="font-semibold text-sm">Rota Fácil Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-700">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  );
}
