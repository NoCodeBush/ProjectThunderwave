import React, { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useJobs } from '../hooks/useJobs'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../constants'
import { supabase, uploadJobDocument, downloadJobDocument, deleteJobDocument, getJobDocumentUrl } from '../supabase/config'
import Button from './ui/Button'

interface JobDocument {
  id: string
  job_id: string
  filename: string
  file_path: string
  file_size: number
  uploaded_by: string
  created_at: string
  publicUrl?: string
}

const DocumentUpload: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { jobs, loading } = useJobs()
  const { currentUser } = useAuth()
  const [documents, setDocuments] = useState<JobDocument[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const job = jobs.find(j => j.id === jobId)

  // Accept document file types
  const acceptedFileTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]

  const acceptedFileExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.ppt', '.pptx']

  const loadDocuments = async () => {
    try {
      setDocumentsLoading(true)
      const { data, error } = await supabase
        .from('job_documents')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Generate public URLs for all documents
      const documentsWithUrls = (data || []).map((doc) => {
        const publicUrl = getJobDocumentUrl(doc.file_path)
        return { ...doc, publicUrl }
      })

      setDocuments(documentsWithUrls)
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setDocumentsLoading(false)
    }
  }

  useEffect(() => {
    if (jobId) {
      loadDocuments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    // Filter for accepted document types
    const validFiles = files.filter((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const isValidType = acceptedFileTypes.includes(file.type) || 
                         (ext && acceptedFileExtensions.includes(`.${ext}`))
      
      if (!isValidType) {
        alert(`File "${file.name}" is not a supported document type. Accepted types: PDF, DOC, DOCX, XLS, XLSX, TXT, PPT, PPTX`)
      }
      
      return isValidType
    })
    
    setSelectedFiles(validFiles)
  }

  const handleUpload = async () => {
    if (!jobId || !currentUser || selectedFiles.length === 0) return

    setUploading(true)
    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        console.log('Uploading document:', {
          name: file.name,
          size: file.size,
          type: file.type,
          jobId: jobId
        })

        // Upload to Supabase Storage
        const { filePath, fileName } = await uploadJobDocument(jobId!, file)
        console.log('Upload successful:', { filePath, fileName })

        // Save metadata to database
        const { error: dbError } = await supabase
          .from('job_documents')
          .insert({
            job_id: jobId,
            filename: file.name,
            file_path: filePath,
            file_size: file.size,
            uploaded_by: currentUser.id
          })

        if (dbError) {
          console.error('Database insert error:', dbError)
          throw dbError
        }

        console.log('Database insert successful for', file.name)
        return { fileName, filePath }
      })

      await Promise.all(uploadPromises)

      // Refresh documents list
      await loadDocuments()

      // Clear selected files
      setSelectedFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error uploading documents:', error)
      alert('Failed to upload documents. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (doc: JobDocument) => {
    try {
      const data = await downloadJobDocument(doc.file_path)

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading document:', error)
      alert('Failed to download document. Please try again.')
    }
  }

  const handleDelete = async (document: JobDocument) => {
    if (!confirm(`Are you sure you want to delete "${document.filename}"?`)) return

    try {
      // Delete from storage
      await deleteJobDocument(document.file_path)

      // Delete from database
      const { error: dbError } = await supabase
        .from('job_documents')
        .delete()
        .eq('id', document.id)

      if (dbError) throw dbError

      // Refresh documents list
      await loadDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Failed to delete document. Please try again.')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf':
        return (
          <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        )
      case 'doc':
      case 'docx':
        return (
          <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        )
      case 'xls':
      case 'xlsx':
        return (
          <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        )
      default:
        return (
          <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        )
    }
  }

  if (loading || documentsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 safe-area-inset flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 safe-area-inset flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h1>
          <p className="text-gray-600 mb-6">The requested job could not be found.</p>
          <Button onClick={() => navigate(ROUTES.DASHBOARD)}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-area-inset">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between min-h-16 py-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => navigate(ROUTES.JOB_DETAILS.replace(':jobId', jobId!))}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                aria-label="Back to job details"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Document Upload</h1>
                <p className="text-sm text-gray-600 truncate">{job.name}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-8">
        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Documents</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Documents
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.ppt,.pptx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="secondary"
                >
                  Choose Files
                </Button>
                {selectedFiles.length > 0 && (
                  <span className="text-sm text-gray-600">
                    {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Supported formats: PDF, DOC, DOCX, XLS, XLSX, TXT, PPT, PPTX
              </p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Files:</h3>
                <ul className="space-y-1">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-center justify-between">
                      <span className="truncate flex-1">{file.name}</span>
                      <span className="ml-2 text-gray-500">{formatFileSize(file.size)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="w-full sm:w-auto"
            >
              {uploading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </div>
              ) : (
                'Upload Documents'
              )}
            </Button>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Uploaded Documents ({documents.length})
          </h2>

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {getFileIcon(document.filename)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{document.filename}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(document.file_size)} • Uploaded {new Date(document.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      onClick={() => handleDownload(document)}
                      variant="secondary"
                      className="text-xs px-3 py-1"
                    >
                      Download
                    </Button>
                    <Button
                      onClick={() => handleDelete(document)}
                      variant="secondary"
                      className="text-xs px-3 py-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default DocumentUpload

