import { useAuthStore } from "@/stores/authStore";

export function useAuth() {
  const { user, isAuthenticated, setUser, logout } = useAuthStore();

  return { user, isAuthenticated, setUser, logout };
}
