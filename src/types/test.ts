export type TestInputType = 'number' | 'text' | 'boolean'

export type TestExpectedType = 'range' | 'minimum' | 'maximum' | 'exact'

export interface TestInput {
  id: string
  test_id: string
  label: string
  input_type: TestInputType
  unit?: string | null
  position: number
  expected_type: TestExpectedType
  expected_min?: number | null
  expected_max?: number | null
  expected_value?: number | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface Test {
  id: string
  job_id: string
  asset_id?: string | null
  name: string
  description?: string | null
  instructions?: string | null
  created_by?: string
  created_at: string
  updated_at: string
  test_inputs?: TestInput[]
}

export interface TestInputDraft {
  label: string
  inputType: TestInputType
  unit?: string
  expectedType: TestExpectedType
  expectedMin?: number | null
  expectedMax?: number | null
  expectedValue?: number | null
  notes?: string
}

export interface CreateTestPayload {
  name: string
  description?: string
  instructions?: string
  jobId: string
  assetId?: string | null
  inputs: TestInputDraft[]
}

