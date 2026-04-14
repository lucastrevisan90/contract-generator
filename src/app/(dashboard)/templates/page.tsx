"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Plus, 
  FileText, 
  Trash2, 
  Upload, 
  Loader2
} from "lucide-react";
import { toast } from "react-hot-toast";
import PizZip from "pizzip";

interface Template {
  id: string;
  name: string;
  category_id: string;
  file_path: string;
  placeholders: string[];
  created_at: string;
  categories: { name: string };
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("templates")
      .select("*, categories(name)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar templates");
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  const detectPlaceholders = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as ArrayBuffer;
          const zip = new PizZip(content);
          const xml = zip.files["word/document.xml"].asText();
          const matches = xml.match(/\{[^{}]+\}/g) || [];
          const uniquePlaceholders = Array.from(new Set(matches.map(m => m.replace(/[{}]/g, ""))));
          resolve(uniquePlaceholders);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const placeholders = await detectPlaceholders(file);
      const fileName = `${Date.now()}_${file.name}`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from("templates")
        .upload(fileName, file);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase.from("templates").insert({
        name: file.name.replace(".docx", ""),
        file_path: storageData.path,
        placeholders,
        category_id: null 
      });

      if (dbError) throw dbError;

      toast.success("Template enviado e variáveis detectadas!");
      setShowUploadModal(false);
      fetchTemplates();
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Modelos de Contrato</h1>
          <p className="text-slate-400">Gerencie seus arquivos base para geração</p>
        </div>
        <button 
          onClick={() => setShowUploadModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Template
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : templates.length === 0 ? (
        <div className="card text-center py-20">
          <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-medium">Nenhum template encontrado</h3>
          <p className="text-slate-500 mt-2">Comece fazendo o upload do seu primeiro arquivo .docx</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="card group hover:border-primary/50 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="text-primary w-6 h-6" />
                </div>
                <button className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <h3 className="font-bold text-lg">{template.name}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {template.categories?.name || "Sem categoria"}
              </p>
              
              <div className="mt-4 flex flex-wrap gap-2">
                {template.placeholders.map((p) => (
                  <span key={p} className="text-[10px] px-2 py-1 bg-slate-800 rounded-full text-slate-300 border border-slate-700">
                    {p}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
                <span>Detectadas: {template.placeholders.length}</span>
                <span>{new Date(template.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-4">Upload de Novo Modelo</h2>
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-700 rounded-xl hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
              {uploading ? (
                <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-2" />
                  <p>Processando e detectando variáveis...</p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                  <p className="font-medium">Clique para selecionar ou arraste</p>
                  <p className="text-sm text-slate-500">Apenas arquivos Word (.docx)</p>
                </div>
              )}
              <input 
                type="file" 
                className="hidden" 
                accept=".docx"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowUploadModal(false)}
                className="flex-1 btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
