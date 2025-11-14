import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase/config'
import { useCurrentTenantId } from './useCurrentTenantId'
import { useAuth } from '../context/AuthContext'
import { CreateTestPayload, Test } from '../types/test'

interface UseTestsOptions {
  jobId?: string
  assetId?: string
  unlinkedOnly?: boolean
  includeInputs?: boolean
}

export const useTests = (options: UseTestsOptions = {}) => {
  const { jobId, assetId, unlinkedOnly = false, includeInputs = true } = options
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const tenantId = useCurrentTenantId()
  const { currentUser } = useAuth()

  const fetchTests = useCallback(async () => {
    if (!tenantId || !currentUser) {
      setTests([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('tests')
        .select(includeInputs ? '*, test_inputs(*)' : '*')
        .order('created_at', { ascending: false })

      if (jobId) {
        query = query.eq('job_id', jobId)
      }

      if (unlinkedOnly) {
        query = query.is('asset_id', null)
      } else if (assetId) {
        query = query.eq('asset_id', assetId)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      const normalized = (data || []).map((row: any) => ({
        ...row,
        test_inputs: row.test_inputs
          ? [...row.test_inputs].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          : undefined
      })) as Test[]

      setTests(normalized)
    } catch (err) {
      console.error('Error loading tests:', err)
      setError(err instanceof Error ? err.message : 'Failed to load tests')
      setTests([])
    } finally {
      setLoading(false)
    }
  }, [tenantId, currentUser, jobId, assetId, unlinkedOnly, includeInputs])

  useEffect(() => {
    fetchTests()

    if (!tenantId || !currentUser) {
      return
    }

    const channel = supabase
      .channel(`tests_${tenantId}_${jobId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tests',
          ...(jobId ? { filter: `job_id=eq.${jobId}` } : {})
        },
        () => fetchTests()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_inputs'
        },
        () => fetchTests()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTests, tenantId, currentUser, jobId])

  const createTest = async (payload: CreateTestPayload) => {
    if (!currentUser) throw new Error('User not authenticated')

    const { inputs, name, description, instructions, jobId: payloadJobId, assetId: payloadAssetId } = payload

    if (!payloadJobId) {
      throw new Error('A job must be selected before creating a test')
    }

    if (!inputs || inputs.length === 0) {
      throw new Error('At least one test input is required')
    }

    const { data: testRecord, error: insertError } = await supabase
      .from('tests')
      .insert({
        job_id: payloadJobId,
        asset_id: payloadAssetId || null,
        name,
        description: description || null,
        instructions: instructions || null,
        created_by: currentUser.id
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating test:', insertError)
      throw insertError
    }

    if (inputs.length > 0) {
      const formattedInputs = inputs.map((input, index) => ({
        test_id: testRecord.id,
        label: input.label,
        input_type: input.inputType,
        unit: input.unit || null,
        position: index,
        expected_type: input.expectedType,
        expected_min: input.expectedMin ?? null,
        expected_max: input.expectedMax ?? null,
        expected_value: input.expectedValue ?? null,
        notes: input.notes || null
      }))

      const { error: inputsError } = await supabase
        .from('test_inputs')
        .insert(formattedInputs)

      if (inputsError) {
        console.error('Error creating test inputs:', inputsError)
        throw inputsError
      }
    }

    await fetchTests()
    return testRecord as Test
  }

  const linkTestToAsset = async (testId: string, assetIdToLink: string, assetJobId: string) => {
    const { error: updateError } = await supabase
      .from('tests')
      .update({
        asset_id: assetIdToLink,
        job_id: assetJobId
      })
      .eq('id', testId)

    if (updateError) {
      console.error('Error linking test to asset:', updateError)
      throw updateError
    }

    await fetchTests()
  }

  const unlinkTestFromAsset = async (testId: string) => {
    const { error: updateError } = await supabase
      .from('tests')
      .update({
        asset_id: null
      })
      .eq('id', testId)

    if (updateError) {
      console.error('Error unlinking test from asset:', updateError)
      throw updateError
    }

    await fetchTests()
  }

  const deleteTest = async (testId: string) => {
    const { error: deleteError } = await supabase
      .from('tests')
      .delete()
      .eq('id', testId)

    if (deleteError) {
      console.error('Error deleting test:', deleteError)
      throw deleteError
    }

    setTests(prev => prev.filter(test => test.id !== testId))
  }

  return {
    tests,
    loading,
    error,
    createTest,
    linkTestToAsset,
    unlinkTestFromAsset,
    deleteTest,
    refresh: fetchTests
  }
}

