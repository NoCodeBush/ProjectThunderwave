# Supabase Storage Setup for Images

## Setting up the Job Images Storage Bucket

### 1. Create Storage Bucket

In your Supabase Dashboard:

1. Go to **Storage** in the sidebar
2. Click **Create bucket**
3. Set bucket name: `job-images`
4. **Make it PUBLIC** (check the "Public" option) for simple access
5. Click **Create bucket**

### 2. Configure Bucket Policies (Public Bucket)

Since the bucket is public, we use simple RLS policies for access control:

#### Allow Authenticated Users to Upload
```sql
-- Allow authenticated users to upload files to job folders
CREATE POLICY "Users can upload job images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'job-images'
  AND auth.role() = 'authenticated'
);
```

#### Allow Public Read Access
```sql
-- Since bucket is public, allow anyone to read images
-- Access control is handled by database RLS policies
CREATE POLICY "Public can view job images"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-images');
```

#### Allow Users to Delete Their Uploaded Images
```sql
-- Allow users to delete images they uploaded
-- File paths are stored as: {jobId}/{fileName} (relative to bucket)
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'job-images'
  AND EXISTS (
    SELECT 1 FROM job_images
    WHERE file_path = name
    AND uploaded_by = auth.uid()
  )
);
```

### 3. How It Works (Public Bucket + Direct URLs)

With a public bucket, images are directly accessible via public URLs:

1. **Upload**: Images are stored in Supabase Storage with public access
2. **Access**: Direct public URLs are constructed for viewing
3. **Security**: Access control handled by database RLS policies
4. **Database**: Image metadata stored with proper access controls

**Benefits of Public Bucket:**
- ✅ **Simplicity**: No signed URL generation complexity
- ✅ **Performance**: Direct URLs load instantly
- ✅ **Reliability**: No expiration or generation failures
- ✅ **Caching**: Browsers can cache public URLs
- ✅ **Ease of Use**: Simple direct links for sharing

### 4. File Structure

Images are stored with this structure within the `job-images` bucket:
```
job-images bucket:
├── {jobId}/
│   ├── {timestamp}-{random}.{ext}
│   └── {timestamp}-{random}.{ext}
└── {jobId}/
    └── ...

Database file_path stores: {jobId}/{timestamp}-{random}.{ext}
Public URL format: https://project.supabase.co/storage/v1/object/public/job-images/{file_path}
```

### 5. Public URL Generation

The app constructs public URLs directly:
- Format: `{supabaseUrl}/storage/v1/object/public/job-images/{filePath}`
- No expiration or authentication required
- Access control via database policies only

### 6. Testing

After setup, test by:

1. Going to a job's Image/Scan page
2. Uploading an image
3. Verifying it appears in the gallery (public URL generated)
4. Testing download functionality (direct download link)
5. Testing delete functionality

### 7. Troubleshooting

**Images not loading:**
- Check browser console for public URL generation
- Verify bucket is public and accessible
- Ensure database record exists with correct file_path

**Upload fails:**
- Check storage upload policies
- Verify user is authenticated
- Confirm bucket exists and is public

**Public URL errors:**
- Verify bucket is public (not private)
- Check file_path format in database
- Ensure file was actually uploaded to storage

**Download fails:**
- Verify file exists in storage at the correct path
- Check public URL format
- Ensure bucket allows public access

### 8. Troubleshooting Public Bucket Issues

For public bucket issues:

#### **Step 1: Check Bucket Setup**
1. Go to Supabase Dashboard → Storage
2. Verify `job-images` bucket exists
3. Ensure it's **public** (check the "Public" option)
4. Check that upload policies are applied

#### **Step 2: Check Database Records**
- Verify job_images table has records with correct file_path
- Check that file_path format is `{jobId}/{filename}`

#### **Step 3: Debug with Browser Console**
Open browser DevTools when loading the Image/Scan page:
```
✅ Generated public URL for image.jpg: https://project.supabase.co/storage/v1/object/public/job-images/...
```

#### **Step 4: Test Public URLs**
- Copy the generated URL from console
- Paste in browser to test direct access
- Should load image if file exists and bucket is public

#### **Step 5: Check Storage Contents**
```sql
-- List all files in the job-images bucket
SELECT name, updated_at FROM storage.objects
WHERE bucket_id = 'job-images'
ORDER BY updated_at DESC
LIMIT 20;
```

#### **Step 6: Verify File Upload**
```sql
-- Check recent uploads
SELECT id, filename, file_path, created_at FROM job_images
ORDER BY created_at DESC LIMIT 5;
```

#### **Common Issues:**
- **Bucket not public**: Make sure "Public" is checked in bucket settings
- **Wrong file paths**: Ensure paths don't have double "job-images/"
- **Upload failures**: Check storage policies allow inserts
- **CORS issues**: Public buckets should work from any domain


## Security Notes

- ⚠️ **Public Bucket**: Images are publicly accessible via direct URLs
- ✅ **Database RLS**: Security handled by database policies only
- ✅ **Authenticated Upload**: Only authenticated users can upload
- ✅ **URL Access**: Anyone with the URL can view images
- 🛡️ **Access Control**: Relies on not sharing URLs publicly
- 📝 **Audit Trail**: Uploads are tracked in database
