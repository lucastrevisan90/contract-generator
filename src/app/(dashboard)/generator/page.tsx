"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { generateContractAction } from "@/app/actions/generate";
import { 
  Sparkles, 
  FileCheck, 
  Download, 
  Loader2,
  ChevronRight,
  Send
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Template {
  id: string;
  name: string;
}

export default function GeneratorPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ url: string } | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data } = await supabase.from("templates").select("id, name");
      setTemplates(data || []);
    };
    fetchTemplates();
  }, []);

  const handleGenerate = async () => {
    if (!selectedTemplate) return toast.error("Selecione um modelo");
    if (!prompt) return toast.error("Descreva os detalhes do contrato");

    setLoading(true);
    setResult(null);

    const res = await generateContractAction(selectedTemplate, prompt);

    if (res.success && res.downloadUrl) {
      setResult({ url: res.downloadUrl });
      toast.success("Contrato gerado com sucesso!");
    } else {
      toast.error(res.error || "Falha ao gerar contrato");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Gerador de Contratos</h1>
        <p className="text-slate-400">Use IA para preencher seus modelos baseados em sua solicitação</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card space-y-4">
            <label className="block text-sm font-medium text-slate-300">
              1. Selecione o Modelo Base
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            >
              <option value="">Selecione um arquivo...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="card space-y-4">
            <label className="block text-sm font-medium text-slate-300">
              2. Detalhes do Contrato (Linguagem Natural)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Contrata o Lucas Silva para desenvolvimento de software, valor total de 10 mil reais pago em 2 parcelas. O anexo 1 deve conter a lista de funcionalidades do app mobile."
              className="w-full h-48 bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
            />
            
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full btn-primary py-4 flex items-center justify-center gap-3 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  IA Analisando Detalhes...
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  Gerar Contrato .docx
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card h-full flex flex-col items-center justify-center text-center p-8 border-dashed border-2">
            {!result && !loading ? (
              <>
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <FileCheck className="text-slate-600 w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium text-slate-400">Aguardando geração</h3>
                <p className="text-slate-500 text-sm mt-2">
                  Preencha os dados ao lado para ver o resultado aqui.
                </p>
              </>
            ) : loading ? (
              <>
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  <Sparkles className="absolute inset-0 m-auto text-primary w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium text-white mt-6">Processando...</h3>
                <p className="text-slate-500 text-sm mt-2">
                  Extraindo variáveis e gerando documento Word.
                </p>
              </>
            ) : (
              <div className="animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                  <FileCheck className="text-green-500 w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Sucesso!</h3>
                <p className="text-slate-400 text-sm mb-8">
                  O contrato foi gerado e preenchido corretamente.
                </p>
                <a
                  href={result?.url}
                  download
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                >
                  <Download className="w-5 h-5" />
                  Baixar Arquivo
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
