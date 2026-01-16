import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTenant } from '../context/TenantContext'
import { useJobs } from '../hooks/useJobs'
import { useTestEquipment } from '../hooks/useTestEquipment'
import { useUsers } from '../hooks/useUsers'
import { useUserRole } from '../hooks/useUserRole'
import { useUserManagement } from '../hooks/useUserManagement'
import { useNotifications } from '../hooks/useNotifications'
import { useTests } from '../hooks/useTests'
import { ASSET_TYPE_CONFIGS } from '../types/asset'
import { MESSAGES, ROUTES } from '../constants'
import { formatDate, isExpired, isExpiringSoon } from '../utils/date'
import { parseTags } from '../utils/strings'
import Banner from './Banner'
import Input from './ui/Input'
import TextArea from './ui/TextArea'
import Select from './ui/Select'
import Button from './ui/Button'
import NotificationTray from './ui/NotificationTray'
import TestBuilderDrawer from './TestBuilderDrawer'

const Admin: React.FC = () => {
  const navigate = useNavigate()
  const { logout, currentUser } = useAuth()
  const { tenant, updateTenant, loading: tenantLoading } = useTenant()
  const { jobs, loading: jobsLoading, addJob, updateJob, deleteJob } = useJobs()
  const { equipment, loading: equipmentLoading, addEquipment, deleteEquipment } = useTestEquipment()
  const { users, loading: usersLoading, refreshUsers } = useUsers()
  const { isAdministrator } = useUserRole()
  const { updateUserRole, loading: userManagementLoading } = useUserManagement()
  const { notifications, markAsRead, markAllAsRead } = useNotifications()
  const {
    tests,
    loading: testsLoading,
    createTest: createNewTest,
    deleteTest
  } = useTests()

  console.log('🔧 Admin component - equipment state:', { 
    equipment, 
    equipmentCount: equipment.length,
    equipmentLoading 
  })

  // Job form state
  const [jobForm, setJobForm] = useState({
    name: '',
    client: '',
    date: '',
    location: '',
    tags: '',
    details: '',
    site_contact: '',
    site_phone_number: '',
    assignedUserIds: [] as string[]
  })

  // Test equipment form state
  const [equipmentForm, setEquipmentForm] = useState({
    name: '',
    serialNumber: '',
    dateTest: '',
    userId: ''
  })

  const [activeTab, setActiveTab] = useState<'jobs' | 'jobManagement' | 'equipment' | 'branding' | 'users' | 'tests'>('jobs')
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isTestDrawerOpen, setIsTestDrawerOpen] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<any>(null)
  const [equipmentUserFilter, setEquipmentUserFilter] = useState<string>('') // Empty string = all users
  
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
          site_contact: jobForm.site_contact,
          site_phone_number: jobForm.site_phone_number,
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
        site_contact: '',
        site_phone_number: '',
        assignedUserIds: [],
      })

      setBanner({ message: MESSAGES.JOB_ADDED, type: 'success' })
    } catch (error) {
      setBanner({ message: MESSAGES.GENERIC_ERROR, type: 'error' })
      console.error('Error adding job:', error)
    }
  }

  const handleJobUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingJob) return

    try {
      await updateJob(editingJob.id, {
        name: editingJob.name,
        client: editingJob.client,
        date: editingJob.date,
        location: editingJob.location,
        tags: editingJob.tags,
        details: editingJob.details,
        site_contact: editingJob.site_contact,
        site_phone_number: editingJob.site_phone_number,
      })

      setEditingJob(null)
      setBanner({ message: 'Job updated successfully!', type: 'success' })
    } catch (error) {
      setBanner({ message: 'Failed to update job.', type: 'error' })
      console.error('Error updating job:', error)
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return
    }

    try {
      await deleteJob(jobId)
      setBanner({ message: 'Job deleted successfully!', type: 'success' })
    } catch (error) {
      setBanner({ message: 'Failed to delete job.', type: 'error' })
      console.error('Error deleting job:', error)
    }
  }

  const handleEquipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addEquipment(
        equipmentForm.name,
        equipmentForm.serialNumber,
        equipmentForm.dateTest,
        equipmentForm.userId
      )

      // Reset form
      setEquipmentForm({
        name: '',
        serialNumber: '',
        dateTest: '',
        userId: ''
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
            <div className="flex items-center gap-3">
              <NotificationTray
                notifications={notifications}
                onNotificationClick={(notification) => markAsRead(notification.id)}
                onMarkAllRead={markAllAsRead}
              />
              <Button variant="secondary" size="sm" onClick={() => logout()}>
                {MESSAGES.SIGN_OUT}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-8">
        {/* Navigation */}
        <div className="mb-6">
          {/* Mobile Premium Navigation */}
          <div className="md:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {activeTab === 'jobs' && 'Add Job'}
                    {activeTab === 'jobManagement' && 'Manage Jobs'}
                    {activeTab === 'equipment' && 'Test Equipment'}
                    {activeTab === 'tests' && 'Tests'}
                    {activeTab === 'branding' && 'Branding'}
                    {activeTab === 'users' && 'Users'}
                  </h2>
                  <p className="text-sm text-gray-500">Administration Panel</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileNavOpen(true)}
                className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop Horizontal Tabs */}
          <div className="hidden md:flex gap-2 border-b border-gray-200">
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
              onClick={() => setActiveTab('jobManagement')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'jobManagement'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Manage Jobs
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
              onClick={() => setActiveTab('tests')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'tests'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Tests
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
            {isAdministrator && (
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'users'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Users
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Bottom Sheet */}
        {isMobileNavOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
              onClick={() => setIsMobileNavOpen(false)}
            />

            {/* Bottom Sheet */}
            <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 md:hidden transform transition-transform duration-300 ease-out">
              <div className="p-6">
                {/* Handle */}
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">Administration</h3>

                {/* Navigation Options */}
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setActiveTab('jobs')
                      setIsMobileNavOpen(false)
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                      activeTab === 'jobs'
                        ? 'bg-primary-50 border-2 border-primary-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      activeTab === 'jobs' ? 'bg-primary-500' : 'bg-gray-100'
                    }`}>
                      <svg className={`w-5 h-5 ${activeTab === 'jobs' ? 'text-white' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className={`font-medium ${activeTab === 'jobs' ? 'text-primary-900' : 'text-gray-900'}`}>Add Job</p>
                      <p className="text-sm text-gray-500">Create new job assignments</p>
                    </div>
                    {activeTab === 'jobs' && (
                      <div className="ml-auto w-2 h-2 bg-primary-500 rounded-full"></div>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('jobManagement')
                      setIsMobileNavOpen(false)
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                      activeTab === 'jobManagement'
                        ? 'bg-primary-50 border-2 border-primary-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      activeTab === 'jobManagement' ? 'bg-primary-500' : 'bg-gray-100'
                    }`}>
                      <svg className={`w-5 h-5 ${activeTab === 'jobManagement' ? 'text-white' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className={`font-medium ${activeTab === 'jobManagement' ? 'text-primary-900' : 'text-gray-900'}`}>Manage Jobs</p>
                      <p className="text-sm text-gray-500">Edit and delete existing jobs</p>
                    </div>
                    {activeTab === 'jobManagement' && (
                      <div className="ml-auto w-2 h-2 bg-primary-500 rounded-full"></div>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('equipment')
                      setIsMobileNavOpen(false)
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                      activeTab === 'equipment'
                        ? 'bg-primary-50 border-2 border-primary-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      activeTab === 'equipment' ? 'bg-primary-500' : 'bg-gray-100'
                    }`}>
                      <svg className={`w-5 h-5 ${activeTab === 'equipment' ? 'text-white' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className={`font-medium ${activeTab === 'equipment' ? 'text-primary-900' : 'text-gray-900'}`}>Test Equipment</p>
                      <p className="text-sm text-gray-500">Manage testing tools</p>
                    </div>
                    {activeTab === 'equipment' && (
                      <div className="ml-auto w-2 h-2 bg-primary-500 rounded-full"></div>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('tests')
                      setIsMobileNavOpen(false)
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                      activeTab === 'tests'
                        ? 'bg-primary-50 border-2 border-primary-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      activeTab === 'tests' ? 'bg-primary-500' : 'bg-gray-100'
                    }`}>
                      <svg className={`w-5 h-5 ${activeTab === 'tests' ? 'text-white' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className={`font-medium ${activeTab === 'tests' ? 'text-primary-900' : 'text-gray-900'}`}>Tests</p>
                      <p className="text-sm text-gray-500">Create and manage tests</p>
                    </div>
                    {activeTab === 'tests' && (
                      <div className="ml-auto w-2 h-2 bg-primary-500 rounded-full"></div>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('branding')
                      setIsMobileNavOpen(false)
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                      activeTab === 'branding'
                        ? 'bg-primary-50 border-2 border-primary-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      activeTab === 'branding' ? 'bg-primary-500' : 'bg-gray-100'
                    }`}>
                      <svg className={`w-5 h-5 ${activeTab === 'branding' ? 'text-white' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className={`font-medium ${activeTab === 'branding' ? 'text-primary-900' : 'text-gray-900'}`}>Branding</p>
                      <p className="text-sm text-gray-500">Customize appearance</p>
                    </div>
                    {activeTab === 'branding' && (
                      <div className="ml-auto w-2 h-2 bg-primary-500 rounded-full"></div>
                    )}
                  </button>

                  {isAdministrator && (
                    <button
                      onClick={() => {
                        setActiveTab('users')
                        setIsMobileNavOpen(false)
                      }}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                        activeTab === 'users'
                          ? 'bg-primary-50 border-2 border-primary-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        activeTab === 'users' ? 'bg-primary-500' : 'bg-gray-100'
                      }`}>
                        <svg className={`w-5 h-5 ${activeTab === 'users' ? 'text-white' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className={`font-medium ${activeTab === 'users' ? 'text-primary-900' : 'text-gray-900'}`}>Users</p>
                        <p className="text-sm text-gray-500">Manage user roles</p>
                      </div>
                      {activeTab === 'users' && (
                        <div className="ml-auto w-2 h-2 bg-primary-500 rounded-full"></div>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

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
                enablePlaceholderFill={true}
              />

              <Input
                label="Client"
                type="text"
                required
                value={jobForm.client}
                onChange={(e) => setJobForm({ ...jobForm, client: e.target.value })}
                placeholder="Power Up"
                enablePlaceholderFill={true}
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
                  enablePlaceholderFill={true}
                />
              </div>

              <Input
                label="Tags (comma-separated)"
                type="text"
                value={jobForm.tags}
                onChange={(e) => setJobForm({ ...jobForm, tags: e.target.value })}
                placeholder="Re-test, Metering, Stop Button, etc.e"
                hint={MESSAGES.TAGS_HINT}
                enablePlaceholderFill={true}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Site Contact"
                  type="text"
                  value={jobForm.site_contact}
                  onChange={(e) => setJobForm({ ...jobForm, site_contact: e.target.value })}
                  placeholder="John Smith"
                  enablePlaceholderFill={true}
                />

                <Input
                  label="Site Phone Number"
                  type="tel"
                  value={jobForm.site_phone_number}
                  onChange={(e) => setJobForm({ ...jobForm, site_phone_number: e.target.value })}
                  placeholder="+44 1234 567890"
                  enablePlaceholderFill={true}
                />
              </div>

              <TextArea
                label="Details"
                required
                rows={4}
                value={jobForm.details}
                onChange={(e) => setJobForm({ ...jobForm, details: e.target.value })}
                placeholder="Enter job details..."
                enablePlaceholderFill={true}
              />

              <div>
                <label htmlFor="job-assigned-users" className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to Users
                </label>
                {usersLoading ? (
                  <div className="text-sm text-gray-500 py-2">
                    {MESSAGES.LOADING_USERS}
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-sm text-gray-500 py-2">
                    {MESSAGES.NO_USERS_MIGRATION}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
                    {users.map((user) => (
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
                            {user.id === currentUser?.id && (
                              <span className="text-xs text-primary-600 ml-1">(You)</span>
                            )}
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

        {/* Job Management */}
        {activeTab === 'jobManagement' && (
          <div className="space-y-6">
            {/* Edit Job Form */}
            {editingJob && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Edit Job</h2>
                  <button
                    onClick={() => setEditingJob(null)}
                    className="text-gray-400 hover:text-gray-600 p-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleJobUpdate} className="space-y-4">
                  <Input
                    label="Job Name"
                    type="text"
                    required
                    value={editingJob.name}
                    onChange={(e) => setEditingJob({ ...editingJob, name: e.target.value })}
                    placeholder="e.g., Metering and Stop Button"
                    enablePlaceholderFill={true}
                  />

                  <Input
                    label="Client"
                    type="text"
                    required
                    value={editingJob.client}
                    onChange={(e) => setEditingJob({ ...editingJob, client: e.target.value })}
                    placeholder="Power Up"
                    enablePlaceholderFill={true}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Date"
                      type="date"
                      required
                      value={editingJob.date}
                      onChange={(e) => setEditingJob({ ...editingJob, date: e.target.value })}
                    />

                    <Input
                      label="Location"
                      type="text"
                      required
                      value={editingJob.location}
                      onChange={(e) => setEditingJob({ ...editingJob, location: e.target.value })}
                      placeholder="Zander Way, Bedford, MK47 34D"
                      enablePlaceholderFill={true}
                    />
                  </div>

                  <Input
                    label="Tags (comma-separated)"
                    type="text"
                    value={editingJob.tags?.join(', ') || ''}
                    onChange={(e) => setEditingJob({ ...editingJob, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                    placeholder="Re-test, Metering, Stop Button, etc."
                    hint={MESSAGES.TAGS_HINT}
                    enablePlaceholderFill={true}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Site Contact"
                      type="text"
                      value={editingJob.site_contact || ''}
                      onChange={(e) => setEditingJob({ ...editingJob, site_contact: e.target.value })}
                      placeholder="John Smith"
                      enablePlaceholderFill={true}
                    />

                    <Input
                      label="Site Phone Number"
                      type="tel"
                      value={editingJob.site_phone_number || ''}
                      onChange={(e) => setEditingJob({ ...editingJob, site_phone_number: e.target.value })}
                      placeholder="+44 1234 567890"
                      enablePlaceholderFill={true}
                    />
                  </div>

                  <TextArea
                    label="Details"
                    required
                    rows={4}
                    value={editingJob.details}
                    onChange={(e) => setEditingJob({ ...editingJob, details: e.target.value })}
                    placeholder="Enter job details..."
                    enablePlaceholderFill={true}
                  />

                  <div className="flex items-center gap-3 pt-4">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                      Update Job
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingJob(null)}
                      className="px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Jobs List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Jobs List</h2>
              {jobsLoading ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Loading jobs...</p>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No jobs found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">{job.name}</h3>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                              {job.client}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Date:</span>
                              <span>{formatDate(job.date)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Location:</span>
                              <span>{job.location}</span>
                            </div>
                            {job.tags && job.tags.length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Tags:</span>
                                <span>{job.tags.join(', ')}</span>
                              </div>
                            )}
                            {job.site_contact && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Contact:</span>
                                <span>{job.site_contact}</span>
                              </div>
                            )}
                            {job.assignedUsers && job.assignedUsers.length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Assigned:</span>
                                <span>{job.assignedUsers.length} user{job.assignedUsers.length !== 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </div>
                          {job.details && (
                            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                              {job.details}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => setEditingJob(job)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            aria-label="Edit job"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            aria-label="Delete job"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                  enablePlaceholderFill={true}
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
                  enablePlaceholderFill={true}
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

                <Select
                  label="Assign to User"
                  value={equipmentForm.userId}
                  options={[
                    { value: '', label: usersLoading ? 'Loading users...' : 'Select a user' },
                    ...(users || []).map((user) => ({
                      value: user.id,
                      label: user.displayName || user.email
                    }))
                  ]}
                  onChange={(value) =>
                    setEquipmentForm({ ...equipmentForm, userId: value })
                  }
                  disabled={usersLoading || !users || users.length === 0}
                  required
                />

                <Button type="submit" fullWidth className="sm:w-auto">
                  {MESSAGES.ADD_EQUIPMENT}
                </Button>
              </form>
            </div>

            {/* Equipment List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Test Equipment List</h2>
                {!equipmentLoading && equipment.length > 0 && (
                  <div className="w-64">
                    <Select
                      label=""
                      placeholder="Filter by user"
                      value={equipmentUserFilter}
                      options={[
                        { value: '', label: 'All Users' },
                        ...(users || []).map((user) => ({
                          value: user.id,
                          label: user.displayName || user.email
                        }))
                      ]}
                      onChange={(value) => setEquipmentUserFilter(value)}
                    />
                  </div>
                )}
              </div>
              {equipmentLoading ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Loading equipment...</p>
                </div>
              ) : equipment.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>{MESSAGES.NO_EQUIPMENT}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {equipment
                    .filter((item) => !equipmentUserFilter || item.userId === equipmentUserFilter)
                    .map((item) => {
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
                                <span className="font-medium">Assigned to:</span>
                                <span>{item.assignedUserName || 'Unknown User'}</span>
                              </div>
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

    {/* Tests Tab */}
    {activeTab === 'tests' && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Test Forms</h2>
            <p className="text-sm text-gray-600">Create and manage commissioning tests across jobs.</p>
          </div>
          <Button
            onClick={() => setIsTestDrawerOpen(true)}
            disabled={jobs.length === 0 || jobsLoading}
          >
            New Test
          </Button>
        </div>

        {testsLoading ? (
          <div className="py-12 text-center text-gray-500">Loading tests...</div>
        ) : tests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
            <p className="font-medium">No tests created yet.</p>
            <p className="text-sm">Create your first test to start capturing measurements.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tests.map(test => (
              <div key={test.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-base font-semibold text-gray-900">{test.name}</p>
                    {test.asset_type && (
                      <p className="text-sm text-gray-500">
                        Asset Type: {ASSET_TYPE_CONFIGS[test.asset_type as keyof typeof ASSET_TYPE_CONFIGS]?.label || test.asset_type}
                      </p>
                    )}
                    {!test.asset_type && (
                      <p className="text-sm text-gray-500 italic">
                        No asset type specified
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {test.test_inputs ? `${test.test_inputs.length} inputs defined` : 'No inputs'}
                  </div>
                </div>
                {test.instructions && (
                  <p className="mt-2 text-sm text-gray-600">
                    {test.instructions}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-xs text-gray-500">
                    Updated {formatDate(test.updated_at)}
                  </span>
                  <button
                    onClick={async () => {
                      try {
                        await deleteTest(test.id)
                        setBanner({ message: 'Test deleted successfully.', type: 'success' })
                      } catch (error) {
                        console.error('Failed to delete test:', error)
                        setBanner({ message: 'Failed to delete test.', type: 'error' })
                      }
                    }}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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

                <Input
                  label="Logo URL"
                  type="url"
                  value={brandingForm.logoUrl}
                  onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  hint="Enter a URL to your logo image. This will be displayed in the app header."
                  enablePlaceholderFill={true}
                />
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

                <div className="pt-4 border-t border-gray-200">
                  <Button type="submit" fullWidth={false}>
                    Save Branding Settings
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* User Management (Administrators Only) */}
        {activeTab === 'users' && isAdministrator && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">User Management</h2>
            {usersLoading ? (
              <div className="text-center py-8 text-gray-500">
                <p>Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No users found in this tenant.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.displayName || user.email}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
                              {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {user.displayName || user.email}
                            </p>
                            <p className="text-sm text-gray-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32">
                          <Select
                            value={user.role || 'engineer'}
                            options={[
                              { value: 'engineer', label: 'Engineer' },
                              { value: 'administrator', label: 'Administrator' }
                            ]}
                            onChange={async (value) => {
                              try {
                                await updateUserRole(user.id, value as 'administrator' | 'engineer')
                                setBanner({ message: 'User role updated successfully!', type: 'success' })
                                refreshUsers()
                              } catch (error) {
                                const errorMessage = error instanceof Error ? error.message : 'Failed to update user role'
                                setBanner({
                                  message: errorMessage,
                                  type: 'error'
                                })
                              }
                            }}
                            disabled={user.id === currentUser?.id || userManagementLoading}
                          />
                        </div>
                        {user.id === currentUser?.id && (
                          <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

  <TestBuilderDrawer
    isOpen={isTestDrawerOpen}
    onClose={() => setIsTestDrawerOpen(false)}
    onCreate={async (payload) => {
      try {
        await createNewTest(payload)
        setBanner({ message: 'Test created successfully!', type: 'success' })
        setIsTestDrawerOpen(false)
      } catch (error) {
        console.error('Failed to create test:', error)
        setBanner({ message: 'Failed to create test.', type: 'error' })
      }
    }}
  />
    </div>
  )
}

export default Admin

