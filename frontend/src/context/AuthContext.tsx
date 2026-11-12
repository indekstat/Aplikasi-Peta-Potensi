"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface DesaProfil {
  iddesa: string;
  nama_desa: string;
  nama_kec: string;
  nama_kab: string;
  nama_prov: string;
}

interface UserProfile {
  asal_provinsi: string;
  asal_kokab: string;
  phone_number: string;
  // Sesi lama (sebelum akun koperasi ada) tidak punya field ini: dianggap akun daerah.
  account_type?: "daerah" | "koperasi";
  desa?: DesaProfil | null;
}

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser?: boolean;
  profile: UserProfile;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const isKoperasi = (user: User | null) => user?.profile?.account_type === "koperasi";

/** Halaman yang boleh dibuka akun koperasi desa. */
export const HOME_KOPERASI = "/dashboard/komoditas-desa";
export const MENU_KOPERASI = [HOME_KOPERASI, "/dashboard/mapping-bisnis-model", "/dashboard/profil"];

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("access_token");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      // If no token and trying to access protected route
      if (pathname !== "/login" && pathname !== "/register") {
        router.push("/login");
      }
    }
    setLoading(false);
  }, [pathname, router]);

  const login = (token: string, userData: User) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    router.push(isKoperasi(userData) ? HOME_KOPERASI : "/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
