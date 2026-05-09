import React from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { useAuthStore } from '../../store/useAuthStore';

interface TutorialTourProps {
    run: boolean;
    setRun: (run: boolean) => void;
}

export const TutorialTour: React.FC<TutorialTourProps> = ({ run, setRun }) => {
    const { completeTutorial } = useAuthStore();

    const steps: Step[] = [
        // ── Boas-vindas ──────────────────────────────────────────────────────
        {
            target: 'body',
            placement: 'center',
            title: 'Bem-vindo ao OitoH!',
            content: (
                <div className="text-left space-y-2">
                    <p>Sua jornada para uma produtividade realista começa aqui.</p>
                    <p>O OitoH não é apenas um gestor de tarefas — é seu parceiro para equilibrar trabalho e vitalidade.</p>
                </div>
            ),
            disableBeacon: true,
        },

        // ── Navegação entre visões ────────────────────────────────────────────
        {
            target: '#nav-views',
            placement: 'bottom',
            title: 'Menu de Navegação',
            content: (
                <div className="text-left space-y-2">
                    <p>Aqui você alterna entre as diferentes visões do sistema.</p>
                    <p>Cada ícone abre uma perspectiva diferente da sua produtividade.</p>
                </div>
            ),
            disableBeacon: true,
        },

        // ── Visão Diária ──────────────────────────────────────────────────────
        {
            target: '#nav-day',
            placement: 'bottom',
            title: 'Visão Diária',
            content: 'Seu planejamento hora a hora. Aqui você cria e gerencia os blocos de tempo do seu dia.',
            disableBeacon: true,
        },

        // ── Visão Mensal ──────────────────────────────────────────────────────
        {
            target: '#nav-month',
            placement: 'bottom',
            title: 'Visão Mensal',
            content: 'A macro do seu mês. Ideal para ter uma visão estratégica e navegar entre os dias rapidamente.',
            disableBeacon: true,
        },

        // ── Visão de Hábitos ─────────────────────────────────────────────────
        {
            target: '#nav-habits',
            placement: 'bottom',
            title: 'Visão de Hábitos',
            content: 'Gerencie sua rotina recorrente. Hábitos concluídos aumentam a sua Vitalidade e constroem consistência ao longo do tempo.',
            disableBeacon: true,
        },

        // ── Estatísticas e Relatórios ─────────────────────────────────────────
        {
            target: '#nav-stats',
            placement: 'bottom',
            title: 'Estatísticas e Relatórios',
            content: 'Acompanhe seu desempenho de produtividade e emita relatórios detalhados. Um resumo da sua evolução ao longo do tempo.',
            disableBeacon: true,
        },

        // ── Adicionar tarefa ──────────────────────────────────────────────────
        {
            target: '#add-task-button',
            placement: 'right',
            title: 'Planeje seu Tempo',
            content: 'Comece criando blocos de tempo. Clique aqui para adicionar sua primeira tarefa ou compromisso.',
            disableBeacon: true,
        },

        // ── Carga Cognitiva ───────────────────────────────────────────────────
        {
            target: '#cognitive-load-gauge',
            placement: 'right',
            title: 'Respeite seus Limites',
            content: 'Este termômetro mostra sua carga cognitiva diária. Acompanhe sua meta e evite planejar além do seu limite.',
            disableBeacon: true,
        },

        // ── Vitalidade ────────────────────────────────────────────────────────
        {
            target: '#vitality-card',
            placement: 'right',
            title: 'Sua Vitalidade',
            content: 'Acompanhe sua energia e humor. Concluir tarefas e hábitos aumenta sua vitalidade e muda seu humor.',
            disableBeacon: true,
        },

        // ── Configurações ─────────────────────────────────────────────────────
        {
            target: '#settings-button',
            placement: 'bottom',
            title: 'Configurações e Apps',
            content: 'Ajuste sons, temas e descubra como instalar o OitoH no seu computador como aplicativo.',
            disableBeacon: true,
        },

        // ── Encerramento ──────────────────────────────────────────────────────
        {
            target: '#help-button',
            placement: 'bottom',
            title: 'Tudo pronto!',
            content: (
                <div className="text-left space-y-2">
                    <p>Você conheceu os principais recursos do OitoH. 🎉</p>
                    <p>Se quiser rever este tour, clique no ícone <strong>?</strong> aqui no cabeçalho a qualquer momento.</p>
                </div>
            ),
            disableBeacon: true,
        },
    ];

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRun(false);
            completeTutorial();
        }
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            showProgress
            showSkipButton
            callback={handleJoyrideCallback}
            scrollOffset={100}
            disableScrollParentFix
            locale={{
                back: 'Voltar',
                close: 'Fechar',
                last: 'Finalizar',
                next: 'Próximo',
                skip: 'Pular Tutorial',
            }}
            styles={{
                options: {
                    arrowColor: '#1e293b',
                    backgroundColor: '#1e293b',
                    overlayColor: 'rgba(0, 0, 0, 0.75)',
                    primaryColor: '#6366f1',
                    textColor: '#f8fafc',
                    zIndex: 10000,
                },
                tooltipContainer: {
                    textAlign: 'left',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                },
                buttonNext: {
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    fontSize: '10px',
                    letterSpacing: '0.05em',
                },
                buttonBack: {
                    marginRight: 10,
                    color: '#94a3b8',
                },
                buttonSkip: {
                    color: '#94a3b8',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 'bold',
                },
            }}
        />
    );
};
