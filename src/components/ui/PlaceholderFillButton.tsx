import React from 'react'

interface PlaceholderFillButtonProps {
  onClick: () => void
  className?: string
  title?: string
}

const PlaceholderFillButton: React.FC<PlaceholderFillButtonProps> = ({
  onClick,
  className = '',
  title = 'Use placeholder value'
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors ${className}`}
      aria-label={title}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    </button>
  )
}

export default PlaceholderFillButton
