# Project Thunderbolt - PWA

A modern Progressive Web App (PWA) with mobile-first design, featuring Google and Apple sign-in authentication.

## Features

- ✅ **Progressive Web App (PWA)** - Installable and works offline
- ✅ **Mobile-First Design** - Optimized for mobile devices with responsive layout
- ✅ **Google Sign-In** - Authenticate using Google OAuth
- ✅ **Apple Sign-In** - Authenticate using Apple ID
- ✅ **Modern UI** - Beautiful, clean interface built with Tailwind CSS
- ✅ **TypeScript** - Type-safe codebase
- ✅ **React Router** - Client-side routing
- ✅ **Supabase Authentication** - Secure authentication backend

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- A Supabase project with Authentication enabled

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Preview production build:**
   ```bash
   npm run preview
   ```

## Vercel Deployment

### Prerequisites

- A Vercel account ([vercel.com](https://vercel.com))
- Your Supabase project URL and anon key

### Deploy to Vercel

#### Option 1: Vercel CLI (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables:**
   In the Vercel dashboard or via CLI:
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```

#### Option 2: GitHub Integration

1. **Connect Repository:**
   - Push your code to GitHub
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Environment Variables:**
   - In Vercel dashboard, go to your project settings
   - Navigate to "Environment Variables"
   - Add:
     - `VITE_SUPABASE_URL`: Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

3. **Deploy:**
   - Vercel will automatically deploy on every push to main branch
   - Or click "Deploy" manually

### Environment Variables

Your `.env` file should contain:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Custom Domain (Optional)

To use custom domains for multi-tenancy:

1. **Add domains in Vercel:**
   - In Vercel dashboard, go to your project settings
   - Navigate to "Domains"
   - Add your tenant domains

2. **Domain-based tenant routing:**
   - The app automatically detects tenant from the domain
   - Configure tenant domains in your Supabase `tenants` table

## Supabase Authentication Setup


### Apple Sign-In

1. In Supabase Dashboard, go to Authentication > Providers
2. Click on Apple and enable it
3. You'll need:
   - Apple Developer account
   - Service ID configured in Apple Developer Console
   - OAuth redirect URL from Supabase
4. Follow Supabase's guide for complete Apple setup

## PWA Features

The app includes:
- Service Worker for offline support
- Web App Manifest for installability
- Responsive design optimized for mobile
- Safe area insets for notched devices

## Project Structure

```
src/
├── components/       # React components
│   ├── SignIn.tsx   # Sign-in page
│   └── Dashboard.tsx # Main dashboard
├── context/         # React context providers
│   └── AuthContext.tsx # Authentication context
├── supabase/       # Supabase configuration
│   └── config.ts   # Supabase setup
├── App.tsx          # Main app component
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## Technologies

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Supabase** - Authentication backend
- **React Router** - Client-side routing
- **Vite PWA Plugin** - PWA support

## License

MIT

