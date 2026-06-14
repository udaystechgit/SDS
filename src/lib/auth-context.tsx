import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { normalizeRole, type AppRole } from "@/lib/auth-roles";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refreshSession(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readRoleFromUser(user: User | null): AppRole | null {
  if (!user) {
    return null;
  }

  return normalizeRole(
    user.app_metadata?.role ??
    user.user_metadata?.role
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback((nextSession: Session | null) => {
    const nextUser = nextSession?.user ?? null;

    setSession(nextSession);
    setUser(nextUser);
    setRole(readRoleFromUser(nextUser));
  }, []);

  const refreshSession = useCallback(async () => {
    if (!supabase) {
      applySession(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      applySession(null);
      setIsLoading(false);
      throw error;
    }

    applySession(data.session);
    setIsLoading(false);
  }, [applySession, supabase]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      applySession(data.session);
    },
    [applySession, supabase],
  );

  const logout = useCallback(async () => {
    if (!supabase) {
      applySession(null);
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    applySession(null);
  }, [applySession, supabase]);

  useEffect(() => {
    let mounted = true;

    if (!supabase) {
      applySession(null);
      setIsLoading(false);
      return undefined;
    }

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (error) {
        applySession(null);
        setIsLoading(false);
        return;
      }

      applySession(data.session);
      setIsLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) {
        return;
      }

      applySession(nextSession);
      setIsLoading(false);
    });

    void loadSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession, supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      role,
      isLoading,
      isAuthenticated: Boolean(session?.user),
      login,
      logout,
      refreshSession,
    }),
    [isLoading, login, logout, refreshSession, role, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return value;
}
