import { createContext } from "react";
import type { LoginPayload, RegisterPayload, User } from "@/lib/types";

export interface UpdateProfilePayload {
  nama: string;
  email: string;
  username: string;
  password?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  updateProfile: (payload: UpdateProfilePayload) => Promise<User>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
