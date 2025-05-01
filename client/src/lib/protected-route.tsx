import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import AppShell from "@/components/layout/app-shell";
import React from "react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  // Add debug logs to help us understand what's happening
  React.useEffect(() => {
    console.log("ProtectedRoute for path:", path);
    console.log("ProtectedRoute - user:", user);
    console.log("ProtectedRoute - isLoading:", isLoading);
  }, [path, user, isLoading]);

  if (isLoading) {
    console.log("ProtectedRoute - Showing loading state for path:", path);
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    console.log("ProtectedRoute - Redirecting to /auth from path:", path);
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  console.log("ProtectedRoute - Rendering component for path:", path);
  return (
    <Route path={path}>
      <AppShell>
        <Component />
      </AppShell>
    </Route>
  );
}
