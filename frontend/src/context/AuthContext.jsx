import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const AuthContext = createContext({
  user: null,
  login: () => {},
  logout: () => {},
  register: () => {},
  updateUser: () => {}
});

const STORAGE_KEY = 'mikromanage-active-user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Temporary bypass for testing
    return {
      id: 1,
      firstName: 'Majid',
      lastName: 'User',
      email: 'm@m.com',
      roles: [{ id: 1, name: 'Administrator' }]
    };
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

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Login failed');
      }

      const user = await response.json();
      setUser(user);
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (firstName, lastName, email, password) => {
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ firstName, lastName, email, password })
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || 'Registration failed');
      }

      const user = await response.json();
      setUser(user);
      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
  };

  const updateUser = (updater) => {
    setUser((current) => {
      if (!current) {
        return current;
      }

      if (typeof updater === 'function') {
        return updater(current);
      }

      return { ...current, ...updater };
    });
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      register,
      updateUser
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
export { AuthContext };
