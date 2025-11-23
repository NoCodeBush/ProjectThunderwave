import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase/config'
import { useCurrentTenantId } from './useCurrentTenantId'
import { useAuth } from '../context/AuthContext'
import { useAssets } from './useAssets'
import { CreateTestPayload, SaveTestResultPayload, Test, TestResult } from '../types/test'

interface UseTestsOptions {
  jobId?: string
  assetId?: string
  unlinkedOnly?: boolean
  includeInputs?: boolean
  includeResults?: boolean
  includeJobAssetTypes?: boolean
}

export const useTests = (options: UseTestsOptions = {}) => {
  const { jobId, assetId, unlinkedOnly = false, includeInputs = true, includeResults = true, includeJobAssetTypes = false } = options
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

      const selectColumns = [
        '*',
        includeInputs ? 'test_inputs(*)' : null,
        includeResults ? 'test_results(*)' : null
      ]
        .filter(Boolean)
        .join(', ')

      let query = supabase
        .from('tests')
        .select(selectColumns)
        .order('created_at', { ascending: false })

      if (includeResults) {
        query = query.order('submitted_at', { ascending: false, foreignTable: 'test_results' })
      }

      // Get asset types for the job if we need to include them
      let jobAssetTypes: string[] = []
      if (includeJobAssetTypes && jobId) {
        const { data: jobAssets } = await supabase
          .from('assets')
          .select('asset_type')
          .eq('job_id', jobId)

        jobAssetTypes = (jobAssets || [])
          .map(asset => asset.asset_type)
          .filter(Boolean)
      }

      // Build the query filter
      if (jobId) {
        if (includeJobAssetTypes && jobAssetTypes.length > 0) {
          // Include tests that are either directly linked to the job OR match the job's asset types
          query = query.or(`job_id.eq.${jobId},asset_type.in.(${jobAssetTypes.join(',')})`)
        } else {
          // Only include tests directly linked to the job
          query = query.eq('job_id', jobId)
        }
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
          : undefined,
        test_results: row.test_results || []
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

    const { inputs, name, description, instructions, jobId, assetType } = payload

    if (!inputs || inputs.length === 0) {
      throw new Error('At least one test input is required')
    }

    const { data: testRecord, error: insertError } = await supabase
      .from('tests')
      .insert({
        job_id: jobId || null,
        asset_type: assetType || null,
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

  const saveTestResult = async (payload: SaveTestResultPayload) => {
    if (!currentUser) throw new Error('User not authenticated')

    const { testId, jobId: payloadJobId, assetIds, responses, status = 'submitted', resultId } = payload

    if (!testId) {
      throw new Error('A test must be specified before saving results')
    }

    if (!assetIds || assetIds.length === 0) {
      throw new Error('At least one asset must be specified before saving results')
    }

    if (!responses || responses.length === 0) {
      throw new Error('At least one response is required to save results')
    }

    const baseData = {
      test_id: testId,
      job_id: payloadJobId,
      asset_id: assetIds[0] || null, // Keep for backward compatibility, but we'll use the junction table
      responses,
      status,
      submitted_by: currentUser.id
    }

    let result: TestResult | null = null

    if (resultId) {
      const { data, error } = await supabase
        .from('test_results')
        .update({
          ...baseData,
          submitted_at: new Date().toISOString()
        })
        .eq('id', resultId)
        .select()
        .single()

      if (error) {
        console.error('Error updating test result:', error)
        throw error
      }

      result = data as TestResult
    } else {
      const { data, error } = await supabase
        .from('test_results')
        .insert(baseData)
        .select()
        .single()

      if (error) {
        console.error('Error saving test result:', error)
        throw error
      }

      result = data as TestResult
    }

    // Save asset relationships
    if (result && assetIds.length > 0) {
      // Delete existing asset relationships for this result
      await supabase
        .from('test_result_assets')
        .delete()
        .eq('test_result_id', result.id)

      // Insert new asset relationships
      const assetRelationships = assetIds.map(assetId => ({
        test_result_id: result.id,
        asset_id: assetId
      }))

      const { error: assetError } = await supabase
        .from('test_result_assets')
        .insert(assetRelationships)

      if (assetError) {
        console.error('Error saving test result asset relationships:', assetError)
        throw assetError
      }
    }

    await fetchTests()
    return result
  }

  return {
    tests,
    loading,
    error,
    createTest,
    saveTestResult,
    linkTestToAsset,
    unlinkTestFromAsset,
    deleteTest,
    refresh: fetchTests
  }
}

