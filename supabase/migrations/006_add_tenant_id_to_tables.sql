-- Add tenant_id to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to test_equipment table
ALTER TABLE public.test_equipment 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to job_assignments table
ALTER TABLE public.job_assignments 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Create indexes for tenant_id
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_id ON public.jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_test_equipment_tenant_id ON public.test_equipment(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_tenant_id ON public.job_assignments(tenant_id);

-- Create composite indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_user_tenant ON public.jobs(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_test_equipment_user_tenant ON public.test_equipment(user_id, tenant_id);


