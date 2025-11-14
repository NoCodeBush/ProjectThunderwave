import React, { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useJobs } from '../hooks/useJobs'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../constants'
import { supabase, uploadJobImage, downloadJobImage, deleteJobImage, getJobImageUrl } from '../supabase/config'
import Button from './ui/Button'

// Document scanning effects using OpenCV.js or similar
declare global {
  interface Window {
    cv: any
  }
}

interface JobImage {
  id: string
  job_id: string
  filename: string
  file_path: string
  file_size: number
  uploaded_by: string
  created_at: string
  publicUrl?: string
}

interface ScannedDocument {
  id: string
  image_id: string
  document_type: string
  scanned_image_path: string
  created_at: string
}

// Simple document type detection based on filename
const detectDocumentType = (filename: string): string => {
  const lowerName = filename.toLowerCase()

  if (lowerName.includes('certificate') || lowerName.includes('cert') || lowerName.includes('diploma') || lowerName.includes('license')) {
    return 'certificate'
  }
  if (lowerName.includes('invoice') || lowerName.includes('bill') || lowerName.includes('receipt')) {
    return 'invoice'
  }
  if (lowerName.includes('report') || lowerName.includes('assessment') || lowerName.includes('inspection')) {
    return 'report'
  }
  if (lowerName.includes('manual') || lowerName.includes('guide') || lowerName.includes('instruction')) {
    return 'manual'
  }

  return 'document'
}

const ImageScan: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { jobs, loading } = useJobs()
  const { currentUser } = useAuth()
  const [images, setImages] = useState<JobImage[]>([])
  const [imagesLoading, setImagesLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [scannedDocuments, setScannedDocuments] = useState<ScannedDocument[]>([])
  const [processing, setProcessing] = useState(false)
  const [processProgress, setProcessProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const job = jobs.find(j => j.id === jobId)

  const loadImages = async () => {
    try {
      setImagesLoading(true)
      const { data, error } = await supabase
        .from('job_images')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('Found', (data || []).length, 'images for job', jobId)
      console.log('Image records:', data?.map(img => ({
        id: img.id,
        filename: img.filename,
        file_path: img.file_path
      })))

      // Generate public URLs for all images
      const imagesWithUrls = (data || []).map((image) => {
        const publicUrl = getJobImageUrl(image.file_path)
        console.log('✅ Generated public URL for', image.filename, ':', publicUrl)
        return { ...image, publicUrl }
      })

      setImages(imagesWithUrls)
    } catch (error) {
      console.error('❌ Error loading images:', error)
    } finally {
      setImagesLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles(files)
  }

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.capture = 'environment' // Use back camera on mobile
      fileInputRef.current.click()
    }
  }

  const handleUpload = async () => {
    if (!jobId || !currentUser || selectedFiles.length === 0) return

    setUploading(true)
    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        console.log('Uploading file:', {
          name: file.name,
          size: file.size,
          type: file.type,
          jobId: jobId
        })

        // Upload to Supabase Storage
        const { filePath, fileName } = await uploadJobImage(jobId!, file)
        console.log('Upload successful:', { filePath, fileName })

        // Save metadata to database
        const { error: dbError } = await supabase
          .from('job_images')
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

      // Refresh images list
      await loadImages()

      // Clear selected files
      setSelectedFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error uploading images:', error)
      alert('Failed to upload images. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (image: JobImage) => {
    try {
      const data = await downloadJobImage(image.file_path)

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = image.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading image:', error)
      alert('Failed to download image. Please try again.')
    }
  }

  const handleDelete = async (image: JobImage) => {
    if (!confirm(`Are you sure you want to delete "${image.filename}"?`)) return

    try {
      // Delete from storage
      await deleteJobImage(image.file_path)

      // Delete from database
      const { error: dbError } = await supabase
        .from('job_images')
        .delete()
        .eq('id', image.id)

      if (dbError) throw dbError

      // Refresh images list
      await loadImages()
    } catch (error) {
      console.error('Error deleting image:', error)
      alert('Failed to delete image. Please try again.')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Apply scanner-like effects to image
  const applyScannerEffects = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, image: HTMLImageElement) => {
    // Set canvas size to match image
    canvas.width = image.width
    canvas.height = image.height

    // Draw original image
    ctx.drawImage(image, 0, 0)

    // Get image data for processing
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let data = imageData.data

    // Apply grayscale
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      data[i] = gray     // Red
      data[i + 1] = gray // Green
      data[i + 2] = gray // Blue
      // Alpha (data[i + 3]) remains unchanged
    }

    // Apply contrast boost
    const contrast = 1.2
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))

    for (let i = 0; i < data.length; i += 4) {
      data[i] = factor * (data[i] - 128) + 128
      data[i + 1] = factor * (data[i + 1] - 128) + 128
      data[i + 2] = factor * (data[i + 2] - 128) + 128
    }

    // Apply slight blur to mimic scanner effect
    ctx.putImageData(imageData, 0, 0)
    ctx.filter = 'blur(0.5px)'
    ctx.drawImage(canvas, 0, 0)
    ctx.filter = 'none'

    // Add subtle noise/grain effect
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      // Add small random variation
      const noise = (Math.random() - 0.5) * 10
      data[i] = Math.max(0, Math.min(255, data[i] + noise))
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise))
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise))
    }

    ctx.putImageData(imageData, 0, 0)
  }

  // Simple document edge detection (basic implementation)
  const detectDocumentEdges = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    // This is a simplified edge detection
    // In a real implementation, you'd use more sophisticated computer vision

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Apply basic edge detection (Sobel-like filter)
    const width = canvas.width
    const height = canvas.height
    const output = new Uint8ClampedArray(data.length)

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4

        // Simple edge detection based on contrast changes
        const center = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114
        const top = data[((y - 1) * width + x) * 4] * 0.299 + data[((y - 1) * width + x) * 4 + 1] * 0.587 + data[((y - 1) * width + x) * 4 + 2] * 0.114
        const bottom = data[((y + 1) * width + x) * 4] * 0.299 + data[((y + 1) * width + x) * 4 + 1] * 0.587 + data[((y + 1) * width + x) * 4 + 2] * 0.114
        const left = data[(y * width + (x - 1)) * 4] * 0.299 + data[(y * width + (x - 1)) * 4 + 1] * 0.587 + data[(y * width + (x - 1)) * 4 + 2] * 0.114
        const right = data[(y * width + (x + 1)) * 4] * 0.299 + data[(y * width + (x + 1)) * 4 + 1] * 0.587 + data[(y * width + (x + 1)) * 4 + 2] * 0.114

        const gradient = Math.abs(center - top) + Math.abs(center - bottom) + Math.abs(center - left) + Math.abs(center - right)

        const edgeStrength = Math.min(255, gradient * 2)
        output[idx] = edgeStrength
        output[idx + 1] = edgeStrength
        output[idx + 2] = edgeStrength
        output[idx + 3] = 255
      }
    }

    // Copy processed data back
    for (let i = 0; i < output.length; i++) {
      data[i] = output[i]
    }

    ctx.putImageData(imageData, 0, 0)
  }

  // Apply scanner effects to image
  const scanDocument = async (image: JobImage) => {
    if (!image.publicUrl) return

    setProcessing(true)
    setProcessProgress(10)

    try {
      // Load original image
      const img = new Image()
      img.crossOrigin = 'anonymous'

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = image.publicUrl!
      })

      setProcessProgress(30)
      console.log('Original image loaded, applying scanner effects...')

      // Create canvas for image processing
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')

      // Apply scanner effects
      applyScannerEffects(canvas, ctx, img)
      setProcessProgress(70)

      // Optional: Apply edge detection for document boundaries
      // detectDocumentEdges(canvas, ctx)

      setProcessProgress(80)

      // Convert canvas to blob for upload
      const processedBlob = await new Promise<Blob>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.9)
      )

      // Create processed file
      const processedFile = new File([processedBlob], `scanned_${image.filename}`, {
        type: 'image/jpeg'
      })

      setProcessProgress(90)

      // Upload processed image
      console.log('Uploading processed image...')
      const { filePath: scannedPath } = await uploadJobImage(jobId!, processedFile)

      // Detect document type from filename
      const documentType = detectDocumentType(image.filename)
      console.log('Detected document type:', documentType)

      // Save scanned document record
      const scannedDoc = {
        image_id: image.id,
        document_type: documentType,
        scanned_image_path: scannedPath
      }

      const { error: scanError } = await supabase
        .from('scanned_documents')
        .insert(scannedDoc)

      if (scanError) {
        console.error('Error saving scanned document:', scanError)
        alert('Failed to save scanned document. Please try again.')
        return
      }

      // Refresh scanned documents
      await loadScannedDocuments()

      setProcessProgress(100)
      console.log('Document processed and saved successfully')
      alert(`Document scanned successfully!\nType: ${documentType}\nApplied scanner effects.`)

    } catch (error) {
      console.error('Document processing failed:', error)
      alert('Document processing failed. Please try again.')
    } finally {
      setProcessing(false)
      setProcessProgress(0)
    }
  }

  // Load scanned documents
  const loadScannedDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('scanned_documents')
        .select(`
          *,
          job_images!inner(job_id)
        `)
        .eq('job_images.job_id', jobId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setScannedDocuments(data || [])
    } catch (error) {
      console.error('Error loading scanned documents:', error)
    }
  }

  // Load both images and scanned documents
  useEffect(() => {
    if (jobId) {
      loadImages()
      loadScannedDocuments()
    }
  }, [jobId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 safe-area-inset flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading image scan...</p>
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
                onClick={() => navigate(ROUTES.JOB_DETAILS.replace(':jobId', job.id))}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                aria-label="Back to job details"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Image/Scan</h1>
                <p className="text-sm text-gray-600 truncate">{job.name}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-8">
        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Images</h2>

          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <Button
              onClick={handleCameraCapture}
              className="flex items-center gap-2"
              disabled={uploading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Take Photo
            </Button>

            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="secondary"
              className="flex items-center gap-2"
              disabled={uploading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Files
            </Button>
          </div>

          {/* Selected files preview */}
          {selectedFiles.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Selected Files ({selectedFiles.length})
              </h3>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm text-gray-700 truncate">{file.name}</span>
                    <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedFiles.length > 0 && (
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full sm:w-auto"
            >
              {uploading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </div>
              ) : (
                `Upload ${selectedFiles.length} Image${selectedFiles.length > 1 ? 's' : ''}`
              )}
            </Button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Images Gallery */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Images ({images.length})
          </h2>

          {imagesLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
              <p className="text-gray-600">Loading images...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No images yet</h3>
              <p className="text-gray-600">Upload images to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image) => (
                <div key={image.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="aspect-w-16 aspect-h-12 bg-gray-100 relative">
                    <img
                      src={image.publicUrl}
                      alt={image.filename}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIvPjxjaXJjbGUgY3g9IjkiIGN5PSI5IiByPSIyIi8+PHBhdGggZD0iTTIxIDIxTDE2IDE2Ii8+PC9zdmc+'
                      }}
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
                      {image.filename}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2">
                      {formatFileSize(image.file_size)}
                    </p>
                    <div className="flex gap-2 mb-2">
                      <Button
                        onClick={() => handleDownload(image)}
                        variant="secondary"
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        Download
                      </Button>
                      <Button
                        onClick={() => handleDelete(image)}
                        variant="danger"
                        size="sm"
                        className="text-xs"
                      >
                        Delete
                      </Button>
                    </div>
                    <Button
                      onClick={() => scanDocument(image)}
                      disabled={processing}
                      variant="primary"
                      size="sm"
                      className="w-full text-xs"
                    >
                      {processing ? (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                          Processing... {processProgress}%
                        </div>
                      ) : (
                        '📄 Create Scan'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scanned Documents Section */}
        {scannedDocuments.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Scanned Documents ({scannedDocuments.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {scannedDocuments.map((scan) => (
                <div key={scan.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="aspect-w-16 aspect-h-12 bg-gray-100 relative">
                    <img
                      src={getJobImageUrl(scan.scanned_image_path)}
                      alt={`Scanned ${scan.document_type}`}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIvPjxjaXJjbGUgY3g9IjkiIGN5PSI5IiByPSIyIi8+PHBhdGggZD0iTTIxIDIxTDE2IDE2Ii8+PC9zdmc+'
                      }}
                    />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                        {scan.document_type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(scan.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      onClick={() => {
                        const url = getJobImageUrl(scan.scanned_image_path)
                        const link = document.createElement('a')
                        link.href = url
                        link.download = `scanned_${scan.document_type}_${scan.id}.jpg`
                        link.click()
                      }}
                      variant="secondary"
                      size="sm"
                      className="w-full text-xs"
                    >
                      ⬇️ Download Scan
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default ImageScan
