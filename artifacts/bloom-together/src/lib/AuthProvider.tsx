import { useEffect, useState } from "react";
import { useGetMe, getGetMeQueryKey, User, logout as apiLogout } from "@workspace/api-client-react";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(null);

  const { data: me, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: [...getGetMeQueryKey(), token ?? ""],
    },
  });

  useEffect(() => {
    if (me) setUser(me);
  }, [me]);

  useEffect(() => {
    if (error) {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    }
  }, [error]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
