import Dexie, { Table } from 'dexie';
import { Task } from '../store/useTaskStore';
import { Habit, HabitCompletion } from '../store/useHabitStore';

// Tipos para o Log de Operações (Oplog)
export type SyncOperationType = 'INSERT' | 'UPDATE' | 'DELETE';
export type SyncTable = 'tasks' | 'habits' | 'habit_completions' | 'settings';

export interface SyncOperation {
    id?: number;
    table: SyncTable;
    type: SyncOperationType;
    entityId: string; // UUID da entidade
    data: any; // Dados da mudança
    timestamp: number;
    synced: 0 | 1; // 0 = Pendente, 1 = Sincronizado
}

export interface SyncMetadata {
    table: string;
    lastPullTimestamp: number;
}

// Extensão das interfaces para o banco local (compatibilidade)
export interface LocalTask extends Omit<Task, 'startTime' | 'completedAt'> {
    startTime: string; // ISO string para o Dexie
    completedAt?: string;
    updatedAt: number;
    deletedAt?: string; // Soft Delete support
    userId: string;
}

export interface LocalHabit extends Habit {
    updatedAt: number;
    userId: string;
}

export interface LocalHabitCompletion extends HabitCompletion {
    id: string; // Composto por habitId_date
    updatedAt: number;
    userId: string;
}

export interface LocalSettings {
    id: 'current'; // Registro único
    theme: 'light' | 'dark';
    soundEnabled: boolean;
    volumes: any;
    soundVariants: any;
    updatedAt: number;
    userId: string;
}

export class TimeBlockingDB extends Dexie {
    tasks!: Table<LocalTask>;
    habits!: Table<LocalHabit>;
    habit_completions!: Table<LocalHabitCompletion>;
    settings!: Table<LocalSettings>;
    sync_operations!: Table<SyncOperation>;
    sync_metadata!: Table<SyncMetadata>;

    constructor() {
        super('TimeBlockingDB');
        this.version(2).stores({
            tasks: 'id, startTime, updatedAt',
            habits: 'id, updatedAt',
            habit_completions: 'id, habitId, date, updatedAt',
            settings: 'id',
            sync_operations: '++id, table, type, synced, timestamp',
            sync_metadata: 'table'
        });
    }
}

export const db = new TimeBlockingDB();

/**
 * Função utilitária para registrar operações no Oplog (Versão Inteligente V9.11)
 * Se já houver uma operação pendente para a mesma entidade, nós a atualizamos em vez de criar uma nova.
 */
export async function logSyncOperation(table: SyncTable, type: SyncOperationType, entityId: string, data: any) {
    // 1. Verificar se já existe uma operação pendente (não sincronizada) para este mesmo item
    const existingOp = await db.sync_operations
        .where({ table, entityId, synced: 0 })
        .first();

    if (existingOp && existingOp.id) {
        // Se for um UPDATE e o anterior também era, apenas mesclamos os dados
        // Se o novo for DELETE, ele sobrescreve qualquer UPDATE anterior
        await db.sync_operations.update(existingOp.id, {
            type: type === 'DELETE' ? 'DELETE' : existingOp.type,
            data: type === 'DELETE' ? data : { ...existingOp.data, ...data },
            timestamp: Date.now()
        });
        console.log(`[DB] 🔄 Operação pendente atualizada para ${table}/${entityId}`);
    } else {
        // Caso contrário, adicionamos uma nova operação à fila
        await db.sync_operations.add({
            table,
            type,
            entityId,
            data,
            timestamp: Date.now(),
            synced: 0
        });
        console.log(`[DB] 🆕 Nova operação registrada na fila: ${table}/${entityId} (${type})`);
    }

    // 2. Disparar evento de atividade para o motor de sincronia (V9.11)
    // Usamos evento para evitar dependência circular com sync.ts
    window.dispatchEvent(new CustomEvent('sync:activity')); 
}
