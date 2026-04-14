"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  FileText, 
  History, 
  Sparkles, 
  PlusCircle,
  ChevronRight,
  ShieldCheck,
  Zap
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    templates: 0,
    contracts: 0
  });
  const supabase = createClient();

  useEffect(() => {
    const fetchStats = async () => {
      const { count: tCount } = await supabase.from("templates").select("*", { count: 'exact', head: true });
      const { count: cCount } = await supabase.from("contracts").select("*", { count: 'exact', head: true });
      setStats({
        templates: tCount || 0,
        contracts: cCount || 0
      });
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white">Bem-vindo, Engenheiro.</h1>
          <p className="text-slate-400 mt-2">O seu gerador de contratos inteligente está pronto.</p>
        </div>
        <Link href="/generator" className="btn-primary flex items-center justify-center gap-2 px-6 py-4 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all">
          <PlusCircle className="w-5 h-5" />
          Gerar Novo Contrato
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <FileText className="w-24 h-24 text-primary" />
          </div>
          <div className="relative z-10">
            <p className="text-slate-500 font-medium">Modelos Ativos</p>
            <h2 className="text-5xl font-bold mt-2 text-white">{stats.templates}</h2>
            <Link href="/templates" className="inline-flex items-center gap-2 text-primary hover:text-accent mt-6 transition-colors font-medium">
              Gerenciar Modelos <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <History className="w-24 h-24 text-secondary" />
          </div>
          <div className="relative z-10">
            <p className="text-slate-500 font-medium">Contratos Gerados</p>
            <h2 className="text-5xl font-bold mt-2 text-white">{stats.contracts}</h2>
            <Link href="/history" className="inline-flex items-center gap-2 text-secondary hover:text-teal-400 mt-6 transition-colors font-medium">
              Ver Histórico <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Como funciona?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="card border-slate-800/50 bg-slate-900/30">
              <span className="text-primary font-mono">Passo 1</span>
              <h4 className="font-bold mt-2 text-white">Suba seu Word</h4>
              <p className="text-slate-500 mt-2">Carregue um arquivo .docx com termos entre chaves ex: {"{valor}"}.</p>
            </div>
            <div className="card border-slate-800/50 bg-slate-900/30">
              <span className="text-primary font-mono">Passo 2</span>
              <h4 className="font-bold mt-2 text-white">Diga quem contratar</h4>
              <p className="text-slate-500 mt-2">Escreva em linguagem natural o que deseja extrair para o contrato.</p>
            </div>
            <div className="card border-slate-800/50 bg-slate-900/30">
              <span className="text-primary font-mono">Passo 3</span>
              <h4 className="font-bold mt-2 text-white">IA Extrai os Dados</h4>
              <p className="text-slate-500 mt-2">O Gemini lê seu texto e mapeia para as chaves do seu contrato.</p>
            </div>
            <div className="card border-slate-800/50 bg-slate-900/30">
              <span className="text-primary font-mono">Passo 4</span>
              <h4 className="font-bold mt-2 text-white">Baixe seu Contrato</h4>
              <p className="text-slate-500 mt-2">O sistema funde os dados extraídos com seus dados fixos.</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-b from-slate-900 to-slate-950 border-primary/20">
          <ShieldCheck className="w-12 h-12 text-primary mb-4" />
          <h3 className="text-lg font-bold text-white">Segurança e Dados</h3>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Seus dados são armazenados de forma privada no Supabase. A IA Gemini é usada para extração pontual.
          </p>
          <div className="mt-8 pt-8 border-t border-slate-800">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-4 italic">Tech Stack 2026</p>
            <div className="flex flex-wrap gap-2 text-[10px]">
              <span className="px-2 py-1 bg-slate-800 rounded text-slate-400">Next.js 16</span>
              <span className="px-2 py-1 bg-slate-800 rounded text-slate-400">Tailwind 4</span>
              <span className="px-2 py-1 bg-slate-800 rounded text-slate-400">Supabase SSR</span>
              <span className="px-2 py-1 bg-slate-800 rounded text-slate-400">React 19</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
