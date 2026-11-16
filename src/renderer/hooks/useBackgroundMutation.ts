import {
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
  useQueryClient,
  useMutation,
} from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { backgroundMutationManager } from '../lib/mutations/backgroundMutationManager';
import { isValidIdempotencyKey, withIdempotency } from '../lib/idempotency';
import { requestDeduper } from '../lib/requestDeduplication';

type BackgroundMutationFn<TData, TVariables> = (
  variables: TVariables,
) => Promise<TData>;

interface OptimisticUpdate<TVariables> {
  queryKey: QueryKey;
  updater: (previous: unknown, variables: TVariables) => unknown;
}

interface OptimisticSnapshot {
  queryKey: QueryKey;
  previous: unknown;
}

interface InternalMutationContext<TContext> {
  userContext?: TContext;
  optimisticSnapshots?: OptimisticSnapshot[];
  optimisticEntityKey?: string;
  optimisticVersion?: number;
}

function createReplayHandlerId(scope: string, fn: Function): string {
  const source = fn.toString();
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }
  return `${scope}:${Math.abs(hash).toString(36)}`;
}

export interface UseBackgroundMutationOptions<
  TData,
  TError,
  TVariables,
  TContext,
> extends Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  'mutationFn'
> {
  mutationFn: BackgroundMutationFn<TData, TVariables>;
  backgroundScope: string;
  entityKey?: (variables: TVariables) => string | undefined;
  getIdempotencyKey?: (variables: TVariables) => string | undefined;
  attachIdempotencyKey?: (
    variables: TVariables,
    idempotencyKey: string,
  ) => TVariables;
  dedupePendingByIdempotencyKey?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
  optimisticUpdates?: (variables: TVariables) => OptimisticUpdate<TVariables>[];
  rollbackOptimisticOnError?: boolean;
}

export function useBackgroundMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: UseBackgroundMutationOptions<TData, TError, TVariables, TContext>,
): UseMutationResult<TData, TError, TVariables, TContext> {
  const {
    mutationFn,
    backgroundScope,
    entityKey,
    getIdempotencyKey,
    attachIdempotencyKey,
    dedupePendingByIdempotencyKey = true,
    maxRetries,
    retryDelayMs,
    optimisticUpdates,
    rollbackOptimisticOnError = true,
    onMutate,
    onError,
    onSuccess,
    onSettled,
    ...rest
  } = options;
  const queryClient = useQueryClient();
  const optimisticVersionRef = useRef(0);
  const latestOptimisticVersionByEntityRef = useRef<Map<string, number>>(
    new Map(),
  );

  const getValidatedIdempotencyKey = (
    variables: TVariables,
  ): string | undefined => {
    const key = getIdempotencyKey?.(variables);
    if (!key) return undefined;

    if (!isValidIdempotencyKey(key)) {
      console.warn(
        `[useBackgroundMutation] Invalid idempotency key for scope ${backgroundScope}; falling back to non-idempotent execution.`,
      );
      return undefined;
    }

    return key;
  };

  const runMutationWithIdempotency = (
    variables: TVariables,
    explicitKey?: string,
  ): Promise<TData> => {
    const idempotencyKey = explicitKey ?? getValidatedIdempotencyKey(variables);
    if (!idempotencyKey) {
      return mutationFn(variables);
    }

    return withIdempotency(idempotencyKey, () => mutationFn(variables));
  };

  const replayHandlerId = useMemo(
    () => createReplayHandlerId(backgroundScope, mutationFn),
    [backgroundScope, mutationFn],
  );

  useEffect(
    () =>
      backgroundMutationManager.registerReplayHandler(
        replayHandlerId,
        (variables) => runMutationWithIdempotency(variables as TVariables),
      ),
    [replayHandlerId, mutationFn, getIdempotencyKey],
  );

  const hasOptimisticUpdates = typeof optimisticUpdates === 'function';

  const applyOptimisticUpdates = async (
    variables: TVariables,
  ): Promise<OptimisticSnapshot[]> => {
    if (!optimisticUpdates) return [];

    const updates = optimisticUpdates(variables);
    if (!Array.isArray(updates) || updates.length === 0) return [];

    const snapshots: OptimisticSnapshot[] = [];

    for (const update of updates) {
      await queryClient.cancelQueries({ queryKey: update.queryKey });
      const previous = queryClient.getQueryData(update.queryKey);
      snapshots.push({ queryKey: update.queryKey, previous });
      queryClient.setQueryData(update.queryKey, (old: unknown) =>
        update.updater(old, variables),
      );
    }

    return snapshots;
  };

  const rollbackOptimisticUpdates = (
    snapshots: OptimisticSnapshot[] | undefined,
  ): void => {
    if (!snapshots || snapshots.length === 0) return;

    for (const snapshot of snapshots) {
      queryClient.setQueryData(snapshot.queryKey, snapshot.previous);
    }
  };

  const isLatestOptimisticMutation = (
    context: InternalMutationContext<TContext> | undefined,
  ): boolean => {
    if (!context?.optimisticEntityKey || !context.optimisticVersion)
      return true;

    const latest = latestOptimisticVersionByEntityRef.current.get(
      context.optimisticEntityKey,
    );
    return latest === context.optimisticVersion;
  };

  const finalizeOptimisticMutation = (
    context: InternalMutationContext<TContext> | undefined,
  ): void => {
    if (!context?.optimisticEntityKey || !context.optimisticVersion) return;

    const latest = latestOptimisticVersionByEntityRef.current.get(
      context.optimisticEntityKey,
    );
    if (latest === context.optimisticVersion) {
      latestOptimisticVersionByEntityRef.current.delete(
        context.optimisticEntityKey,
      );
    }
  };

  return useMutation<TData, TError, TVariables, TContext>({
    ...rest,
    onMutate: hasOptimisticUpdates
      ? async (variables: TVariables, mutationContext) => {
          const optimisticEntityKey =
            entityKey?.(variables) || `${backgroundScope}:global`;
          const optimisticVersion = ++optimisticVersionRef.current;
          latestOptimisticVersionByEntityRef.current.set(
            optimisticEntityKey,
            optimisticVersion,
          );

          const [snapshots, userContext] = await Promise.all([
            applyOptimisticUpdates(variables),
            onMutate
              ? onMutate(variables, mutationContext)
              : Promise.resolve(undefined),
          ]);

          return {
            userContext,
            optimisticSnapshots: snapshots,
            optimisticEntityKey,
            optimisticVersion,
          } as unknown as TContext;
        }
      : onMutate,
    mutationFn: (variables: TVariables) =>
      (() => {
        const idempotencyKey = getValidatedIdempotencyKey(variables);
        const variablesWithIdempotency =
          idempotencyKey && attachIdempotencyKey
            ? attachIdempotencyKey(variables, idempotencyKey)
            : variables;

        const enqueue = () =>
          backgroundMutationManager.enqueue<TData>({
            scope: backgroundScope,
            entityKey: entityKey?.(variables),
            replayHandlerId,
            variables: variablesWithIdempotency,
            run: () =>
              runMutationWithIdempotency(
                variablesWithIdempotency,
                idempotencyKey,
              ),
            maxRetries,
            retryDelayMs,
          });

        if (!idempotencyKey || !dedupePendingByIdempotencyKey) {
          return enqueue();
        }

        const dedupeKey = `bgm:${backgroundScope}:${idempotencyKey}`;
        return requestDeduper.dedupe(dedupeKey, enqueue);
      })(),
    onError: hasOptimisticUpdates
      ? (error, variables, context, mutationContext) => {
          const internal = (context ||
            {}) as unknown as InternalMutationContext<TContext>;
          if (
            rollbackOptimisticOnError &&
            isLatestOptimisticMutation(internal)
          ) {
            rollbackOptimisticUpdates(internal.optimisticSnapshots);
          }

          onError?.(
            error,
            variables,
            (internal.userContext as TContext | undefined) ?? context,
            mutationContext,
          );
        }
      : onError,
    onSuccess: hasOptimisticUpdates
      ? (data, variables, context, mutationContext) => {
          const internal = (context ||
            {}) as unknown as InternalMutationContext<TContext>;
          onSuccess?.(
            data,
            variables,
            (internal.userContext as TContext | undefined) ?? context,
            mutationContext,
          );
        }
      : onSuccess,
    onSettled: hasOptimisticUpdates
      ? (data, error, variables, context, mutationContext) => {
          const internal = (context ||
            {}) as unknown as InternalMutationContext<TContext>;
          onSettled?.(
            data,
            error,
            variables,
            (internal.userContext as TContext | undefined) ?? context,
            mutationContext,
          );
          finalizeOptimisticMutation(internal);
        }
      : onSettled,
    retry: false,
    networkMode: 'always',
  });
}
