import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AppUser {
  docId: string;       // Firestore document ID in "users" collection
  userId: string;      // custom userId field (used in shifts)
  name: string;
  email: string;
  phone?: string;
  role?: string;
  agencyName?: string;
  avatar?: string;
}

interface AppContextType {
  user: AppUser | null;
  setUser: (u: AppUser | null) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AppUser | null>(() => {
    try {
      const stored = localStorage.getItem('mobileAppUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setUser = (u: AppUser | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem('mobileAppUser', JSON.stringify(u));
    } else {
      localStorage.removeItem('mobileAppUser');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mobileAppUser');
  };

  return (
    <AppContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
