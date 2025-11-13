import { useState, useEffect } from 'react'
import { supabase } from '../supabase/config'
import { Asset } from '../types/asset'
import { useCurrentTenantId } from './useCurrentTenantId'
import { useAuth } from '../context/AuthContext'

export const useAssets = (jobId?: string) => {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const tenantId = useCurrentTenantId()
  const { currentUser } = useAuth()

  useEffect(() => {
    if (!tenantId || !jobId) {
      setAssets([])
      setLoading(false)
      return
    }

    const loadAssets = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('assets')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setAssets(data || [])
      } catch (error) {
        console.error('Error loading assets:', error)
        setAssets([])
      } finally {
        setLoading(false)
      }
    }

    loadAssets()

    // Subscribe to changes
    const channel = supabase
      .channel(`assets_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assets',
          filter: `job_id=eq.${jobId}`
        },
        (payload) => {
          console.log('Real-time asset update:', payload.eventType, payload)
          if (payload.eventType === 'INSERT') {
            console.log('Adding asset via real-time:', payload.new)
            setAssets(prev => [payload.new as Asset, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            console.log('Updating asset via real-time:', payload.new)
            setAssets(prev =>
              prev.map(asset =>
                asset.id === payload.new.id ? payload.new as Asset : asset
              )
            )
          } else if (payload.eventType === 'DELETE') {
            console.log('Deleting asset via real-time:', payload.old)
            setAssets(prev =>
              prev.filter(asset => asset.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe((status) => {
        console.log('Asset subscription status:', status, 'for job:', jobId, 'tenant:', tenantId)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [jobId, tenantId])

  const addAsset = async (assetData: Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    if (!tenantId) throw new Error('Tenant not loaded')
    if (!currentUser) throw new Error('User not authenticated')

    console.log('Adding asset with data:', { ...assetData, created_by: currentUser.id })

    try {
      const { data, error } = await supabase
        .from('assets')
        .insert({
          ...assetData,
          created_by: currentUser.id
        })
        .select()
        .single()

      if (error) throw error
      console.log('Asset added successfully:', data)
      return data
    } catch (error) {
      console.error('Error adding asset:', error)
      throw error
    }
  }

  const updateAsset = async (id: string, updates: Partial<Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'created_by'>>) => {
    if (!tenantId) throw new Error('Tenant not loaded')

    try {
      const { data, error } = await supabase
        .from('assets')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating asset:', error)
      throw error
    }
  }

  const deleteAsset = async (id: string) => {
    if (!tenantId) throw new Error('Tenant not loaded')

    console.log('Deleting asset with id:', id)

    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id)

      if (error) throw error
      console.log('Asset deleted successfully:', id)
    } catch (error) {
      console.error('Error deleting asset:', error)
      throw error
    }
  }

  const getAssetById = (id: string) => {
    return assets.find(asset => asset.id === id)
  }

  const refreshAssets = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAssets(data || [])
    } catch (error) {
      console.error('Error refreshing assets:', error)
      setAssets([])
    } finally {
      setLoading(false)
    }
  }

  return {
    assets,
    loading,
    addAsset,
    updateAsset,
    deleteAsset,
    getAssetById,
    refreshAssets
  }
}
