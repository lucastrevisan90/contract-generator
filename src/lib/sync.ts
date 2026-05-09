import { supabase } from './supabase';
import { db, SyncOperation } from './db';

const SYNC_INTERVAL = 300000; // 5 minutos para sync de fundo (Redução de CPU)
let syncInProgress = false;
let syncTimeoutHandle: any = null;
let triggeredSyncTimeout: any = null;

/**
 * Dispara uma sincronia em breve (após debounce).
 * Útil para subir mudanças logo após o usuário interagir, sem esperar o intervalo longo.
 */
export function triggerSync(delayMs = 5000) {
    if (triggeredSyncTimeout) clearTimeout(triggeredSyncTimeout);
    triggeredSyncTimeout = setTimeout(() => {
        console.log('[SyncEngine] 🚀 Sincronia disparada por atividade recente.');
        syncAll();
    }, delayMs);
}

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Sync Timeout')), timeoutMs)
        )
    ]);
};

export const SYNC_EVENTS = {
    PULL_COMPLETED: 'sync:pull-completed'
};

/**
 * Motor de Sincronização Principal
 */
export async function startSyncEngine() {
    if (syncInProgress) return;

    // Tenta sincronizar a cada intervalo (Pull + Push)
    setInterval(async () => {
        if (!navigator.onLine || syncInProgress) return;
        await syncAll(); // Executa o ciclo completo (Pull depois Push)
    }, SYNC_INTERVAL);

    // Sincroniza imediatamente ao voltar a ficar online
    window.addEventListener('online', () => {
        console.log('[SyncEngine] 🌐 De volta online. Sincronizando...');
        syncAll();
    });

    // Escuta atividade local para disparar sync rápido (V9.11)
    window.addEventListener('sync:activity', () => triggerSync(5000));
}

/**
 * Sincronização Completa (Padrão OitoH Inteligente)
 * 1. Pull (Nuvem -> Local) - Delta
 * 2. Push (Local -> Nuvem) - Queue
 */
export async function syncAll() {
    if (syncInProgress || !navigator.onLine) return;
    syncInProgress = true;

    try {
        console.log('[SyncEngine] Iniciando Sincronização Híbrida...');
        
        // Safety: Auto-reset syncInProgress if it hangs for too long (emergency fallback)
        if (syncTimeoutHandle) clearTimeout(syncTimeoutHandle);
        syncTimeoutHandle = setTimeout(() => {
            if (syncInProgress) {
                console.warn('[SyncEngine] EMERGENCY RESET: Sync was stuck for too long.');
                syncInProgress = false;
            }
        }, 30000);

        // Obter userId do session (com timeout)
        const { data: { session }, error: sessionError } = await withTimeout(supabase.auth.getSession(), 5000);
        
        if (sessionError) {
            console.error('[SyncEngine] Erro ao buscar sessão:', sessionError);
            return;
        }

        if (!session?.user) {
            console.log('[SyncEngine] Sincronização abortada: Nenhum usuário logado.');
            return;
        }

        const userId = session.user.id;

        // 1. Pull Delta (Baixa apenas o que mudou na nuvem)
        await withTimeout(pullRemoteChanges(userId), 15000);

        // 2. Push Queue (Sobe o que foi feito offline)
        await withTimeout(processSyncQueue(), 15000);

        console.log('[SyncEngine] Sincronização concluída com sucesso.');
        window.dispatchEvent(new CustomEvent(SYNC_EVENTS.PULL_COMPLETED));
    } catch (error) {
        console.warn('[SyncEngine] Falha ou Timeout na sincronização:', error);
    } finally {
        syncInProgress = false;
        if (syncTimeoutHandle) clearTimeout(syncTimeoutHandle);
    }
}

/**
 * Processa a fila de operações pendentes (Oplog)
 */
export async function processSyncQueue() {
    if (!navigator.onLine) return;
    
    // Se chamado fora do syncAll, marcamos syncInProgress localmente se já não estiver
    const wasAlreadyInSync = syncInProgress;
    if (!wasAlreadyInSync) syncInProgress = true;

    try {
        const pendingOps = await db.sync_operations
            .where('synced')
            .equals(0)
            .sortBy('timestamp');

        for (const op of pendingOps) {
            try {
                const success = await syncOperationWithRetry(op);
                if (success) {
                    await db.sync_operations.update(op.id!, { synced: 1 });
                } else {
                    console.warn(`[Sync] Falha ao processar operação ${op.id}, tentando na próxima vez.`);
                    // Não quebramos mais o loop para permitir que outras tabelas/entidades sincronizem
                    // a menos que seja um erro de rede (offline), o que é checado no início do loop.
                }
            } catch (err) {
                console.error(`[Sync] Erro crítico na operação ${op.id}:`, err);
            }
        }
    } catch (error) {
        console.error('Queue Sync Error:', error);
    } finally {
        if (!wasAlreadyInSync) syncInProgress = false;
    }
}

/**
 * Realiza uma única operação de sincronia no Supabase com lógica de retentativa
 */
async function syncOperationWithRetry(op: SyncOperation, maxRetries = 2): Promise<boolean> {
    let attempt = 0;
    while (attempt < maxRetries) {
        const success = await syncOperation(op);
        if (success) return true;

        attempt++;
        if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(res => setTimeout(res, delay));
        }
    }
    return false;
}

async function syncOperation(op: SyncOperation): Promise<boolean> {
    const { table, type, entityId, data } = op;

    try {
        if (!navigator.onLine) return false;

        if (type === 'DELETE') {
            // Push Soft-Delete (Tombstone) to Supabase instead of Hard-Delete
            const userId = data.userId || data.user_id;
            
            if (!userId) {
                console.warn(`[Sync] 🛡️ Soft-Delete sem user_id para ${table}/${entityId}. Ignorando para limpar fila.`);
                return true; // Marcamos como processado para não travar a UI
            }

            const { error } = await supabase.from(table).upsert({ 
                id: entityId, 
                user_id: userId, 
                deleted: true, 
                updated_at: new Date().toISOString() 
            });

            if (error) {
                console.error(`[Sync] Soft-Delete sync failed for ${table}/${entityId}`, error);
                if (error.code === '42501') return true; // Falha de permissão = unblock
                return false;
            }
            return true;
        }

        // Removido bloqueio de settings para permitir sincronia bidirecional (V9.7)

        const dbPayload = mapToSupabase(table, data);
        if (!dbPayload.user_id) {
            console.error(`[Sync] Abortando push para ${table}/${entityId}: user_id ausente no payload.`, data);
            return true; // Marcamos como processado para não travar a fila, mas é um erro de dado
        }

        // Inject timestamp during push (updated_at)
        const payloadWithId = { 
            ...dbPayload, 
            id: entityId, 
            updated_at: new Date(data.updatedAt || Date.now()).toISOString() 
        };

        console.log(`[Sync] Attempting push to ${table}/${entityId}:`, payloadWithId);

        const { error } = await supabase
            .from(table)
            .upsert(payloadWithId);

        if (error) {
            console.error(`[Sync] ❌ Upsert failed for ${table}:`, {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint,
                payload: payloadWithId
            });
            if (error.code === '42501') {
                console.warn(`[Sync] Permission denied (RLS) for ${table}. Marking as synced to unblock queue.`);
                return true; 
            }
            return false;
        }

        console.log(`[Sync] ✅ Successfully pushed ${table}/${entityId}`);
        return true;
    } catch (e) {
        console.error(`[Sync] 💥 Exception during syncOperation for ${table}:`, e);
        return false;
    }
}

/**
 * Mapeia dados locais para o formato do Postgres/Supabase
 */
function mapToSupabase(table: string, data: any) {
    if (table === 'tasks') {
        return {
            title: data.title,
            description: data.description,
            start_time: data.startTime,
            duration_minutes: data.durationMinutes,
            status: data.status,
            recurrence_json: data.recurrence,
            occurrence_json: data.occurrence,
            user_id: data.userId,
            completed_at: data.completedAt,
        };
    }

    if (table === 'settings') {
        return {
            theme: data.theme,
            sound_enabled: data.soundEnabled,
            volumes: data.volumes,
            sound_variants: data.soundVariants,
            user_id: data.userId
        };
    }

    if (table === 'habits') {
        return {
            title: data.title,
            color: data.color,
            days_of_week: data.daysOfWeek,
            user_id: data.userId,
            created_at: data.createdAt
        };
    }

    if (table === 'habit_completions') {
        return {
            id: data.id, // V9.7: Enviamos o ID composto (habitId_date) para o Supabase
            habit_id: data.habitId,
            date: data.date,
            user_id: data.userId
        };
    }

    return { ...data, user_id: data.userId };
}

/**
 * Pull Delta (Baixa apenas registros alterados desde a última sincronia)
 */
export async function pullRemoteChanges(userId: string) {
    if (!navigator.onLine) return;

    const tables: Array<'tasks' | 'habits' | 'habit_completions' | 'settings'> = ['tasks', 'habits', 'habit_completions', 'settings'];

    for (const tableName of tables) {
        // Get last pull from metadata
        const metadata = await db.sync_metadata.get(tableName);
        const lastPull = metadata?.lastPullTimestamp || 0;
        
        const { data: remoteData, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('user_id', userId)
            .or(`updated_at.gt.${new Date(lastPull).toISOString()},created_at.gt.${new Date(lastPull).toISOString()}`);

        if (error) {
            console.error(`[Sync] Pull failed for ${tableName}:`, error);
            continue;
        }

        if (remoteData && remoteData.length > 0) {
            console.log(`[Sync] 📥 Recebidas ${remoteData.length} atualizações para ${tableName}:`, remoteData);
            let maxUpdatedAt = lastPull;

            for (const item of remoteData) {
                const remoteTs = new Date(item.updated_at || item.created_at).getTime();
                maxUpdatedAt = Math.max(maxUpdatedAt, remoteTs);
                
                // Lógica de Resolução de Conflitos (LWW)
                const local = await (db[tableName] as any).get(item.id);
                
                if (item.deleted) {
                    // Item was deleted on another device
                    console.log(`[Sync] Removendo item deletado remotamente: ${tableName}/${item.id}`);
                    await (db[tableName] as any).delete(item.id);
                } else if (!local || remoteTs > local.updatedAt) {
                    await applyRemoteItemToLocal(tableName, item, remoteTs);
                }
            }

            // Update metadata
            await db.sync_metadata.put({ table: tableName, lastPullTimestamp: maxUpdatedAt });
        }
    }
}

async function applyRemoteItemToLocal(table: string, item: any, remoteTs: number) {
    if (table === 'tasks') {
        await db.tasks.put({
            id: item.id,
            title: item.title,
            description: item.description,
            startTime: item.start_time,
            durationMinutes: item.duration_minutes,
            status: item.status,
            recurrence: item.recurrence_json,
            occurrence: item.occurrence_json,
            completedAt: item.completed_at,
            updatedAt: remoteTs,
            userId: item.user_id
        });
    } else if (table === 'habits') {
        await db.habits.put({
            id: item.id,
            title: item.title,
            color: item.color,
            daysOfWeek: item.days_of_week,
            createdAt: item.created_at,
            updatedAt: remoteTs,
            userId: item.user_id
        });
    } else if (table === 'habit_completions') {
        const compositeId = `${item.habit_id}_${item.date}`;
        await db.habit_completions.put({
            id: compositeId,
            habitId: item.habit_id,
            date: item.date,
            updatedAt: remoteTs,
            userId: item.user_id
        });
    } else if (table === 'settings') {
        await db.settings.put({
            id: 'current',
            theme: item.theme,
            soundEnabled: item.sound_enabled,
            volumes: item.volumes,
            soundVariants: item.sound_variants,
            updatedAt: remoteTs,
            userId: item.user_id
        });
    }
}

