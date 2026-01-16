import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { MESSAGES, ROUTES } from '../constants'
import Button from './ui/Button'
import NotificationTray from './ui/NotificationTray'
import JobList from './JobList'
import Schedule from './Schedule'
import { useNotifications } from '../hooks/useNotifications'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { notifications, markAsRead, markAllAsRead } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'jobs' | 'schedule'>('jobs')

  const handleLogout = async () => {
    try {
      setLoading(true)
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-area-inset">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                {activeTab === 'jobs' ? 'My Jobs' : 'Schedule'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <NotificationTray
                notifications={notifications}
                onNotificationClick={(notification) => markAsRead(notification.id)}
                onMarkAllRead={markAllAsRead}
              />
              <button
                onClick={() => navigate(ROUTES.ADMIN)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Admin area"
                title="Admin area"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLogout}
                disabled={loading}
              >
                {loading ? MESSAGES.SIGNING_OUT : MESSAGES.SIGN_OUT}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        {activeTab === 'jobs' && <JobList />}
        {activeTab === 'schedule' && <Schedule />}
      </main>

      {/* iOS-style Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 safe-area-inset-bottom">
        <div className="flex items-center justify-around py-2 px-4">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`
              flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-all duration-200 min-w-0 flex-1
              ${activeTab === 'jobs'
                ? 'text-primary-600'
                : 'text-gray-600'
              }
            `}
          >
            <svg
              className={`w-6 h-6 mb-1 transition-colors ${
                activeTab === 'jobs' ? 'text-primary-600' : 'text-gray-600'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className={`text-xs font-medium transition-colors ${
              activeTab === 'jobs' ? 'text-primary-600' : 'text-gray-600'
            }`}>
              Jobs
            </span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`
              flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-all duration-200 min-w-0 flex-1
              ${activeTab === 'schedule'
                ? 'text-primary-600'
                : 'text-gray-600'
              }
            `}
          >
            <svg
              className={`w-6 h-6 mb-1 transition-colors ${
                activeTab === 'schedule' ? 'text-primary-600' : 'text-gray-600'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className={`text-xs font-medium transition-colors ${
              activeTab === 'schedule' ? 'text-primary-600' : 'text-gray-600'
            }`}>
              Schedule
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

