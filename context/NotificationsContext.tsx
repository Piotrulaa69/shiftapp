import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export type AppNotification = {
  id: string;
  type: 'shift' | 'task' | 'leave' | 'swap' | 'message' | 'system';
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  reference_id?: string;
};

type NotificationsContextType = {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  markUnread: (id: string) => void;
  deleteNotification: (id: string) => void;
  restoreNotification: (n: AppNotification) => void;
  refresh: () => void;
};

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  markRead: () => {},
  markUnread: () => {},
  deleteNotification: () => {},
  restoreNotification: () => {},
  refresh: () => {},
});

function generateMockNotifications(): AppNotification[] {
  const now = new Date();
  return [
    { id: '1', type: 'shift', title: 'Nowa zmiana', body: 'Zaplanowano zmianę na jutro 08:00–16:00', read: false, created_at: new Date(now.getTime() - 30 * 60000).toISOString() },
    { id: '2', type: 'task', title: 'Zadanie przydzielone', body: 'Sprawdź nowe zadanie: Uzupełnij magazyn', read: false, created_at: new Date(now.getTime() - 2 * 3600000).toISOString() },
    { id: '3', type: 'leave', title: 'Urlop zatwierdzony', body: 'Twój wniosek urlopowy 15–20 czerwca został zatwierdzony', read: true, created_at: new Date(now.getTime() - 24 * 3600000).toISOString() },
    { id: '4', type: 'message', title: 'Nowa wiadomość', body: 'Anna K. wysłała Ci wiadomość', read: true, created_at: new Date(now.getTime() - 48 * 3600000).toISOString() },
    { id: '5', type: 'system', title: 'Witaj w ShiftApp!', body: 'Twoje konto zostało pomyślnie skonfigurowane.', read: true, created_at: new Date(now.getTime() - 72 * 3600000).toISOString() },
  ];
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const loaded = useRef(false);

  const load = useCallback(() => {
    setNotifications(generateMockNotifications());
  }, []);

  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      load();
    }
  }, [load]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markUnread = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: false } : n));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const restoreNotification = useCallback((n: AppNotification) => {
    setNotifications((prev) => {
      if (prev.find((x) => x.id === n.id)) return prev;
      return [n, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAllRead, markRead, markUnread, deleteNotification, restoreNotification, refresh: load }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
