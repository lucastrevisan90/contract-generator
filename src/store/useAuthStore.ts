import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { useTaskStore } from './useTaskStore';
import { useHabitStore } from './useHabitStore';
import { useSettingsStore } from './useSettingsStore';

export interface Profile {
    id: string;
    email: string;
    full_name?: string;
    subscription_status: 'active' | 'inactive';
    is_admin: boolean;
    password_change_required: boolean;
    has_completed_tutorial: boolean;
}

interface AuthState {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    error: string | null;
    isRecoveryMode: boolean;

    // Actions
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, fullName: string) => Promise<void>;
    signOut: () => Promise<void>;
    updatePassword: (newPassword: string) => Promise<void>;
    updateProfile: (updates: { full_name?: string }) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    refreshProfile: () => Promise<void>;
    completeTutorial: () => Promise<void>;
    initialize: () => Promise<void>;
}

let authListenerStarted = false;

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    profile: null,
    loading: true,
    error: null,
    isRecoveryMode: false,

    initialize: async () => {
        set({ loading: true });
        try {
            // Check for recovery link in URL hash BEFORE getting session
            const hash = window.location.hash;
            if (hash && (hash.includes('type=recovery') || hash.includes('error_code=otp_expired'))) {
                set({ isRecoveryMode: true });
            }

            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                const user = session.user;
                set({ user });
                
                // Propagate userId to stores immediately
                useTaskStore.getState().setUserId(user.id);
                useHabitStore.getState().setUserId(user.id);
                useSettingsStore.getState().setUserId(user.id);
                
                await get().refreshProfile();
            }
        } catch (err: any) {
            console.error('Session init error:', err);
        } finally {
            set({ loading: false });
        }

        // Listen for auth changes (SINGLETON PATTERN)
        if (!authListenerStarted) {
            console.log('[AuthStore] Initializing singleton auth listener...');
            supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('[AuthStore] Auth event change:', event);

                if (event === 'PASSWORD_RECOVERY') {
                    set({ isRecoveryMode: true });
                }

                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    const user = session?.user || null;
                    if (user && user.id !== get().user?.id) {
                        console.log('[AuthStore] User logged in/refreshed:', user.id);
                        set({ user });
                        useTaskStore.getState().setUserId(user.id);
                        useHabitStore.getState().setUserId(user.id);
                        useSettingsStore.getState().setUserId(user.id);
                        await get().refreshProfile();
                    }
                } else if (event === 'SIGNED_OUT') {
                    console.log('[AuthStore] SIGNED_OUT event received');
                    set({ user: null, profile: null, isRecoveryMode: false });
                }
            });
            authListenerStarted = true;
        }
    },

    signIn: async (email, password) => {
        set({ loading: true, error: null });
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            set({ error: error.message, loading: false });
            throw error;
        }

        set({ user: data.user });
        if (data.user) {
            useTaskStore.getState().setUserId(data.user.id);
            useHabitStore.getState().setUserId(data.user.id);
            useSettingsStore.getState().setUserId(data.user.id);
        }
        await get().refreshProfile();
        set({ loading: false });
    },

    signUp: async (email, password, fullName) => {
        set({ loading: true, error: null });
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });

        if (error) {
            set({ error: error.message, loading: false });
            throw error;
        }

        if (data.user) {
            set({ user: data.user });
            useTaskStore.getState().setUserId(data.user.id);
            useHabitStore.getState().setUserId(data.user.id);
            useSettingsStore.getState().setUserId(data.user.id);
            await get().refreshProfile();
        }
        set({ loading: false });
    },

    signOut: async () => {
        console.log('[AuthStore] Starting signOut process...');
        
        // 1. Force local state CLEAR immediately (UI feedback)
        set({ user: null, profile: null, isRecoveryMode: false });
        
        try {
            // 2. Define a timeout for Supabase call (3 seconds)
            const timeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Supabase signOut timeout')), 3000)
            );

            // 3. Race against the timeout
            await Promise.race([
                supabase.auth.signOut(),
                timeout
            ]);
            console.log('[AuthStore] Supabase auth.signOut() finished or timed out');
        } catch (err) {
            console.error('[AuthStore] Supabase signOut error/timeout (continuing with local clear):', err);
        } finally {
            console.log('[AuthStore] Finalizing local cleanup...');
            try {
                // Clear other stores safely and awaited
                await Promise.all([
                    useTaskStore.getState().clearTasks(),
                    useHabitStore.getState().clearHabits(),
                    useSettingsStore.getState().clearSettings()
                ]);

                console.log('[AuthStore] Local data wiped. Forcing reload.');

                // Use simple reload for Tauri - is more reliable than window.location.assign
                window.location.href = '/';
                setTimeout(() => window.location.reload(), 100);
            } catch (err) {
                console.error('[AuthStore] Critical error during final cleanup:', err);
                window.location.reload();
            }
        }
    },

    refreshProfile: async () => {
        const user = get().user;
        if (!user) return;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            // Even if profile fetch fails, if we have a user and debug is on, we might want to allow it?
            // But let's stick to valid profiles for now.
            return;
        }

        let profile = data as Profile;

        // Hidden Admin Force (ONLY FOR RECOVERY/DEBUG)
        const params = new URLSearchParams(window.location.search);
        if (params.get('admin_debug') === 'true') {
            console.warn('ADMIN DEBUG MODE ACTIVE: Forcing is_admin manually');
            profile = { ...profile, is_admin: true };
        }

        set({ profile });
    },

    updatePassword: async (newPassword) => {
        set({ loading: true, error: null });
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) {
            set({ error: error.message, loading: false });
            throw error;
        }

        // After password change, mark password_change_required as false in profile
        const user = get().user;
        if (user) {
            await supabase
                .from('profiles')
                .update({ password_change_required: false })
                .eq('id', user.id);

            await get().refreshProfile();
        }

        // IMPORTANT: For security, sign out after password change from recovery
        await get().signOut();

        set({ loading: false });
    },

    updateProfile: async (updates) => {
        const { user } = get();
        if (!user) return;

        set({ loading: true, error: null });
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;
            await get().refreshProfile();
            set({ loading: false });
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    resetPassword: async (email) => {
        set({ loading: true, error: null });
        try {
            // 1. Check if email exists and is active via RPC (bypasses RLS safely)
            const { data, error: rpcError } = await supabase.rpc('check_user_status_by_email', {
                email_to_check: email
            });

            if (rpcError) throw rpcError;

            // RPC returns an array of results - check the first one
            const status = Array.isArray(data) ? data[0] : data;

            if (!status || !status.user_exists) {
                throw new Error('e-mail não cadastrado');
            }

            if (!status.is_active) {
                throw new Error('esta conta não está mais ativa');
            }

            // 2. If valid, send recovery email
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/login`,
            });
            if (error) throw error;
            set({ loading: false });
        } catch (error: any) {
            const message = error.message.toLowerCase();
            set({ error: message, loading: false });
            throw error;
        }
    },

    completeTutorial: async () => {
        const { user } = get();
        if (!user) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ has_completed_tutorial: true })
                .eq('id', user.id);

            if (error) throw error;
            useSettingsStore.getState().setHasCompletedTutorial(true);
            await get().refreshProfile();
        } catch (error: any) {
            console.error('Error completing tutorial:', error);
            throw error;
        }
    }
}));
