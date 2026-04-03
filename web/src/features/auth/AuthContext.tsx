import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { clearToken, getToken, parseTokenPayload, setToken as persistToken } from "../../auth";

type AuthContextValue = {
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getToken());

  const value = useMemo<AuthContextValue>(
    () => {
      const role = parseTokenPayload(token)?.role?.toLowerCase() ?? null;
      return {
        token,
        role,
        isAuthenticated: Boolean(token),
        login(nextToken: string) {
          persistToken(nextToken);
          setToken(nextToken);
        },
        logout() {
          clearToken();
          setToken(null);
        }
      };
    },
    [token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
