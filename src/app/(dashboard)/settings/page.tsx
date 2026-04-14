"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Fingerprint, 
  Save, 
  Loader2,
  CheckCircle2
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    name: "",
    document: "",
    address: "",
    phone: "",
  });
  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("contractor_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setSettings({
        name: data.name || "",
        document: data.document || "",
        address: data.address || "",
        phone: data.phone || "",
      });
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("contractor_settings")
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Configurações do Contratante</h1>
        <p className="text-slate-400">Estes dados serão usados como fixos em todos os seus contratos</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card space-y-6">
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Building2 className="w-4 h-4 text-primary" />
              Nome Completo / Razão Social
            </label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Ex: Empresa de Tecnologia LTDA"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Fingerprint className="w-4 h-4 text-primary" />
                CPF ou CNPJ
              </label>
              <input
                type="text"
                value={settings.document}
                onChange={(e) => setSettings({ ...settings, document: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="00.000.000/0001-00"
                required
              />
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Phone className="w-4 h-4 text-primary" />
                Telefone de Contato
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="(00) 00000-0000"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <MapPin className="w-4 h-4 text-primary" />
              Endereço Completo
            </label>
            <textarea
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full h-24 bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-sans"
              placeholder="Rua, Número, Bairro, Cidade - Estado, CEP"
              required
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary px-8 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Salvar Alterações
          </button>
        </div>
      </form>

      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-4">
        <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
        <p className="text-sm text-slate-400">
          <span className="text-white font-medium">Nota:</span> Use os placeholders 
          <code className="text-primary px-1">{"{contratante_nome}"}</code>, 
          <code className="text-primary px-1">{"{contratante_doc}"}</code> em seus documentos.
        </p>
      </div>
    </div>
  );
}
