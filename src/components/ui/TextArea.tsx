import React from 'react'
import { usePlaceholderFill } from '../../hooks/usePlaceholderFill'
import PlaceholderFillButton from './PlaceholderFillButton'

interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  hint?: string
  enablePlaceholderFill?: boolean
}

const TextArea: React.FC<TextAreaProps> = ({
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
  const inputId = id || `textarea-${label.toLowerCase().replace(/\s+/g, '-')}`

  const { handleFillPlaceholder, hasPlaceholder } = usePlaceholderFill({
    placeholder,
    onValueChange: (newValue) => {
      // Create a synthetic event to maintain compatibility
      const syntheticEvent = {
        target: { value: newValue, name: props.name }
      } as React.ChangeEvent<HTMLTextAreaElement>
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
        <textarea
          id={inputId}
          className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none ${
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

export default TextArea

