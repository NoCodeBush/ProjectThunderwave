import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Storage helper functions
export const uploadJobImage = async (jobId: string, file: File, filename?: string) => {
  const fileExt = file.name.split('.').pop()
  const fileName = filename || `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
  // Store path relative to bucket (without bucket name prefix)
  const filePath = `${jobId}/${fileName}`

  console.log('Uploading to bucket "job-images" at path:', filePath)

  const { error } = await supabase.storage
    .from('job-images')
    .upload(filePath, file)

  if (error) {
    console.error('Upload error:', error)
    throw error
  }

  console.log('Upload successful for', filePath)
  return { filePath, fileName }
}

export const downloadJobImage = async (filePath: string) => {
  const { data, error } = await supabase.storage
    .from('job-images')
    .download(filePath)

  if (error) throw error

  return data
}

export const deleteJobImage = async (filePath: string) => {
  const { error } = await supabase.storage
    .from('job-images')
    .remove([filePath])

  if (error) throw error
}

export const getJobImageUrl = (filePath?: string | null) => {
  // Handle undefined/null file paths
  if (!filePath) {
    console.warn('getJobImageUrl called with undefined/null filePath')
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIvPjxjaXJjbGUgY3g9IjkiIGN5PSI5IiByPSIyIi8+PHBhdGggZD0iTTIxIDIxTDE2IDE2Ii8+PC9zdmc+'
  }

  // For public bucket, construct direct public URL
  const normalizedPath = filePath
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // strip zero-width chars
    .trim()
    .replace(/^\/+/, '') // remove leading slashes
    .replace(/\/+$/, '') // remove trailing slashes

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/job-images/${normalizedPath}`
  console.log('Generated public URL:', publicUrl)
  return publicUrl
}

// Document storage helper functions
export const uploadJobDocument = async (jobId: string, file: File, filename?: string) => {
  const fileExt = file.name.split('.').pop()
  const fileName = filename || `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
  // Store path relative to bucket (without bucket name prefix)
  const filePath = `${jobId}/${fileName}`

  console.log('Uploading to bucket "job-documents" at path:', filePath)

  const { error } = await supabase.storage
    .from('job-documents')
    .upload(filePath, file)

  if (error) {
    console.error('Upload error:', error)
    throw error
  }

  console.log('Upload successful for', filePath)
  return { filePath, fileName }
}

export const downloadJobDocument = async (filePath: string) => {
  const { data, error } = await supabase.storage
    .from('job-documents')
    .download(filePath)

  if (error) throw error

  return data
}

export const deleteJobDocument = async (filePath: string) => {
  const { error } = await supabase.storage
    .from('job-documents')
    .remove([filePath])

  if (error) throw error
}

export const getJobDocumentUrl = (filePath?: string | null) => {
  // Handle undefined/null file paths
  if (!filePath) {
    console.warn('getJobDocumentUrl called with undefined/null filePath')
    return null
  }

  // For public bucket, construct direct public URL
  const normalizedPath = filePath
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // strip zero-width chars
    .trim()
    .replace(/^\/+/, '') // remove leading slashes
    .replace(/\/+$/, '') // remove trailing slashes

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/job-documents/${normalizedPath}`
  console.log('Generated public URL:', publicUrl)
  return publicUrl
}