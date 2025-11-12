import { useState, useEffect } from 'react'
import { TestEquipment } from '../types/testEquipment'
import { CONFIG } from '../constants/config'
import { calculateExpiryDate } from '../utils/date'

const STORAGE_KEY = CONFIG.STORAGE_KEYS.TEST_EQUIPMENT

export const useTestEquipment = () => {
  const [equipment, setEquipment] = useState<TestEquipment[]>([])

  useEffect(() => {
    // Load equipment from localStorage
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setEquipment(parsed)
      } catch {
        setEquipment([])
      }
    }
  }, [])

  const addEquipment = (name: string, serialNumber: string, dateTest: string) => {
    const newEquipment: TestEquipment = {
      id: Date.now().toString(),
      name,
      serialNumber,
      dateTest,
      expiry: calculateExpiryDate(dateTest)
    }

    const updated = [newEquipment, ...equipment]
    setEquipment(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const deleteEquipment = (id: string) => {
    const updated = equipment.filter(item => item.id !== id)
    setEquipment(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  // Sort by date test (newest first)
  const sortedEquipment = [...equipment].sort((a, b) => 
    new Date(b.dateTest).getTime() - new Date(a.dateTest).getTime()
  )

  return {
    equipment: sortedEquipment,
    addEquipment,
    deleteEquipment
  }
}

