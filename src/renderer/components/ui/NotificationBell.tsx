/**
 * NotificationBell Component
 *
 * Displays a notification bell icon with an unread count badge and a dropdown
 * menu for viewing and managing notifications.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useNotifications, Notification } from '../../hooks/useNotifications';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
    dismissAll,
  } = useNotifications({ limit: 10 });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate to action URL if available
    if (notification.action_url) {
      setIsOpen(false);
      navigate(notification.action_url);
    }
  };

  const handleDismiss = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    dismiss(notificationId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-50 border-l-4 border-red-500';
      case 'urgent':
        return 'bg-orange-50 border-l-4 border-orange-500';
      case 'high':
        return 'bg-yellow-50 border-l-4 border-yellow-500';
      case 'normal':
        return 'bg-blue-50 border-l-4 border-blue-500';
      case 'low':
        return 'bg-gray-50 border-l-4 border-gray-500';
      default:
        return 'bg-gray-50 border-l-4 border-gray-300';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <h3 className="text-sm font-semibold text-gray-900">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  title="Mark all as read"
                >
                  <Eye size={16} />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => dismissAll()}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                  title="Dismiss all"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    } ${getPriorityColor(notification.priority)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDismiss(e, notification.id)}
                        className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {notification.action_label && (
                      <div className="mt-2">
                        <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                          {notification.action_label} →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
