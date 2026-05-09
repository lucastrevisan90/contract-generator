import React from 'react';
import { BookOpen, X, Clock, Brain, Activity, HelpCircle } from 'lucide-react';

interface DocumentationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <BookOpen className="text-blue-500" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Centro de Conhecimento</h2>
                            <p className="text-slate-400 text-sm">Entenda como extrair o máximo do OitoH</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        title="Fechar documentação"
                        aria-label="Fechar documentação"
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">

                    {/* Section 1: Metodologia */}
                    <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Clock className="text-indigo-400" size={20} />
                            A Metodologia Time Blocking
                        </h3>
                        <div className="space-y-3 text-slate-300 text-sm leading-relaxed p-5 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                            <p>O <strong>Time Blocking</strong> (Blocos de Tempo) não é sobre fazer uma lista infinita e exaustiva do que tem que ser feito. É sobre decidir antecipadamente <em>quando</em> as coisas serão feitas.</p>
                            <p>Ao agendar um bloco no OitoH, você se compromete com uma tarefa específica, por um tempo específico. Se houver atrasos e você ultrapassar a sua estimativa inicial com o cronômetro, nosso painel de Estatísticas mostrará o <strong>Impacto em Cascata</strong> que isso gerou nos outros blocos da sua agenda.</p>
                            <p><strong>Dica de Ouro:</strong> Sempre deixe pequenos espaços em branco no seu dia (Buffer Time) para absorver imprevistos sem quebrar o restante da sua programação.</p>
                        </div>
                    </section>

                    {/* Section 2: Carga Cognitiva */}
                    <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Brain className="text-blue-400" size={20} />
                            O que é a Carga Cognitiva?
                        </h3>
                        <div className="space-y-3 text-slate-300 text-sm leading-relaxed p-5 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                            <p>O cérebro humano tem um limite de decisões de qualidade que pode tomar por dia.</p>
                            <p>A barra de <strong>Carga Cognitiva</strong> no topo da Visão Diária soma o tempo total estimado e o tempo restante das suas tarefas pendentes. Nossa meta padrão sugere não ultrapassar <strong>8 horas</strong> de foco profundo diário.</p>
                            <p>Se ela ficar amarela ou vermelha, significa que você está agendando mais horas do que é saudável para manter a excelência no próximo dia.</p>
                        </div>
                    </section>

                    {/* Section 3: Vitalidade */}
                    <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Activity className="text-emerald-400" size={20} />
                            Vitalidade e Hábitos
                        </h3>
                        <div className="space-y-3 text-slate-300 text-sm leading-relaxed p-5 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                            <p>Sua produtividade não é sustentável se você estiver mentalmente esgotado. A pontuação de <strong>Vitalidade</strong> quantifica isso de forma gamificada.</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-slate-400">
                                <li>Concluir blocos de tempo <strong>+5 pontos</strong></li>
                                <li>Concluir Hábitos diários <strong>+5 a +10 pontos</strong></li>
                                <li>Pular tarefas impacta levemente o humor.</li>
                            </ul>
                            <p>Crie o hábito de sempre checar a aba "Visão de Hábitos" para nutrir o que te mantém funcionando no seu melhor (como exercícios físicos, leitura, etc).</p>
                        </div>
                    </section>

                    {/* FAQ */}
                    <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <HelpCircle className="text-purple-400" size={20} />
                            Perguntas Frequentes (FAQ)
                        </h3>
                        <div className="grid gap-4">
                            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                                <h4 className="font-bold text-white mb-2">1. O que acontece se eu não terminar uma tarefa no tempo previsto?</h4>
                                <p className="text-sm text-slate-400">Quando a barra de progresso ficar vermelha (tempo estourado), você pode simplesmente continuar trabalhando (o OitoH registrará o tempo excedente). Se o tempo acabou e você não pode continuar, pare o cronômetro. Depois, você pode usar a opção "Duplicar" ou "Avançar" no menu da tarefa para alocar um novo bloco de tempo no dia seguinte para terminá-la.</p>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                                <h4 className="font-bold text-white mb-2">2. Para que serve o "Modo Foco"?</h4>
                                <p className="text-sm text-slate-400">O Modo Foco é ativado automaticamente assim que você dá 'Play' em uma tarefa. Ele escurece o fundo da tela e exibe uma barra flutuante no topo, isolando você de distrações visuais de outras tarefas da agenda para que sua atenção fique 100% dedicada ao bloco atual.</p>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                                <h4 className="font-bold text-white mb-2">3. Como a "Carga Cognitiva" é calculada?</h4>
                                <p className="text-sm text-slate-400">A barra de Carga Cognitiva no topo da Visão Diária soma a duração de todas as tarefas planejadas para aquele dia específico, excluindo tarefas já concluídas ou canceladas. É um termômetro visual para evitar que você agende mais do que 8 horas de esforço mental profundo diário.</p>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                                <h4 className="font-bold text-white mb-2">4. Como ganho pontos de "Vitalidade" e melhoro meu "Humor"?</h4>
                                <p className="text-sm text-slate-400">Sua pontuação aumenta ao concluir tarefas (+5 pontos) e ao marcar Hábitos do dia como concluídos (+5 a +10 pontos). Se a sua vitalidade cair por inatividade ou tarefas muito atrasadas, o Emoji do sistema ficará com feições cansadas. Consistência é a chave.</p>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                                <h4 className="font-bold text-white mb-2">5. Posso criar tarefas que se repetem todos os dias ou semanas?</h4>
                                <p className="text-sm text-slate-400">Sim! Ao criar ou editar uma tarefa principal no calendário, no final do formulário você encontrará a seção "Recorrência". Ali é possível configurar para que a tarefa repita diariamente, em dias úteis, ou semanalmente para facilitar o bloqueio de tempo recorrente.</p>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                                <h4 className="font-bold text-white mb-2">6. Qual a diferença entre Hábitos diários e Tarefas com recorrência?</h4>
                                <p className="text-sm text-slate-400">Hábitos não têm um "horário marcado" e não gastam a sua Carga Cognitiva — eles servem para aumentar a sua vitalidade (como "Beber Água" ou "Ler 10 páginas"). Já as Tarefas Recorrentes são blocos de tempo literais bloqueados na sua agenda e que cobram foco e dedicação temporal.</p>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                                <h4 className="font-bold text-white mb-2">7. Se eu atrasar uma tarefa no começo do dia, o aplicativo arruma o resto?</h4>
                                <p className="text-sm text-slate-400">Não reorganizamos a sua agenda automaticamente para evitar mudanças inesperadas sem o seu controle. Porém, no painel de 'Estatísticas', exibimos o "Gráfico de Impacto" para que você veja claramente o Efeito Cascata de como atrasos matinais esmagaram suas tarefas da tarde.</p>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                                <h4 className="font-bold text-white mb-2">8. Como funciona o modo offline?</h4>
                                <p className="text-sm text-slate-400">Todo o banco de dados das suas tarefas roda no próprio navegador (usando o IndexedDB). Então você pode adicionar tarefas, ligar o cronômetro e trabalhar na rua, no avião ou sem internet. Assim que o Wi-Fi voltar, os dados serão sincronizados silenciosamente.</p>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                                <h4 className="font-bold text-white mb-2">9. Por que várias janelas de Modais (Alertas) aparecem à tarde seguidas?</h4>
                                <p className="text-sm text-slate-400">O OitoH possui um sistema de "Fila" para alertas vitais. Se o tempo da sua tarefa acabar enquanto você está em outra aba, ou se você perder a hora de começar algo, o sistema guarda esses modais numa fila amigável e os exibe um por um de forma organizada quando você volta ao app, ao invés de explodir vinte telas na sua cara de uma vez.</p>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                                <h4 className="font-bold text-white mb-2">10. Posso desligar o som do aplicativo?</h4>
                                <p className="text-sm text-slate-400">Com certeza. Basta clicar no ícone de "Engrenagem" (Configurações) no canto superior. Você pode mutar tudo com um único clique ou abaixar o volume especificamente para Sons de Início, Fim ou de Alertas Atrasados.</p>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                                <h4 className="font-bold text-white mb-2">11. Meus dados estão publicos para outros usuários?</h4>
                                <p className="text-sm text-slate-400">Não. O sistema de Time Blocking OitoH possui políticas de segurança rígidas (RLS) no Supabase que garantem que apenas a sua conta consiga ver ou manipular os seus dados encriptados de agenda e hábitos. Ninguém mais tem acesso a essas tabelas.</p>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                                <h4 className="font-bold text-white mb-2">12. Consigo exportar minhas informações?</h4>
                                <p className="text-sm text-slate-400">No momento, o aplicativo concentra-se na visão do Painel de Estatísticas para a visualização analítica, e ainda não há um botão "Nativo" de exportação CSV ou PDF. Isso está na lista das melhorias de próximas versões do sistema.</p>
                            </div>
                        </div>
                    </section>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 shrink-0 bg-slate-900/50 rounded-b-3xl">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                    >
                        Entendi, fechar
                    </button>
                </div>
            </div>
        </div>
    );
};
