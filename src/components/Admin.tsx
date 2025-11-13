import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTenant } from '../context/TenantContext'
import { useJobs } from '../hooks/useJobs'
import { useTestEquipment } from '../hooks/useTestEquipment'
import { useUsers } from '../hooks/useUsers'
import { MESSAGES, ROUTES } from '../constants'
import { formatDate, isExpired, isExpiringSoon } from '../utils/date'
import { parseTags } from '../utils/strings'
import Banner from './Banner'
import Input from './ui/Input'
import TextArea from './ui/TextArea'
import Button from './ui/Button'

const Admin: React.FC = () => {
  const navigate = useNavigate()
  const { logout, currentUser } = useAuth()
  const { tenant, updateTenant, loading: tenantLoading } = useTenant()
  const { addJob } = useJobs()
  const { equipment, addEquipment, deleteEquipment } = useTestEquipment()
  const { users, loading: usersLoading } = useUsers()

  // Job form state
  const [jobForm, setJobForm] = useState({
    name: '',
    client: '',
    date: '',
    location: '',
    tags: '',
    details: '',
    assignedUserIds: [] as string[]
  })

  // Test equipment form state
  const [equipmentForm, setEquipmentForm] = useState({
    name: '',
    serialNumber: '',
    dateTest: ''
  })

  const [activeTab, setActiveTab] = useState<'jobs' | 'equipment' | 'branding'>('jobs')
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  
  // Branding form state
  const [brandingForm, setBrandingForm] = useState({
    primaryColor: '#3b82f6',
    logoUrl: ''
  })
  
  // Initialize branding form when tenant loads
  useEffect(() => {
    if (tenant) {
      setBrandingForm({
        primaryColor: tenant.primary_color || '#3b82f6',
        logoUrl: tenant.logo_url || ''
      })
    }
  }, [tenant])

  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const tags = parseTags(jobForm.tags)

    try {
      await addJob(
        {
          name: jobForm.name,
          client: jobForm.client,
          date: jobForm.date,
          location: jobForm.location,
          tags,
          details: jobForm.details,
        },
        jobForm.assignedUserIds
      )

      // Reset form
      setJobForm({
        name: '',
        client: '',
        date: '',
        location: '',
        tags: '',
        details: '',
        assignedUserIds: [],
      })

      setBanner({ message: MESSAGES.JOB_ADDED, type: 'success' })
    } catch (error) {
      setBanner({ message: MESSAGES.GENERIC_ERROR, type: 'error' })
      console.error('Error adding job:', error)
    }
  }

  const handleEquipmentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      addEquipment(equipmentForm.name, equipmentForm.serialNumber, equipmentForm.dateTest)

      // Reset form
      setEquipmentForm({
        name: '',
        serialNumber: '',
        dateTest: ''
      })

      setBanner({ message: MESSAGES.EQUIPMENT_ADDED, type: 'success' })
    } catch (error) {
      setBanner({ message: MESSAGES.EQUIPMENT_ADD_FAILED, type: 'error' })
      console.error('Error adding equipment:', error)
    }
  }

  const handleBrandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateTenant({
        primary_color: brandingForm.primaryColor,
        logo_url: brandingForm.logoUrl || null
      })
      setBanner({ message: 'Branding settings updated successfully!', type: 'success' })
    } catch (error) {
      setBanner({ message: 'Failed to update branding settings', type: 'error' })
      console.error('Error updating branding:', error)
    }
  }


  return (
    <div className="min-h-screen bg-gray-50 safe-area-inset">
      {banner && (
        <Banner
          message={banner.message}
          type={banner.type}
          onClose={() => setBanner(null)}
        />
      )}
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(ROUTES.DASHBOARD)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back to dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Admin Area</h1>
            </div>
            <Button variant="secondary" size="sm" onClick={() => logout()}>
              {MESSAGES.SIGN_OUT}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-8">
        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('jobs')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'jobs'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Add Job
            </button>
            <button
              onClick={() => setActiveTab('equipment')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'equipment'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Test Equipment
            </button>
            <button
              onClick={() => setActiveTab('branding')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'branding'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Branding
            </button>
          </div>
        </div>

        {/* Add Job Form */}
        {activeTab === 'jobs' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Add New Job</h2>
            <form onSubmit={handleJobSubmit} className="space-y-4">
              <Input
                label="Job Name"
                type="text"
                required
                value={jobForm.name}
                onChange={(e) => setJobForm({ ...jobForm, name: e.target.value })}
                placeholder="e.g., Metering and Stop Button"
              />

              <Input
                label="Client"
                type="text"
                required
                value={jobForm.client}
                onChange={(e) => setJobForm({ ...jobForm, client: e.target.value })}
                placeholder="Power Up"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Date"
                  type="date"
                  required
                  value={jobForm.date}
                  onChange={(e) => setJobForm({ ...jobForm, date: e.target.value })}
                />

                <Input
                  label="Location"
                  type="text"
                  required
                  value={jobForm.location}
                  onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                  placeholder="Zander Way, Bedford, MK47 34D"
                />
              </div>

              <Input
                label="Tags (comma-separated)"
                type="text"
                value={jobForm.tags}
                onChange={(e) => setJobForm({ ...jobForm, tags: e.target.value })}
                placeholder="Re-test, Metering, Stop Button, etc.e"
                hint={MESSAGES.TAGS_HINT}
              />

              <TextArea
                label="Details"
                required
                rows={4}
                value={jobForm.details}
                onChange={(e) => setJobForm({ ...jobForm, details: e.target.value })}
                placeholder="Enter job details..."
              />

              <div>
                <label htmlFor="job-assigned-users" className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to Users
                </label>
                {usersLoading ? (
                  <div className="text-sm text-gray-500 py-2">
                    {MESSAGES.LOADING_USERS}
                  </div>
                ) : users.filter((user) => user.id !== currentUser?.id).length ===
                  0 ? (
                  <div className="text-sm text-gray-500 py-2">
                    {users.length === 0
                      ? MESSAGES.NO_USERS_MIGRATION
                      : MESSAGES.NO_USERS_ONLY_YOU}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
                    {users
                      .filter(user => user.id !== currentUser?.id) // Exclude current user
                      .map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={jobForm.assignedUserIds.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setJobForm({
                                  ...jobForm,
                                  assignedUserIds: [...jobForm.assignedUserIds, user.id]
                                })
                              } else {
                                setJobForm({
                                  ...jobForm,
                                  assignedUserIds: jobForm.assignedUserIds.filter(id => id !== user.id)
                                })
                              }
                            }}
                            className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">
                            {user.displayName || user.email}
                          </span>
                        </label>
                      ))}
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {MESSAGES.ASSIGN_USERS_HINT}
                </p>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Add Job
              </button>
            </form>
          </div>
        )}

        {/* Test Equipment Form and List */}
        {activeTab === 'equipment' && (
          <div className="space-y-6">
            {/* Add Equipment Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Add Test Equipment</h2>
              <form onSubmit={handleEquipmentSubmit} className="space-y-4">
                <Input
                  label="Name"
                  type="text"
                  required
                  value={equipmentForm.name}
                  onChange={(e) =>
                    setEquipmentForm({ ...equipmentForm, name: e.target.value })
                  }
                  placeholder="e.g., Multimeter Pro 5000"
                />

                <Input
                  label="Serial Number"
                  type="text"
                  required
                  value={equipmentForm.serialNumber}
                  onChange={(e) =>
                    setEquipmentForm({
                      ...equipmentForm,
                      serialNumber: e.target.value,
                    })
                  }
                  placeholder="e.g., TE-2024-001"
                />

                <Input
                  label="Date Test"
                  type="date"
                  required
                  value={equipmentForm.dateTest}
                  onChange={(e) =>
                    setEquipmentForm({ ...equipmentForm, dateTest: e.target.value })
                  }
                  hint={MESSAGES.EXPIRY_HINT}
                />

                <Button type="submit" fullWidth className="sm:w-auto">
                  {MESSAGES.ADD_EQUIPMENT}
                </Button>
              </form>
            </div>

            {/* Equipment List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Equipment List</h2>
              {equipment.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>{MESSAGES.NO_EQUIPMENT}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {equipment.map((item) => {
                    const expired = isExpired(item.expiry)
                    const expiringSoon = isExpiringSoon(item.expiry)
                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-lg border ${
                          expired
                            ? 'bg-red-50 border-red-200'
                            : expiringSoon
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900">{item.name}</h3>
                              {expired && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                                  Expired
                                </span>
                              )}
                              {expiringSoon && !expired && (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                                  Expiring Soon
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">Serial: {item.serialNumber}</p>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Test Date:</span>
                                <span>{formatDate(item.dateTest)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Expiry:</span>
                                <span>{formatDate(item.expiry)}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteEquipment(item.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                            aria-label="Delete equipment"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Branding Form */}
        {activeTab === 'branding' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Branding Settings</h2>
            {tenantLoading ? (
              <div className="text-center py-8 text-gray-500">
                <p>Loading branding settings...</p>
              </div>
            ) : (
              <form onSubmit={handleBrandingSubmit} className="space-y-6">
                <div>
                  <label htmlFor="primary-color" className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      id="primary-color"
                      value={brandingForm.primaryColor}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                      className="w-20 h-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={brandingForm.primaryColor}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                      placeholder="#3b82f6"
                      className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    This color will be used throughout the app for buttons, links, and other primary elements.
                  </p>
                </div>

                <div>
                  <label htmlFor="logo-url" className="block text-sm font-medium text-gray-700 mb-2">
                    Logo URL
                  </label>
                  <input
                    id="logo-url"
                    type="url"
                    value={brandingForm.logoUrl}
                    onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter a URL to your logo image. This will be displayed in the app header.
                  </p>
                  {brandingForm.logoUrl && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 flex items-center justify-center">
                        <img
                          src={brandingForm.logoUrl}
                          alt="Logo preview"
                          className="max-h-16 max-w-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <Button type="submit" fullWidth={false}>
                    Save Branding Settings
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default Admin

