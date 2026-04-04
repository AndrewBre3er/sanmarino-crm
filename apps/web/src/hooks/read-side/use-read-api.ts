"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiEnvelopeMeta, ApiSuccessEnvelope, ReadEntityQuery } from "../../types/read-api";

interface QueryStateBase {
  isLoading: boolean;
  errorMessage?: string | undefined;
  meta?: ApiEnvelopeMeta | undefined;
}

export interface ReadCollectionState<TItem> extends QueryStateBase {
  items: TItem[];
  isEmpty: boolean;
  reload: () => void;
}

export interface ReadDetailState<TDetail> extends QueryStateBase {
  item?: TDetail | undefined;
  reload: () => void;
}

function normalize_error_message(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Read-side request failed.";
}

export function use_read_collection<TItem>(
  fetch_collection: (query: ReadEntityQuery) => Promise<ApiSuccessEnvelope<TItem[]>>,
  query: ReadEntityQuery
): ReadCollectionState<TItem> {
  const [items, setItems] = useState<TItem[]>([]);
  const [meta, setMeta] = useState<ApiEnvelopeMeta | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [requestVersion, setRequestVersion] = useState<number>(0);

  const stable_query_key = useMemo(() => JSON.stringify(query), [query]);

  useEffect(() => {
    let is_cancelled = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(undefined);

      try {
        const envelope = await fetch_collection(query);
        if (is_cancelled) {
          return;
        }

        setItems(envelope.data ?? []);
        setMeta(envelope.meta);
      } catch (error) {
        if (is_cancelled) {
          return;
        }

        setItems([]);
        setMeta(undefined);
        setErrorMessage(normalize_error_message(error));
      } finally {
        if (!is_cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      is_cancelled = true;
    };
  }, [fetch_collection, query, stable_query_key, requestVersion]);

  const reload = useCallback(() => {
    setRequestVersion(current => current + 1);
  }, []);

  return {
    items,
    meta,
    isLoading,
    ...(errorMessage ? { errorMessage } : {}),
    isEmpty: !isLoading && !errorMessage && items.length === 0,
    reload
  };
}

export function use_read_detail<TDetail>(
  fetch_detail: (entity_id: string) => Promise<ApiSuccessEnvelope<TDetail>>,
  entity_id?: string
): ReadDetailState<TDetail> {
  const [item, setItem] = useState<TDetail | undefined>(undefined);
  const [meta, setMeta] = useState<ApiEnvelopeMeta | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [requestVersion, setRequestVersion] = useState<number>(0);

  useEffect(() => {
    if (!entity_id) {
      setItem(undefined);
      setMeta(undefined);
      setIsLoading(false);
      setErrorMessage(undefined);
      return;
    }

    let is_cancelled = false;

    const active_id = entity_id;

    async function load() {
      setIsLoading(true);
      setErrorMessage(undefined);

      try {
        const envelope = await fetch_detail(active_id);
        if (is_cancelled) {
          return;
        }

        setItem(envelope.data);
        setMeta(envelope.meta);
      } catch (error) {
        if (is_cancelled) {
          return;
        }

        setItem(undefined);
        setMeta(undefined);
        setErrorMessage(normalize_error_message(error));
      } finally {
        if (!is_cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      is_cancelled = true;
    };
  }, [entity_id, fetch_detail, requestVersion]);

  const reload = useCallback(() => {
    setRequestVersion(current => current + 1);
  }, []);

  return {
    ...(item ? { item } : {}),
    meta,
    isLoading,
    ...(errorMessage ? { errorMessage } : {}),
    reload
  };
}
