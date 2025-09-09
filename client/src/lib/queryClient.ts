import { QueryClient, QueryFunction } from "@tanstack/react-query";

export interface ApiError extends Error {
  status?: number;
  statusText?: string;
  responseData?: any;
  endpoint?: string;
  method?: string;
}

async function throwIfResNotOk(res: Response, method: string, url: string) {
  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    let responseData: any = null;
    
    try {
      // Parse response based on content type
      if (contentType.includes("application/json")) {
        responseData = await res.json();
      } else {
        responseData = await res.text();
      }
    } catch (e) {
      responseData = res.statusText;
    }
    
    // Create a rich error object with details
    const error = new Error(typeof responseData === "string" ? 
      responseData : 
      (responseData?.message || res.statusText || `Request failed with status ${res.status}`)) as ApiError;
      
    error.status = res.status;
    error.statusText = res.statusText;
    error.responseData = responseData;
    error.endpoint = url;
    error.method = method;
    
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res, method, url);
  return res;
}

// Format error for display
export function formatApiError(error: unknown): {
  title: string;
  message: string;
  details?: string;
} {
  if (error instanceof Error) {
    const apiError = error as ApiError;
    
    // Format based on status code
    if (apiError.status) {
      const endpoint = apiError.endpoint ? ` (${apiError.endpoint})` : '';
      
      switch(apiError.status) {
        case 401:
          return {
            title: "Authentication Error",
            message: "You are not authenticated. Please log in again.",
            details: `${apiError.message}${endpoint}`
          };
        case 403:
          return {
            title: "Access Denied",
            message: "You don't have permission to perform this action.",
            details: `${apiError.message}${endpoint}`
          };
        case 404:
          return {
            title: "Not Found",
            message: "The requested resource was not found.",
            details: `${apiError.message}${endpoint}`
          };
        case 422:
          return {
            title: "Validation Error",
            message: "The submitted data is invalid.",
            details: `${apiError.message}${endpoint}`
          };
        case 500:
          return {
            title: "Server Error",
            message: "Something went wrong on the server. Please try again later.",
            details: `${apiError.message}${endpoint}`
          };
        default:
          return {
            title: `Error (${apiError.status})`,
            message: apiError.message,
            details: JSON.stringify(apiError.responseData, null, 2)
          };
      }
    }
    
    // Generic error
    return {
      title: "Error",
      message: error.message,
      details: error.stack
    };
  }
  
  // Unknown error
  return {
    title: "Unknown Error",
    message: "An unexpected error occurred.",
    details: error ? JSON.stringify(error, null, 2) : undefined
  };
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res, "GET", url);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
