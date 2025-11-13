import React from 'react'
import { usePlaceholderFill } from '../../hooks/usePlaceholderFill'
import PlaceholderFillButton from './PlaceholderFillButton'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  enablePlaceholderFill?: boolean
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  id,
  className = '',
  required,
  enablePlaceholderFill = false,
  onChange,
  placeholder,
  value,
  ...props
}) => {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`

  const { handleFillPlaceholder, hasPlaceholder } = usePlaceholderFill({
    placeholder,
    onValueChange: (newValue) => {
      // Create a synthetic event to maintain compatibility
      const syntheticEvent = {
        target: { value: newValue, name: props.name }
      } as React.ChangeEvent<HTMLInputElement>
      onChange?.(syntheticEvent)
    }
  })

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          id={inputId}
          className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
            error ? 'border-red-300' : 'border-gray-300'
          } ${className}`}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          {...props}
        />
        {enablePlaceholderFill && hasPlaceholder && (
          <PlaceholderFillButton onClick={handleFillPlaceholder} />
        )}
      </div>
      {hint && !error && (
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default Input

