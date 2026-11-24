import { useCallback, useEffect, useState } from 'react';
import { getTodayDateString } from '../data/wordThemes';

export type NotificationPermissionState =
  | 'default'
  | 'granted'
  | 'denied'
  | 'unsupported';

const LAST_NOTIFIED_KEY = 'lexiloom_last_notified_date_v1';

export function useNotifications(
  enabled: boolean,
  reminderTime: string,
  lastDailyDate: string
) {
  const [permission, setPermission] = useState<NotificationPermissionState>(
    () => {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'unsupported';
      }
      return Notification.permission as NotificationPermissionState;
    }
  );

  const sendBrowserNotification = useCallback(
    async (title: string, body: string): Promise<boolean> => {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        return false;
      }
      if (Notification.permission !== 'granted') {
        return false;
      }

      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration && 'showNotification' in registration) {
            await registration.showNotification(title, {
              body,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag: 'lexiloom-daily-reminder',
            });
            return true;
          }
        }
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
        });
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const requestPermission = useCallback(async (): Promise<NotificationPermissionState> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return 'unsupported';
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);
      return result as NotificationPermissionState;
    } catch {
      return permission;
    }
  }, [permission]);

  // Scheduled check while app is active to fire the daily challenge reminder once per day
  useEffect(() => {
    if (!enabled || permission !== 'granted') return;

    const checkSchedule = () => {
      const today = getTodayDateString();
      if (lastDailyDate === today) return;

      const lastNotified = localStorage.getItem(LAST_NOTIFIED_KEY);
      if (lastNotified === today) return;

      const [targetHour, targetMinute] = reminderTime.split(':').map(Number);
      if (!Number.isFinite(targetHour) || !Number.isFinite(targetMinute)) return;

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const targetMinutes = targetHour * 60 + targetMinute;

      if (currentMinutes >= targetMinutes) {
        localStorage.setItem(LAST_NOTIFIED_KEY, today);
        void sendBrowserNotification(
          'Your Daily LexiLoom Challenge Is Ready',
          'Keep your streak alive with today’s curated word grid.'
        );
      }
    };

    checkSchedule();
    const timer = window.setInterval(checkSchedule, 60000);
    return () => window.clearInterval(timer);
  }, [enabled, permission, reminderTime, lastDailyDate, sendBrowserNotification]);

  const sendTestReminder = useCallback(async (): Promise<{
    sent: boolean;
    message: string;
  }> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return {
        sent: false,
        message: 'Browser notifications are not supported on this device.',
      };
    }

    let currentPerm = Notification.permission as NotificationPermissionState;
    if (currentPerm === 'default') {
      currentPerm = await requestPermission();
    }

    if (currentPerm !== 'granted') {
      return {
        sent: false,
        message:
          'Notifications are blocked in your browser settings. Enable them to receive daily reminders.',
      };
    }

    const ok = await sendBrowserNotification(
      'LexiLoom Daily Challenge Reminder',
      'Today’s smart word puzzle is waiting. Solve it to extend your streak!'
    );

    return ok
      ? {
          sent: true,
          message: 'Reminder notification delivered to your device.',
        }
      : {
          sent: false,
          message: 'Could not display notification in this browser context.',
        };
  }, [requestPermission, sendBrowserNotification]);

  return {
    permission,
    requestPermission,
    sendTestReminder,
  };
}
