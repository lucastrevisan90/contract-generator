import { useMemo } from 'react';

export type PlatformOS = 'windows' | 'macos' | 'android' | 'ios' | 'linux' | 'unknown';

export interface PlatformInfo {
    os: PlatformOS;
    isTouchDevice: boolean;
    isMobile: boolean;
}

function detectOS(): PlatformOS {
    const ua = navigator.userAgent.toLowerCase();
    const platform = (navigator as any).userAgentData?.platform?.toLowerCase() || '';

    // Order matters: check mobile OS first
    if (/iphone|ipad|ipod/.test(ua) || (platform === 'ios')) return 'ios';
    if (/android/.test(ua)) return 'android';
    if (/macintosh|mac os x/.test(ua) && navigator.maxTouchPoints > 1) return 'ios'; // iPad with desktop UA
    if (/macintosh|mac os x/.test(ua) || platform === 'macos') return 'macos';
    if (/windows/.test(ua) || platform === 'windows') return 'windows';
    if (/linux/.test(ua)) return 'linux';
    return 'unknown';
}

function detectTouch(): boolean {
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    );
}

function detectMobile(): boolean {
    const ua = navigator.userAgent.toLowerCase();
    return /android|iphone|ipad|ipod|mobile|tablet/.test(ua) || (navigator.maxTouchPoints > 1 && /macintosh/.test(ua));
}

export function usePlatform(): PlatformInfo {
    return useMemo(() => ({
        os: detectOS(),
        isTouchDevice: detectTouch(),
        isMobile: detectMobile(),
    }), []);
}

// Non-hook version for use outside React components
export function getPlatformInfo(): PlatformInfo {
    return {
        os: detectOS(),
        isTouchDevice: detectTouch(),
        isMobile: detectMobile(),
    };
}
