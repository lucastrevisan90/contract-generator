"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Shield, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Bem-vindo de volta!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="card w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 mb-4 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <Shield className="text-primary w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-white">GeraContratos AI</h1>
          <p className="text-sm font-bold tracking-[0.2em] text-slate-500 uppercase -mt-1 mb-2">
            TSCOPE
          </p>
          <p className="text-slate-400 mt-2">Acesse sua conta para gerenciar seus contratos</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        <div className="text-center pt-8 border-t border-slate-900">
          <p className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} TSCOPE. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
