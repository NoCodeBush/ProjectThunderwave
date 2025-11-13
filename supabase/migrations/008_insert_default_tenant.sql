-- Insert default tenant for localhost development
-- This allows the app to work immediately after migrations are run
INSERT INTO public.tenants (domain, primary_color, logo_url)
VALUES 
  ('localhost', '#3b82f6', NULL),
  ('127.0.0.1', '#3b82f6', NULL)
ON CONFLICT (domain) DO UPDATE 
SET 
  primary_color = EXCLUDED.primary_color,
  logo_url = EXCLUDED.logo_url;

