import { useSettingsStore } from '../store/useSettingsStore';
import { SoundType, SOUND_VARIANTS } from '../constants/audio';
import { AudioManager } from './AudioManager';

export type { SoundType };
export { SOUND_VARIANTS };

export const playSound = (type: SoundType) => {
    const { soundEnabled, volumes, soundVariants } = useSettingsStore.getState();

    if (!soundEnabled) return;

    const variantId = soundVariants[type] || 'classic';
    const volume = volumes[type] ?? 0.5;

    // Get URL for the selected variant
    let variant = SOUND_VARIANTS[type][variantId];

    // Fallback if missing
    if (!variant) {
        variant = SOUND_VARIANTS[type]['classic'];
    }

    if (!variant) return;

    // Apply optional gain correction
    const gain = variant.gain ?? 1;
    const finalVolume = Math.max(0, Math.min(1, volume * gain));

    // Delegate to AudioManager
    AudioManager.getInstance().play(variant.url, finalVolume);
};

export const stopSound = () => {
    AudioManager.getInstance().stop();
};

export const preloadSounds = () => {
    const urls: string[] = [];
    Object.values(SOUND_VARIANTS).forEach(variants => {
        Object.values(variants).forEach(variant => {
            urls.push(variant.url);
        });
    });
    AudioManager.getInstance().preload(urls);
};
