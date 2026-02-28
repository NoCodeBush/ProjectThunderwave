import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase/config'
import { useCurrentTenantId } from './useCurrentTenantId'
import { useAuth } from '../context/AuthContext'
import { CreateTestPayload, SaveTestResultPayload, Test, TestResult } from '../types/test'

interface UseTestsOptions {
  jobId?: string
  includeInputs?: boolean
  includeResults?: boolean
  includeJobAssetTypes?: boolean
}

export const useTests = (options: UseTestsOptions = {}) => {
  const { jobId, includeInputs = true, includeResults = true, includeJobAssetTypes = false } = options
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
        
        // Remove duplicates
        jobAssetTypes = [...new Set(jobAssetTypes)]
      }

      // Filter by tenant - tests are tenant-scoped
      query = query.eq('tenant_id', tenantId)

      // When filtering by job asset types, only show tests that match those asset types
      if (includeJobAssetTypes && jobAssetTypes.length > 0) {
        query = query.in('asset_type', jobAssetTypes)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      const normalized = (data || []).map((row: any) => {
        // Parse table layouts from test inputs
        const testInputs = row.test_inputs
          ? [...row.test_inputs].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          : undefined
        
        return {
          ...row,
          test_inputs: testInputs,
          test_results: row.test_results || []
        } as Test
      })

      setTests(normalized)
    } catch (err) {
      console.error('Error loading tests:', err)
      setError(err instanceof Error ? err.message : 'Failed to load tests')
      setTests([])
    } finally {
      setLoading(false)
    }
  }, [tenantId, currentUser, jobId, includeInputs, includeJobAssetTypes])

  useEffect(() => {
    fetchTests()

    if (!tenantId || !currentUser) {
      return
    }

    const channel = supabase
      .channel(`tests_${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tests',
          filter: `tenant_id=eq.${tenantId}`
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
  }, [fetchTests, tenantId, currentUser])

  const createTest = async (payload: CreateTestPayload) => {
    if (!currentUser) throw new Error('User not authenticated')

    const { inputs, name, description, instructions, assetType } = payload

    if (!tenantId) {
      throw new Error('Tenant context is required to create tests')
    }

    if (!inputs || inputs.length === 0) {
      throw new Error('At least one test input is required')
    }

    if (!assetType) {
      throw new Error('An asset type must be specified for the test')
    }

    const { data: testRecord, error: insertError } = await supabase
      .from('tests')
      .insert({
        tenant_id: tenantId,
        asset_type: assetType,
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
      const formattedInputs = inputs.map((input, index) => {
        return {
          test_id: testRecord.id,
          label: input.label,
          input_type: input.inputType,
          unit: input.unit || null,
          position: index,
          expected_type: input.expectedType,
          expected_min: input.expectedMin ?? null,
          expected_max: input.expectedMax ?? null,
          expected_value: input.expectedValue ?? null,
          notes: input.notes || null,
          table_layout: input.inputType === 'table' && input.tableLayout ? input.tableLayout : null,
          nested_table_layout: input.inputType === 'nested_table' && input.nestedTableLayout ? input.nestedTableLayout : null
        }
      })

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
      asset_id: assetIds[0] || null,
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

    await fetchTests()
    return result
  }

  return {
    tests,
    loading,
    error,
    createTest,
    saveTestResult,
    deleteTest,
    refresh: fetchTests
  }
}

