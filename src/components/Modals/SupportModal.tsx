import React, { useState } from 'react';
import { Mail, X, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        message: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.name || !form.email || !form.message) {
            setErrorMessage('Por favor, preencha os campos obrigatórios.');
            setStatus('error');
            return;
        }

        setStatus('loading');

        try {
            const response = await fetch('https://formsubmit.co/ajax/lucastrevisan90@gmail.com', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    _subject: `OitoH Suporte: Nova mensagem de ${form.name}`,
                    Nome: form.name,
                    Email: form.email,
                    Telefone: form.phone || 'Não informado',
                    Mensagem: form.message
                })
            });

            if (response.ok) {
                setStatus('success');
                setForm({ name: '', email: '', phone: '', message: '' });
                // Reset to idle and close after 3 seconds
                setTimeout(() => {
                    setStatus('idle');
                    onClose();
                }, 3000);
            } else {
                throw new Error('Falha na comunicação com o servidor de envio.');
            }
        } catch (error: any) {
            console.error('Error submitting form:', error);
            setErrorMessage('Houve um problema ao enviar a mensagem. Tente novamente mais tarde.');
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => status !== 'loading' && onClose()} />
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                            <Mail className="text-indigo-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight">Suporte Técnico</h2>
                            <p className="text-slate-400 text-xs mt-0.5">Dúvidas, sugestões ou problemas?</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={status === 'loading'}
                        title="Fechar suporte"
                        aria-label="Fechar suporte"
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {status === 'success' ? (
                        <div className="text-center py-8 animate-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Mensagem Enviada!</h3>
                            <p className="text-slate-400 text-sm">Nossa equipe recebeu sua mensagem e entrará em contato em breve pelo e-mail informado.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">

                            {status === 'error' && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
                                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                    <p>{errorMessage}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nome Completo *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-slate-500"
                                    placeholder="João Silva"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">E-mail *</label>
                                    <input
                                        type="email"
                                        required
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-slate-500"
                                        placeholder="joao@exemplo.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Telefone (Opcional)</label>
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-slate-500"
                                        placeholder="(11) 99999-9999"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Sua Mensagem *</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={form.message}
                                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-slate-500 resize-none"
                                    placeholder="Descreva seu problema, dúvida ou sugestão com o máximo de detalhes..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full mt-2 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:pointer-events-none"
                            >
                                {status === 'loading' ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Enviando Mensagem...
                                    </>
                                ) : (
                                    <>
                                        Enviar Mensagem
                                        <Send size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
