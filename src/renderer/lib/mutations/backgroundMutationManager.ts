import {
  getSyncOutboxValue,
  setSyncOutboxValue,
} from '../offline/storage/persistence';
import { isVersionConflictError } from '../errors/errorNormalization';

export type BackgroundMutationStatus =
  | 'queued'
  | 'syncing'
  | 'retrying'
  | 'saved'
  | 'failed';

export interface BackgroundMutationRecord {
  id: string;
  scope: string;
  entityKey?: string;
  status: BackgroundMutationStatus;
  attempts: number;
  maxRetries: number;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BackgroundMutationSummary {
  queued: number;
  syncing: number;
  retrying: number;
  failed: number;
  saved: number;
  active: number;
}

interface QueueTask<TData> {
  id: string;
  scope: string;
  entityKey?: string;
  replayHandlerId?: string;
  maxRetries: number;
  retryDelayMs: number;
  attempts: number;
  createdAt: number;
  serializedVariables?: string;
  run: () => Promise<TData>;
  resolve: (value: TData) => void;
  reject: (error: unknown) => void;
}

interface EnqueueBackgroundMutationOptions<TData> {
  scope: string;
  entityKey?: string;
  replayHandlerId?: string;
  variables?: unknown;
  run: () => Promise<TData>;
  maxRetries?: number;
  retryDelayMs?: number;
}

const IDB_RECORDS_KEY = 'background_mutation_records';
const IDB_PENDING_TASKS_KEY = 'background_mutation_pending_tasks';
const MAX_RECORDS = 250;
const SAVED_RECORD_TTL_MS = 6000;
const DEFAULT_MAX_CONCURRENT = 3;
const MAX_CONCURRENT_CAP = 8;

interface ReplayMutationTaskSnapshot {
  id: string;
  scope: string;
  entityKey?: string;
  replayHandlerId: string;
  maxRetries: number;
  retryDelayMs: number;
  attempts: number;
  createdAt: number;
  updatedAt: number;
  serializedVariables: string;
}

type ReplayMutationHandler = (variables: unknown) => Promise<unknown>;

function resolveMaxConcurrent(): number {
  const raw = Number(
    process.env.BACKGROUND_MUTATION_MAX_CONCURRENT || DEFAULT_MAX_CONCURRENT,
  );
  if (!Number.isFinite(raw)) return DEFAULT_MAX_CONCURRENT;
  return Math.min(MAX_CONCURRENT_CAP, Math.max(1, Math.floor(raw)));
}

function isSyncTelemetryEnabled(): boolean {
  const value = (process.env.BACKGROUND_MUTATION_TELEMETRY || '').toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

export interface BackgroundMutationQueueSnapshot {
  records: BackgroundMutationRecord[];
  summary: BackgroundMutationSummary;
}

class BackgroundMutationManager {
  private tasks = new Map<string, QueueTask<any>>();

  private records = new Map<string, BackgroundMutationRecord>();

  private pendingTaskSnapshots = new Map<string, ReplayMutationTaskSnapshot>();

  private replayHandlers = new Map<string, ReplayMutationHandler>();

  private queue: string[] = [];

  private entityQueueMap = new Map<string, string[]>();

  private listeners = new Set<() => void>();

  private readonly maxConcurrent = resolveMaxConcurrent();

  private readonly telemetryEnabled = isSyncTelemetryEnabled();

  private inFlight = 0;

  private snapshot: BackgroundMutationQueueSnapshot;

  constructor() {
    this.snapshot = {
      records: [],
      summary: {
        queued: 0,
        syncing: 0,
        retrying: 0,
        failed: 0,
        saved: 0,
        active: 0,
      },
    };

    void this.bootstrapFromStorage();
    this.refreshSnapshot();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.processQueue();
      });

      // Warn users before they leave while writes are still queued/syncing.
      window.addEventListener('beforeunload', (event) => {
        if (this.getSummary().active <= 0) return;
        event.preventDefault();
        event.returnValue = '';
      });
    }
  }

  private async bootstrapFromStorage(): Promise<void> {
    await this.bootstrapTaskSnapshots();
    await this.bootstrapRecords();
    this.refreshSnapshot();
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  registerReplayHandler(
    handlerId: string,
    handler: ReplayMutationHandler,
  ): () => void {
    this.replayHandlers.set(handlerId, handler);
    this.hydratePersistedTasksForHandler(handlerId);

    return () => {
      const current = this.replayHandlers.get(handlerId);
      if (current === handler) {
        this.replayHandlers.delete(handlerId);
      }
    };
  }

  getSnapshot(): BackgroundMutationQueueSnapshot {
    return this.snapshot;
  }

  getRecords(): BackgroundMutationRecord[] {
    return [...this.records.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getSummary(): BackgroundMutationSummary {
    const summary: BackgroundMutationSummary = {
      queued: 0,
      syncing: 0,
      retrying: 0,
      failed: 0,
      saved: 0,
      active: 0,
    };

    for (const record of this.records.values()) {
      if (record.status === 'queued') summary.queued += 1;
      if (record.status === 'syncing') summary.syncing += 1;
      if (record.status === 'retrying') summary.retrying += 1;
      if (record.status === 'failed') summary.failed += 1;
      if (record.status === 'saved') summary.saved += 1;
    }

    summary.active = summary.queued + summary.syncing + summary.retrying;
    return summary;
  }

  enqueue<TData>(
    options: EnqueueBackgroundMutationOptions<TData>,
  ): Promise<TData> {
    const id = this.createMutationId(options.scope);
    const createdAt = Date.now();
    const serializedVariables = this.serializeVariables(options.variables);

    const taskPromise = new Promise<TData>((resolve, reject) => {
      const task: QueueTask<TData> = {
        id,
        scope: options.scope,
        entityKey: options.entityKey,
        replayHandlerId: options.replayHandlerId,
        maxRetries: Math.max(0, options.maxRetries ?? 3),
        retryDelayMs: Math.max(200, options.retryDelayMs ?? 1200),
        attempts: 0,
        createdAt,
        serializedVariables,
        run: options.run,
        resolve,
        reject,
      };

      this.tasks.set(id, task as QueueTask<any>);

      if (serializedVariables && options.replayHandlerId) {
        this.upsertPendingTaskSnapshot({
          id,
          scope: options.scope,
          entityKey: options.entityKey,
          replayHandlerId: options.replayHandlerId,
          maxRetries: task.maxRetries,
          retryDelayMs: task.retryDelayMs,
          attempts: 0,
          createdAt,
          updatedAt: createdAt,
          serializedVariables,
        });
      }

      this.upsertRecord({
        id,
        scope: options.scope,
        entityKey: options.entityKey,
        status: 'queued',
        attempts: 0,
        maxRetries: task.maxRetries,
        createdAt,
        updatedAt: createdAt,
      });

      this.enqueueTaskId(task);
      this.processQueue();
    });

    return taskPromise;
  }

  dismissRecord(id: string): void {
    const record = this.records.get(id);
    if (this.records.delete(id)) {
      this.tasks.delete(id);
      this.removePendingTaskSnapshot(id);
      if (record?.entityKey) {
        this.cleanupEntityQueue({
          entityKey: record.entityKey,
        } as QueueTask<any>);
      }
      this.persistRecords();
      this.notify();
    }
  }

  retryFailed(id: string): void {
    const record = this.records.get(id);
    let task = this.tasks.get(id);

    if (!task) {
      this.tryHydrateTaskById(id);
      task = this.tasks.get(id);
    }

    if (!record || !task) return;
    if (record.status !== 'failed') return;

    task.attempts = 0;
    this.upsertRecord({
      ...record,
      status: 'queued',
      attempts: 0,
      errorMessage: undefined,
      updatedAt: Date.now(),
    });
    this.upsertPendingTaskSnapshotFromTask(task);
    this.enqueueTaskId(task);
    this.processQueue();
  }

  private processQueue(): void {
    while (this.inFlight < this.maxConcurrent && this.queue.length > 0) {
      const taskId = this.queue.shift();
      if (!taskId) break;

      const task = this.tasks.get(taskId);
      if (!task) {
        continue;
      }

      this.inFlight += 1;
      void this.executeTask(task).finally(() => {
        this.inFlight = Math.max(0, this.inFlight - 1);
        this.processQueue();
      });
    }
  }

  private async executeTask(task: QueueTask<any>): Promise<void> {
    const now = Date.now();
    const startedAt = Date.now();
    const currentRecord = this.records.get(task.id);

    this.upsertRecord({
      ...(currentRecord || {
        id: task.id,
        scope: task.scope,
        entityKey: task.entityKey,
        createdAt: now,
      }),
      id: task.id,
      scope: task.scope,
      entityKey: task.entityKey,
      status: task.attempts > 0 ? 'retrying' : 'syncing',
      attempts: task.attempts,
      maxRetries: task.maxRetries,
      errorMessage: undefined,
      updatedAt: now,
    });

    try {
      const data = await task.run();
      const durationMs = Date.now() - startedAt;

      this.upsertRecord({
        id: task.id,
        scope: task.scope,
        entityKey: task.entityKey,
        status: 'saved',
        attempts: task.attempts,
        maxRetries: task.maxRetries,
        createdAt: this.records.get(task.id)?.createdAt || now,
        updatedAt: Date.now(),
      });

      task.resolve(data);
      this.tasks.delete(task.id);
      this.removePendingTaskSnapshot(task.id);
      this.cleanupEntityQueue(task);
      this.scheduleSavedCleanup(task.id);
      this.logTelemetry('saved', task, durationMs);
      this.notify();
    } catch (error) {
      task.attempts += 1;
      const durationMs = Date.now() - startedAt;

      // Version conflicts are stale writes. Treat them as no-op success to keep UX simple.
      if (isVersionConflictError(error)) {
        this.upsertRecord({
          id: task.id,
          scope: task.scope,
          entityKey: task.entityKey,
          status: 'saved',
          attempts: task.attempts,
          maxRetries: task.maxRetries,
          errorMessage: undefined,
          createdAt: this.records.get(task.id)?.createdAt || now,
          updatedAt: Date.now(),
        });

        task.resolve(undefined as any);
        this.tasks.delete(task.id);
        this.removePendingTaskSnapshot(task.id);
        this.cleanupEntityQueue(task);
        this.scheduleSavedCleanup(task.id);
        this.logTelemetry('saved', task, durationMs, {
          skippedReason: 'version_conflict',
        });
        this.notify();
        return;
      }

      const shouldRetry =
        task.attempts <= task.maxRetries && !isVersionConflictError(error);

      if (shouldRetry) {
        const delay = this.retryDelay(task);
        this.upsertPendingTaskSnapshotFromTask(task);

        this.upsertRecord({
          id: task.id,
          scope: task.scope,
          entityKey: task.entityKey,
          status: 'retrying',
          attempts: task.attempts,
          maxRetries: task.maxRetries,
          errorMessage: this.toErrorMessage(error),
          createdAt: this.records.get(task.id)?.createdAt || now,
          updatedAt: Date.now(),
        });

        this.notify();
        this.logTelemetry('retrying', task, durationMs, {
          delayMs: delay,
          error: this.toErrorMessage(error),
        });

        setTimeout(() => {
          this.upsertRecord({
            ...(this.records.get(task.id) || {
              id: task.id,
              scope: task.scope,
              entityKey: task.entityKey,
              createdAt: now,
            }),
            id: task.id,
            scope: task.scope,
            entityKey: task.entityKey,
            status: 'queued',
            attempts: task.attempts,
            maxRetries: task.maxRetries,
            updatedAt: Date.now(),
          });
          this.upsertPendingTaskSnapshotFromTask(task);
          this.enqueueTaskId(task);
          this.processQueue();
        }, delay);

        return;
      }

      this.upsertRecord({
        id: task.id,
        scope: task.scope,
        entityKey: task.entityKey,
        status: 'failed',
        attempts: task.attempts,
        maxRetries: task.maxRetries,
        errorMessage: this.toErrorMessage(error),
        createdAt: this.records.get(task.id)?.createdAt || now,
        updatedAt: Date.now(),
      });

      task.reject(error);
      this.removePendingTaskSnapshot(task.id);
      this.cleanupEntityQueue(task);
      this.logTelemetry('failed', task, durationMs, {
        error: this.toErrorMessage(error),
      });
      this.notify();
    }
  }

  private enqueueTaskId(task: QueueTask<any>): void {
    if (task.entityKey) {
      const current = this.entityQueueMap.get(task.entityKey) || [];
      if (current.length > 0) {
        current.push(task.id);
        this.entityQueueMap.set(task.entityKey, current);
        return;
      }
      this.entityQueueMap.set(task.entityKey, [task.id]);
    }

    this.queue.push(task.id);
    this.notify();
  }

  private cleanupEntityQueue(task: QueueTask<any>): void {
    if (!task.entityKey) return;

    const current = this.entityQueueMap.get(task.entityKey) || [];
    const [, ...rest] = current;

    if (rest.length === 0) {
      this.entityQueueMap.delete(task.entityKey);
      return;
    }

    this.entityQueueMap.set(task.entityKey, rest);
    const nextTaskId = rest[0];
    if (!this.queue.includes(nextTaskId)) {
      this.queue.push(nextTaskId);
    }
  }

  private retryDelay(task: QueueTask<any>): number {
    const factor = Math.min(task.attempts, 6);
    return task.retryDelayMs * 2 ** (factor - 1);
  }

  private scheduleSavedCleanup(id: string): void {
    setTimeout(() => {
      const record = this.records.get(id);
      if (!record || record.status !== 'saved') return;
      this.records.delete(id);
      this.persistRecords();
      this.notify();
    }, SAVED_RECORD_TTL_MS);
  }

  private createMutationId(scope: string): string {
    const random = Math.random().toString(36).slice(2, 10);
    return `${scope}-${Date.now()}-${random}`;
  }

  private upsertRecord(record: BackgroundMutationRecord): void {
    this.records.set(record.id, record);
    this.trimRecords();
    this.persistRecords();
    this.notify();
  }

  private trimRecords(): void {
    if (this.records.size <= MAX_RECORDS) return;

    const sorted = [...this.records.values()].sort(
      (a, b) => a.updatedAt - b.updatedAt,
    );
    const overflow = sorted.length - MAX_RECORDS;
    let removedSnapshots = false;

    for (let i = 0; i < overflow; i += 1) {
      const removedId = sorted[i].id;
      this.records.delete(removedId);
      if (this.pendingTaskSnapshots.delete(removedId)) {
        removedSnapshots = true;
      }
    }

    if (removedSnapshots) {
      this.persistPendingTaskSnapshots();
    }
  }

  private async bootstrapTaskSnapshots(): Promise<void> {
    if (typeof window === 'undefined') return;

    const indexed = await getSyncOutboxValue<ReplayMutationTaskSnapshot[]>(
      IDB_PENDING_TASKS_KEY,
    );
    const parsed = indexed && Array.isArray(indexed) ? indexed : [];

    for (const snapshot of parsed) {
      if (!snapshot?.id || !snapshot?.scope) continue;
      if (!snapshot?.replayHandlerId) continue;
      if (typeof snapshot.serializedVariables !== 'string') continue;

      this.pendingTaskSnapshots.set(snapshot.id, {
        ...snapshot,
        maxRetries: Math.max(0, snapshot.maxRetries ?? 3),
        retryDelayMs: Math.max(200, snapshot.retryDelayMs ?? 1200),
        attempts: Math.max(0, snapshot.attempts ?? 0),
      });
    }
  }

  private async bootstrapRecords(): Promise<void> {
    if (typeof window === 'undefined') return;

    const indexed =
      await getSyncOutboxValue<BackgroundMutationRecord[]>(IDB_RECORDS_KEY);
    const parsed = indexed && Array.isArray(indexed) ? indexed : [];

    for (const record of parsed) {
      if (!record || !record.id) continue;

      const hasReplaySnapshot = this.pendingTaskSnapshots.has(record.id);

      const status =
        record.status === 'queued' ||
        record.status === 'syncing' ||
        record.status === 'retrying'
          ? hasReplaySnapshot
            ? 'queued'
            : 'failed'
          : record.status;

      this.records.set(record.id, {
        ...record,
        status,
        attempts:
          this.pendingTaskSnapshots.get(record.id)?.attempts ?? record.attempts,
        errorMessage:
          status === 'failed'
            ? record.errorMessage ||
              'Application restarted before mutation completed.'
            : undefined,
        updatedAt: Date.now(),
      });
    }

    await this.persistRecords();
  }

  private async persistRecords(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      await setSyncOutboxValue(IDB_RECORDS_KEY, this.getRecords());
    } catch (error) {
      console.warn(
        '[BackgroundMutation] Failed to persist queue records:',
        error,
      );
    }
  }

  private async persistPendingTaskSnapshots(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      await setSyncOutboxValue(IDB_PENDING_TASKS_KEY, [
        ...this.pendingTaskSnapshots.values(),
      ]);
    } catch (error) {
      console.warn(
        '[BackgroundMutation] Failed to persist outbox snapshots:',
        error,
      );
    }
  }

  private notify(): void {
    this.refreshSnapshot();

    for (const listener of this.listeners) {
      listener();
    }
  }

  private refreshSnapshot(): void {
    this.snapshot = {
      records: this.getRecords(),
      summary: this.getSummary(),
    };
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Unknown background mutation failure';
  }

  private serializeVariables(variables: unknown): string | undefined {
    try {
      const serialized = JSON.stringify(
        typeof variables === 'undefined' ? null : variables,
      );
      return typeof serialized === 'string' ? serialized : undefined;
    } catch {
      return undefined;
    }
  }

  private parseSerializedVariables(serialized: string): unknown {
    return JSON.parse(serialized);
  }

  private upsertPendingTaskSnapshot(
    snapshot: ReplayMutationTaskSnapshot,
  ): void {
    this.pendingTaskSnapshots.set(snapshot.id, snapshot);
    this.persistPendingTaskSnapshots();
  }

  private upsertPendingTaskSnapshotFromTask(task: QueueTask<any>): void {
    if (!task.serializedVariables || !task.replayHandlerId) return;

    this.upsertPendingTaskSnapshot({
      id: task.id,
      scope: task.scope,
      entityKey: task.entityKey,
      replayHandlerId: task.replayHandlerId,
      maxRetries: task.maxRetries,
      retryDelayMs: task.retryDelayMs,
      attempts: task.attempts,
      createdAt: task.createdAt,
      updatedAt: Date.now(),
      serializedVariables: task.serializedVariables,
    });
  }

  private removePendingTaskSnapshot(id: string): void {
    if (!this.pendingTaskSnapshots.delete(id)) return;
    this.persistPendingTaskSnapshots();
  }

  private tryHydrateTaskById(id: string): void {
    const snapshot = this.pendingTaskSnapshots.get(id);
    if (!snapshot) return;

    const handler = this.replayHandlers.get(snapshot.replayHandlerId);
    if (!handler) return;

    this.hydrateSnapshot(snapshot, handler);
  }

  private hydratePersistedTasksForHandler(handlerId: string): void {
    const handler = this.replayHandlers.get(handlerId);
    if (!handler) return;

    let hydratedCount = 0;
    for (const snapshot of this.pendingTaskSnapshots.values()) {
      if (snapshot.replayHandlerId !== handlerId) continue;
      if (this.tasks.has(snapshot.id)) continue;
      this.hydrateSnapshot(snapshot, handler);
      hydratedCount += 1;
    }

    if (hydratedCount > 0) {
      this.processQueue();
    }
  }

  private hydrateSnapshot(
    snapshot: ReplayMutationTaskSnapshot,
    handler: ReplayMutationHandler,
  ): void {
    let variables: unknown;
    try {
      variables = this.parseSerializedVariables(snapshot.serializedVariables);
    } catch {
      this.removePendingTaskSnapshot(snapshot.id);
      this.upsertRecord({
        id: snapshot.id,
        scope: snapshot.scope,
        entityKey: snapshot.entityKey,
        status: 'failed',
        attempts: snapshot.attempts,
        maxRetries: snapshot.maxRetries,
        errorMessage:
          'Failed to restore pending mutation payload after restart.',
        createdAt: snapshot.createdAt,
        updatedAt: Date.now(),
      });
      return;
    }

    const existingRecord = this.records.get(snapshot.id);

    const task: QueueTask<unknown> = {
      id: snapshot.id,
      scope: snapshot.scope,
      entityKey: snapshot.entityKey,
      replayHandlerId: snapshot.replayHandlerId,
      maxRetries: snapshot.maxRetries,
      retryDelayMs: snapshot.retryDelayMs,
      attempts: snapshot.attempts,
      createdAt: snapshot.createdAt,
      serializedVariables: snapshot.serializedVariables,
      run: () => handler(variables),
      resolve: () => undefined,
      reject: () => undefined,
    };

    this.tasks.set(snapshot.id, task);
    this.upsertRecord({
      ...(existingRecord || {
        id: snapshot.id,
        scope: snapshot.scope,
        entityKey: snapshot.entityKey,
        createdAt: snapshot.createdAt,
      }),
      id: snapshot.id,
      scope: snapshot.scope,
      entityKey: snapshot.entityKey,
      status: 'queued',
      attempts: snapshot.attempts,
      maxRetries: snapshot.maxRetries,
      errorMessage: undefined,
      updatedAt: Date.now(),
    });
    this.enqueueTaskId(task);
  }

  private logTelemetry(
    status: 'saved' | 'retrying' | 'failed',
    task: QueueTask<any>,
    durationMs: number,
    extra?: Record<string, unknown>,
  ): void {
    if (!this.telemetryEnabled) return;

    console.info('[BackgroundMutation]', {
      status,
      id: task.id,
      scope: task.scope,
      entityKey: task.entityKey,
      attempts: task.attempts,
      maxRetries: task.maxRetries,
      durationMs,
      inFlight: this.inFlight,
      queued: this.queue.length,
      ...extra,
    });
  }
}

export const backgroundMutationManager = new BackgroundMutationManager();
