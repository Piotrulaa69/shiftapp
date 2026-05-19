import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { deleteNotifDb, getNotifications, markAllNotifsRead, markNotifRead, markNotifUnread } from '../lib/db';
import { supabase } from '../lib/supabase';

export type AppNotification = {
  id: string;
  type: 'shift' | 'task' | 'leave' | 'swap' | 'absence' | 'system';
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

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(async (uid: string) => {
    const data = await getNotifications(uid);
    setNotifications(data as AppNotification[]);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) load(uid);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) load(uid);
      else setNotifications([]);
    });

    return () => { listener.subscription.unsubscribe(); };
  }, [load]);

  useEffect(() => {
    if (!userId) return;

    channelRef.current = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        setNotifications((prev) => [payload.new as AppNotification, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        setNotifications((prev) => prev.map((n) => n.id === payload.new.id ? { ...n, ...payload.new } as AppNotification : n));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [userId]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    markNotifRead(id);
  }, []);

  const markUnread = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: false } : n));
    markNotifUnread(id);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (userId) markAllNotifsRead(userId);
  }, [userId]);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    deleteNotifDb(id);
  }, []);

  const restoreNotification = useCallback((n: AppNotification) => {
    setNotifications((prev) => {
      if (prev.find((x) => x.id === n.id)) return prev;
      return [n, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
  }, []);

  const refresh = useCallback(() => {
    if (userId) load(userId);
  }, [userId, load]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAllRead, markRead, markUnread, deleteNotification, restoreNotification, refresh }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
