import React, { createContext, useContext, useState } from 'react';
import { AppUser, Restaurant, store, UserRole } from '../data/store';

export type AuthUser = {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  email: string;
  role: UserRole;
  jobTitle: string;
  restaurantId: string;
  avatarColor: string;
};

type AuthContextType = {
  user: AuthUser | null;
  restaurant: Restaurant | null;
  isAuthenticated: boolean;
  isOwner: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  joinWithCode: (code: string, data: { firstName: string; lastName: string; email: string; password: string }) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAuthUser(u: AppUser): AuthUser {
  return {
    id: u.id,
    name: u.name,
    firstName: u.firstName,
    initials: u.initials,
    email: u.email,
    role: u.role,
    jobTitle: u.jobTitle,
    restaurantId: u.restaurantId,
    avatarColor: u.avatarColor,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!email.trim() || !password.trim()) return false;
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    const result = store.login(email, password);
    setIsLoading(false);
    if (!result) return false;
    setUser(toAuthUser(result.user));
    setRestaurant(result.restaurant);
    return true;
  };

  const joinWithCode = async (
    code: string,
    data: { firstName: string; lastName: string; email: string; password: string }
  ): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    const result = store.acceptInvitation(code, data);
    setIsLoading(false);
    if (!result) return false;
    setUser(toAuthUser(result.user));
    setRestaurant(result.restaurant);
    return true;
  };

  const logout = () => {
    setUser(null);
    setRestaurant(null);
  };

  const isOwner = user?.role === 'owner';

  return (
    <AuthContext.Provider
      value={{ user, restaurant, isAuthenticated: !!user, isOwner, isLoading, login, joinWithCode, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
