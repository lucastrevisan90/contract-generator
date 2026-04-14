"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  FileText, 
  LayoutDashboard, 
  History, 
  PlusCircle, 
  LogOut,
  Settings,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Gerar Contrato", href: "/generator", icon: PlusCircle },
  { name: "Histórico", href: "/history", icon: History },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex flex-col h-screen w-64 bg-slate-900 border-r border-slate-800 fixed left-0 top-0 z-40">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
          <Shield className="text-primary w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          GeraContratos
        </h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "sidebar-item",
                isActive && "sidebar-item-active"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-1">
        <Link
          href="/settings"
          className="sidebar-item"
        >
          <Settings className="w-5 h-5" />
          <span>Configurações</span>
        </Link>
        <button
          className="sidebar-item w-full text-left text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}
