export type SoundType = 'start' | 'overdue' | 'popup' | 'success' | 'complete' | 'pomodoro_start' | 'pomodoro_end' | 'pomodoro_complete';

// Reliable sound sources from Mixkit CDN

export const SOUND_VARIANTS: Record<SoundType, Record<string, { label: string, url: string, gain?: number }>> = {
    start: {
        classic: { label: 'Clássico', url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' },
        modern: { label: 'Bip', url: 'https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3' },
        subtle: { label: 'Sutil', url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', gain: 0.6 },
    },
    overdue: {
        classic: { label: 'Alerta', url: 'https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3', gain: 0.4 }, // Alarm clock
        gentle: { label: 'Suave', url: 'https://assets.mixkit.co/active_storage/sfx/938/938-preview.mp3' }, // Triangle
        urgent: { label: 'Urgente', url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', gain: 0.3 }, // Warning siren
    },
    popup: {
        classic: { label: 'Pop', url: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3' },
        soft: { label: 'Suave', url: 'https://assets.mixkit.co/active_storage/sfx/2356/2356-preview.mp3' },
        click: { label: 'Click', url: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3' },
    },
    success: {
        classic: { label: 'Sucesso', url: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3' },
        chime: { label: 'Sino', url: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3' },
        arcade: { label: 'Arcade', url: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3' },
    },
    complete: {
        classic: { label: 'Conclusão', url: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3' },
        celebration: { label: 'Festa', url: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3' },
        applause: { label: 'Aplausos', url: 'https://assets.mixkit.co/active_storage/sfx/2016/2016-preview.mp3' },
    },
    pomodoro_start: {
        classic: { label: 'Tic-Tac', url: 'https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3' },
        digital: { label: 'Digital', url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' },
    },
    pomodoro_end: {
        classic: { label: 'Sino Suave', url: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3' },
        tinkle: { label: 'Tilintar', url: 'https://assets.mixkit.co/active_storage/sfx/938/938-preview.mp3' },
    },
    pomodoro_complete: {
        classic: { label: 'Conclusão', url: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3' },
        celebration: { label: 'Festa', url: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3' },
    }
};
