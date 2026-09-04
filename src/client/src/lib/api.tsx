import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: string;
  nim: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  campus: string;
  faculty: string;
  major: string;
  degree: string;
  shift: string;
  semester: number;
  avatarSeed: string;
  headline?: string;
  bioMd?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  websiteUrl?: string;
  resumeUrl?: string;
  createdAt: string;
}

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include",
    });

    const json = await res.json();
    if (!res.ok) {
      return { error: json.error || "An error occurred" };
    }
    return { data: json };
  } catch (err: any) {
    return { error: err.message || "Network error" };
  }
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  needsSemesterUpdate: boolean;
  unreadCount: number;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  needsSemesterUpdate: false,
  unreadCount: 0,
  refreshUser: async () => {},
  logout: async () => {},
  setUnreadCount: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSemesterUpdate, setNeedsSemesterUpdate] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUser = async () => {
    try {
      const { data } = await fetchApi<{
        user: User | null;
        needsSemesterUpdate?: boolean;
      }>("/api/auth/me");
      if (data?.user) {
        setUser(data.user);
        setNeedsSemesterUpdate(Boolean(data.needsSemesterUpdate));
        loadUnreadCount();
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    const { data } = await fetchApi<{ unreadCount: number }>(
      "/api/notifications",
    );
    if (data) {
      setUnreadCount(data.unreadCount);
    }
  };

  const logout = async () => {
    await fetchApi("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        needsSemesterUpdate,
        unreadCount,
        refreshUser,
        logout,
        setUnreadCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export interface SystemSettings {
  helpDocsUrl: string;
  supportEmail: string;
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    helpDocsUrl:
      "mailto:connect@mercubuana.ac.id?subject=UMBC%20Inquiry%20-%20Help%20%26%20Docs",
    supportEmail: "connect@mercubuana.ac.id",
  });

  useEffect(() => {
    fetchApi<SystemSettings>("/api/settings").then(({ data }) => {
      if (data) {
        setSettings({
          helpDocsUrl:
            data.helpDocsUrl ||
            "mailto:connect@mercubuana.ac.id?subject=UMBC%20Inquiry%20-%20Help%20%26%20Docs",
          supportEmail: data.supportEmail || "connect@mercubuana.ac.id",
        });
      }
    });
  }, []);

  return settings;
}
