import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const AuthContext = createContext({
  user: null,
  login: () => {},
  logout: () => {},
  updateUser: () => {}
});

const STORAGE_KEY = 'mikromanage-active-user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      if (typeof window === 'undefined') {
        return null;
      }

      const serialized = window.localStorage.getItem(STORAGE_KEY);
      return serialized ? JSON.parse(serialized) : null;
    } catch (error) {
      console.warn('Unable to load stored session', error);
      return null;
    }
  });

  const refreshedUsersRef = useRef(new Set());

  useEffect(() => {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      if (user) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Unable to persist session', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    if (refreshedUsersRef.current.has(user.id)) {
      return;
    }

    const controller = new AbortController();
    let isMounted = true;

    const refreshUser = async () => {
      try {
        const response = await fetch(`/api/users/${user.id}`, { signal: controller.signal });

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        if (!payload?.user) {
          return;
        }

        if (!isMounted) {
          return;
        }

        setUser((current) => {
          if (!current || current.id !== user.id) {
            return current;
          }

          return { ...current, ...payload.user };
        });

        refreshedUsersRef.current.add(user.id);
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        console.warn('Unable to refresh user record', error);
      }
    };

    refreshUser();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [user?.id]);

  const value = useMemo(
    () => ({
      user,
      login: (nextUser) => setUser(nextUser),
      logout: () => setUser(null),
      updateUser: (updater) =>
        setUser((current) => {
          if (!current) {
            return current;
          }

          if (typeof updater === 'function') {
            return updater(current);
          }

          return { ...current, ...updater };
        })
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
