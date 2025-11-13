import { useState, useEffect } from 'react'

interface Notification {
  id: string
  title: string
  message: string
  timestamp: Date
  read: boolean
  type?: 'info' | 'success' | 'warning' | 'error'
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Initialize with some sample notifications
  useEffect(() => {
    const sampleNotifications: Notification[] = [
      {
        id: '1',
        title: 'Welcome to Thunderbolt',
        message: 'Your account has been successfully set up. Explore the features!',
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        read: false,
        type: 'info'
      },
      {
        id: '2',
        title: 'Job Assigned',
        message: 'You have been assigned to "Metering and Stop Button" job.',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        read: false,
        type: 'success'
      },
      {
        id: '3',
        title: 'Equipment Expiring Soon',
        message: 'Multimeter Pro 5000 (TE-2024-001) expires in 15 days.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        read: true,
        type: 'warning'
      },
      {
        id: '4',
        title: 'System Update',
        message: 'New features available. Check the admin area for branding options.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        read: true,
        type: 'info'
      }
    ]

    setNotifications(sampleNotifications)
  }, [])

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    )
  }

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date()
    }
    setNotifications(prev => [newNotification, ...prev])
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  return {
    notifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification
  }
}
