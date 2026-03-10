import { createContext, useContext, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface ActiveServer {
  id: string;
  name: string;
  organization: string | null;
  url: string;
  cityos_country?: string | null;
  cityos_city?: string | null;
  cityos_tenant?: string | null;
  cityos_channel?: string | null;
}

interface SavedServer {
  id: string;
  name: string;
  organization: string | null;
  url: string;
  is_active: boolean;
}

interface AuthContextType {
  server: ActiveServer | null;
  isLoading: boolean;
  isConnected: boolean;
  connect: (data: { serverId?: string; url?: string; api_key?: string; name?: string; organization?: string; cityos_country?: string; cityos_city?: string; cityos_tenant?: string; cityos_channel?: string }) => Promise<ActiveServer>;
  disconnect: () => Promise<void>;
  savedServers: SavedServer[];
  savedServersLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: server, isLoading } = useQuery<ActiveServer | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: savedServers = [], isLoading: savedServersLoading } = useQuery<SavedServer[]>({
    queryKey: ["auth", "servers"],
    queryFn: async () => {
      const res = await fetch("/api/auth/servers");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const connect = async (data: { serverId?: string; url?: string; api_key?: string; name?: string; organization?: string; cityos_country?: string; cityos_city?: string; cityos_tenant?: string; cityos_channel?: string }): Promise<ActiveServer> => {
    const res = await fetch("/api/auth/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Connection failed" }));
      throw new Error(err.error || "Connection failed");
    }
    const serverData = await res.json();
    queryClient.setQueryData(["auth", "me"], serverData);
    queryClient.invalidateQueries({ queryKey: ["auth", "servers"] });
    return serverData;
  };

  const disconnect = async () => {
    try {
      await fetch("/api/auth/disconnect", { method: "POST", credentials: "include" });
    } catch {
    }
    queryClient.setQueryData(["auth", "me"], null);
    queryClient.setQueryData(["auth", "servers"], []);
    queryClient.removeQueries();
    setLocation("/auth/login");
  };

  return (
    <AuthContext.Provider value={{
      server: server ?? null,
      isLoading,
      isConnected: !!server,
      connect,
      disconnect,
      savedServers,
      savedServersLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
