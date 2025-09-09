import { useState, useEffect } from 'react';
import { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { formatApiError } from '@/lib/queryClient';
import { ErrorSeverity } from '@/components/ui/error-message';

interface QueryErrorInfo {
  title: string;
  message: string;
  details?: string;
  severity: ErrorSeverity;
}

/**
 * Hook for handling query and mutation errors uniformly across the application
 */
export function useQueryError<TData = unknown, TError = unknown>(
  queryResult: UseQueryResult<TData, TError> | null,
  options?: {
    defaultTitle?: string;
    defaultMessage?: string;
    severity?: ErrorSeverity;
    onError?: (error: TError) => void;
  }
): {
  error: QueryErrorInfo | null;
  clearError: () => void;
} {
  const [error, setError] = useState<QueryErrorInfo | null>(null);
  const { defaultTitle, defaultMessage, severity = 'error', onError } = options || {};

  useEffect(() => {
    if (queryResult?.error) {
      const formattedError = formatApiError(queryResult.error);
      setError({
        title: formattedError.title || defaultTitle || 'Error',
        message: formattedError.message || defaultMessage || 'An error occurred',
        details: formattedError.details,
        severity,
      });

      if (onError) {
        onError(queryResult.error);
      }
    } else {
      setError(null);
    }
  }, [queryResult?.error, defaultTitle, defaultMessage, severity, onError]);

  const clearError = () => setError(null);

  return { error, clearError };
}

/**
 * Hook for handling mutation errors uniformly across the application
 */
export function useMutationError<TData = unknown, TError = unknown, TVariables = unknown>(
  mutationResult: UseMutationResult<TData, TError, TVariables, any> | null,
  options?: {
    defaultTitle?: string;
    defaultMessage?: string;
    severity?: ErrorSeverity;
    onError?: (error: TError) => void;
  }
): {
  error: QueryErrorInfo | null;
  clearError: () => void;
} {
  const [error, setError] = useState<QueryErrorInfo | null>(null);
  const { defaultTitle, defaultMessage, severity = 'error', onError } = options || {};

  useEffect(() => {
    if (mutationResult?.error) {
      const formattedError = formatApiError(mutationResult.error);
      setError({
        title: formattedError.title || defaultTitle || 'Error',
        message: formattedError.message || defaultMessage || 'An error occurred',
        details: formattedError.details,
        severity,
      });

      if (onError) {
        onError(mutationResult.error);
      }
    } else {
      setError(null);
    }
  }, [mutationResult?.error, defaultTitle, defaultMessage, severity, onError]);

  const clearError = () => setError(null);

  return { error, clearError };
}