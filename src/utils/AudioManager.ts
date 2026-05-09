export class AudioManager {
    private static instance: AudioManager;
    private currentAudio: HTMLAudioElement | null = null;

    private constructor() { }

    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    public play(url: string, volume: number = 1): void {
        this.stop(); // Ensure previous sound is stopped

        const audio = new Audio(url);
        audio.volume = Math.max(0, Math.min(1, volume));

        audio.play().catch(e => {
            console.warn('Audio play failed:', e);
        });

        this.currentAudio = audio;

        // Cleanup reference when done
        audio.onended = () => {
            if (this.currentAudio === audio) {
                this.currentAudio = null;
            }
        };
    }

    public stop(): void {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
    }

    public preload(urls: string[]): void {
        urls.forEach(url => {
            const audio = new Audio(url);
            audio.load();
        });
    }
}
