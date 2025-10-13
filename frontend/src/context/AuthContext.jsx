import { createContext, useContext, useEffect, useMemo, useState } from 'react';

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
