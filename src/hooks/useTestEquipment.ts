import { useState, useEffect } from 'react'
import { supabase } from '../supabase/config'
import { useCurrentTenantId } from './useCurrentTenantId'
import { TestEquipment } from '../types/testEquipment'
import { calculateExpiryDate } from '../utils/date'

export const useTestEquipment = () => {
  const [equipment, setEquipment] = useState<TestEquipment[]>([])
  const [loading, setLoading] = useState(true)
  const tenantId = useCurrentTenantId()

  useEffect(() => {
    if (!tenantId) {
      setEquipment([])
      setLoading(false)
      return
    }

    loadEquipment()
  }, [tenantId])

  const loadEquipment = async () => {
    try {
      setLoading(true)
      console.log('🔧 Loading equipment for tenant:', tenantId)

      // Get all equipment in the tenant with user info
      const { data: equipmentData, error } = await supabase
        .from('test_equipment')
        .select(`
          *,
          user_tenant_profiles!user_id (
            email,
            display_name
          )
        `)
        .eq('tenant_id', tenantId)
        .order('date_test', { ascending: false })

      if (error) {
        console.error('🔧 Error loading equipment:', error)
        throw error
      }

      console.log('🔧 Raw equipment data:', equipmentData)

      const transformedEquipment: TestEquipment[] = (equipmentData || []).map((row: any) => {
        console.log('🔧 Transforming row:', row)
        return {
          id: row.id,
          name: row.name,
          serialNumber: row.serial_number,
          dateTest: row.date_test,
          expiry: row.expiry,
          userId: row.user_id,
          assignedUserName: row.user_tenant_profiles?.display_name || row.user_tenant_profiles?.email || 'Unknown User'
        }
      })

      console.log('🔧 Transformed equipment:', transformedEquipment)
      setEquipment(transformedEquipment)
    } catch (error) {
      console.error('Error loading equipment:', error)
      setEquipment([])
    } finally {
      setLoading(false)
    }
  }

  const addEquipment = async (name: string, serialNumber: string, dateTest: string, userId: string) => {
    if (!tenantId) throw new Error('Tenant not loaded')

    try {
      const expiry = calculateExpiryDate(dateTest)

      const { error } = await supabase
        .from('test_equipment')
        .insert({
          name,
          serial_number: serialNumber,
          date_test: dateTest,
          expiry,
          user_id: userId,
          tenant_id: tenantId
        })

      if (error) throw error

      // Reload equipment to get updated list
      await loadEquipment()
    } catch (error) {
      console.error('Error adding equipment:', error)
      throw error
    }
  }

  const deleteEquipment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('test_equipment')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Update local state
      setEquipment(prev => prev.filter(item => item.id !== id))
    } catch (error) {
      console.error('Error deleting equipment:', error)
      throw error
    }
  }

  return {
    equipment,
    loading,
    addEquipment,
    deleteEquipment
  }
}

