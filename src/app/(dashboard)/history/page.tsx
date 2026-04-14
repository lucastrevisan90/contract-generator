"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  History as HistoryIcon, 
  Download, 
  Search, 
  Calendar, 
  User, 
  FileText,
  Loader2
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Contract {
  id: string;
  contractor_name: string;
  contract_value: string;
  created_at: string;
  file_path: string;
  templates: { name: string };
}

export default function HistoryPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contracts")
      .select("*, templates(name)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar histórico");
    } else {
      setContracts(data || []);
    }
    setLoading(false);
  };

  const getDownloadUrl = (path: string) => {
    return supabase.storage.from("contracts").getPublicUrl(path).data.publicUrl;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Histórico de Contratos</h1>
        <p className="text-slate-400">Consulte e baixe todos os documentos já gerados pelo sistema</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : contracts.length === 0 ? (
        <div className="card text-center py-20">
          <HistoryIcon className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white">Histórico vazio</h3>
        </div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <table className="w-full text-left">
            <thead className="bg-slate-800/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 text-sm font-medium text-slate-400">Modelo / Data</th>
                <th className="px-6 py-4 text-sm font-medium text-slate-400">Contratado</th>
                <th className="px-6 py-4 text-sm font-medium text-slate-400">Valor</th>
                <th className="px-6 py-4 text-sm font-medium text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {contracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="text-primary w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{contract.templates?.name}</p>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(contract.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-500" />
                      {contract.contractor_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-secondary text-sm">
                    {contract.contract_value}
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={getDownloadUrl(contract.file_path)}
                      download
                      className="text-primary hover:text-accent font-medium flex items-center gap-2 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Baixar .docx
                    </a>
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
