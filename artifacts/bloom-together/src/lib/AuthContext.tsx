import { createContext } from "react";
import { User, setAuthTokenGetter } from "@workspace/api-client-react";

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Read from localStorage on every request — always up to date, no timing issues
setAuthTokenGetter(() => localStorage.getItem("token"));
