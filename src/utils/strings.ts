/**
 * Parses comma-separated tags string into an array
 * @param tagsString - Comma-separated string
 * @returns Array of trimmed, non-empty tags
 */
export const parseTags = (tagsString: string): string[] => {
  return tagsString
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
}

