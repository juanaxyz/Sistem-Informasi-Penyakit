import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { LoginPayload, RegisterPayload, User } from "@/lib/types";
import { AuthContext } from "./auth-context-base";
import type { UpdateProfilePayload } from "./auth-context-base";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return typeof window !== "undefined" ? localStorage.getItem("token") : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.auth.me();
        setUser(res.user);
      } catch {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [token]);

const login = async (payload: LoginPayload): Promise<User> => {
    const res = await api.auth.login(payload);
    localStorage.setItem("token", res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (payload: RegisterPayload) => {
    const res = await api.auth.register(payload);
    localStorage.setItem("token", res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    api.auth.logout().catch(() => {});
  };

  const updateProfile = async (payload: UpdateProfilePayload) => {
    const res = await api.auth.updateProfile(payload);
    setUser(res.user);
    return res.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
