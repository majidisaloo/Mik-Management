import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const UpdateContext = createContext();

export const useUpdate = () => {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useUpdate must be used within an UpdateProvider');
  }
  return context;
};

export const UpdateProvider = ({ children }) => {
  const [updateInfo, setUpdateInfo] = useState({
    currentVersion: null, // Will be loaded from API
    updateAvailable: false,
    channel: 'latest'
  });
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(true);
  const [checkInterval, setCheckInterval] = useState(300); // 5 minutes default
  const [lastCheckTime, setLastCheckTime] = useState(null);
  const [updateNotification, setUpdateNotification] = useState(null);

  // Auto-check for updates
  const autoCheckForUpdates = useCallback(async () => {
    if (!autoCheckEnabled) return;

    try {
      console.log(`=== Frontend Update Check ===`);
      console.log(`Auto-check enabled: ${autoCheckEnabled}`);
      
      const response = await fetch('/api/check-updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('Update check response:', data);
      
      if (response.ok) {
        const previousUpdateAvailable = updateInfo?.updateAvailable;
        setUpdateInfo(data);
        setLastCheckTime(new Date().toISOString());
        
        // Show notification if new update becomes available
        if (data.updateAvailable && !previousUpdateAvailable) {
          setUpdateNotification({
            type: 'success',
            message: `🆕 New update available: ${data.latestVersion}`,
            timestamp: new Date().toISOString()
          });
          
          // Auto-dismiss notification after 10 seconds
          setTimeout(() => {
            setUpdateNotification(null);
          }, 10000);
        }
      }
    } catch (error) {
      // Silent fail for auto-check
      console.log('Auto-update check failed:', error);
    }
  }, [autoCheckEnabled, updateInfo?.updateAvailable]);

  // Set up auto-check interval
  useEffect(() => {
    if (!autoCheckEnabled) return;

    // Initial check
    autoCheckForUpdates();

    // Set up interval
    const interval = setInterval(autoCheckForUpdates, checkInterval * 1000);

    return () => clearInterval(interval);
  }, [autoCheckEnabled, checkInterval, autoCheckForUpdates]);

  // Load settings from localStorage
  useEffect(() => {
    const savedAutoCheck = localStorage.getItem('autoCheckEnabled');
    const savedInterval = localStorage.getItem('checkInterval');

    if (savedAutoCheck !== null) setAutoCheckEnabled(savedAutoCheck === 'true');
    if (savedInterval) setCheckInterval(Number(savedInterval));
  }, []);

  // Initial version load on startup
  useEffect(() => {
    const loadInitialVersion = async () => {
      try {
        console.log('Loading initial version');
        const response = await fetch('/api/check-updates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        console.log('Initial version API response:', data);
        
        if (response.ok) {
          setUpdateInfo(data);
          console.log('Initial version loaded:', data.currentVersion);
        } else {
          console.error('Failed to load initial version:', data);
        }
      } catch (error) {
        console.error('Failed to load initial version:', error);
      }
    };

    // Load immediately on mount
    loadInitialVersion();
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('autoCheckEnabled', autoCheckEnabled.toString());
    localStorage.setItem('checkInterval', checkInterval.toString());
  }, [autoCheckEnabled, checkInterval]);

  const value = {
    updateInfo,
    setUpdateInfo,
    autoCheckEnabled,
    setAutoCheckEnabled,
    checkInterval,
    setCheckInterval,
    lastCheckTime,
    updateNotification,
    setUpdateNotification,
    autoCheckForUpdates
  };

  return (
    <UpdateContext.Provider value={value}>
      {children}
    </UpdateContext.Provider>
  );
};
