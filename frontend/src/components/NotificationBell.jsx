/* Requires: npm install react-leaflet leaflet */
/* Add to index.html or main entry: import 'leaflet/dist/leaflet.css'; */

import { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import api from '../api/axios';
import { useRealtimeSync } from '../api/realtime';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !(n.is_read ?? n.read)).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data?.data || res.data?.notifications || []);
    } catch {
      /* silently ignore */
    }
  }, []);

  useRealtimeSync({
    tables: ['notifications'],
    onChange: fetchNotifications,
  });

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  async function markAllRead() {
    try {
      await api.post('/notifications/read-all');
      await fetchNotifications();
    } catch {
      /* The server remains the source of truth. */
    }
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span key={unreadCount} className="cc-dot-in absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="cc-drop absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900">Notifications</h4>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">
                  No notifications yet
                </div>
              ) : (
                notifications.slice(0, 5).map((n, i) => (
                  <div
                    key={n.id || i}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${
                      !(n.is_read ?? n.read) ? 'bg-indigo-50/40' : ''
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {n.title || 'Notification'}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {n.message || n.body}
                      </p>
                      <span className="text-[11px] text-gray-400 mt-1 block">
                        {timeAgo(n.created_at || n.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-gray-100 px-4 py-2.5">
              <a
                href="/notifications"
                className="block text-center text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                View all
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
