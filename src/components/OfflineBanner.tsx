import React, { useEffect, useState } from 'react'

const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) {
    return null
  }

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 py-2">
      <div className="flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1 text-sm font-medium text-amber-800 shadow">
        <svg
          className="h-4 w-4 text-amber-600"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l6.518 11.604c.73 1.3-.206 2.897-1.742 2.897H3.481c-1.536 0-2.472-1.598-1.741-2.897L8.257 3.1zM11 15a1 1 0 10-2 0 1 1 0 002 0zm-1-2a.75.75 0 01-.75-.75V8a.75.75 0 011.5 0v4.25A.75.75 0 0110 13z"
            clipRule="evenodd"
          />
        </svg>
        <span>You&apos;re offline. Changes will sync once you reconnect.</span>
      </div>
    </div>
  )
}

export default OfflineBanner

