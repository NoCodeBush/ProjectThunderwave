# 🚀 Vercel Deployment Guide

## Quick Start

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy
```bash
# Run the deployment script (Linux/Mac)
./deploy.sh

# Or manually
vercel --prod
```

### 4. Set Environment Variables

In the Vercel dashboard (or via CLI):

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

Use the values from your `.env` file:
- `VITE_SUPABASE_URL=https://your-project-id.supabase.co`
- `VITE_SUPABASE_ANON_KEY=your-anon-key-here`

## What's Configured

### ✅ Build Configuration
- **Framework**: Vite (React + TypeScript)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **SPA Routing**: All routes redirect to `index.html`

### ✅ PWA Support
- Service Worker with auto-update
- Web App Manifest
- Offline support
- Installable as mobile app

### ✅ Environment Variables
- Supabase URL and API key
- Secure handling (not exposed to client)

### ✅ Performance
- Automatic code splitting
- Asset optimization
- Gzip compression
- CDN delivery

## Multi-Tenant Configuration

For domain-based multi-tenancy:

1. **Add domains in Vercel:**
   - Project Settings → Domains
   - Add each tenant domain

2. **Configure tenants in Supabase:**
   - Add domain entries to `tenants` table
   - App automatically detects tenant from domain

## Troubleshooting

### Build Fails
```bash
# Test build locally first
npm run build
```

### Environment Variables Missing
```bash
# Check current env vars
vercel env ls

# Add missing vars
vercel env add VARIABLE_NAME
```

### PWA Not Working
- Check that service worker is registered
- Verify manifest.json is accessible
- Ensure HTTPS is enabled (required for PWA)

## File Structure

```
📁 Project Root
├── 📄 vercel.json          # Vercel configuration
├── 📄 .vercelignore       # Files to ignore during deployment
├── 📄 deploy.sh           # Deployment script (Unix)
├── 📄 deploy.bat          # Deployment script (Windows)
├── 📁 dist/               # Build output (auto-generated)
└── 📄 .env               # Environment variables (local only)
```

## Security Notes

- ✅ Environment variables are encrypted
- ✅ `.env` file is in `.gitignore`
- ✅ No sensitive data in client bundle
- ✅ HTTPS enforced by Vercel
- ✅ Domain validation for multi-tenancy

## Support

- 📚 [Vercel Documentation](https://vercel.com/docs)
- 🐛 [Vercel Support](https://vercel.com/support)
- 📱 [Supabase Docs](https://supabase.com/docs)

---

🎉 **Happy Deploying!** Your PWA is ready for the world.
