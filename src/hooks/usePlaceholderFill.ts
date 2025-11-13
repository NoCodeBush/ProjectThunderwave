
interface UsePlaceholderFillOptions {
  placeholder?: string
  onValueChange?: (value: string) => void
}

export const usePlaceholderFill = (options: UsePlaceholderFillOptions = {}) => {
  const { placeholder, onValueChange } = options

  const handleFillPlaceholder = () => {
    if (placeholder && onValueChange) {
      onValueChange(placeholder)
    }
  }

  const hasPlaceholder = Boolean(placeholder && placeholder.trim())

  return {
    handleFillPlaceholder,
    hasPlaceholder,
    placeholder
  }
}
