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

2. **Set up Supabase:**
   - Go to [Supabase Dashboard](https://app.supabase.com/)
   - Create a new project or use an existing one
   - Enable Authentication providers:
     - Go to Authentication > Providers
     - Enable **Google** provider and configure OAuth credentials
     - Enable **Apple** provider (requires Apple Developer account)
   - Get your Supabase configuration:
     - Go to Project Settings > API
     - Copy your Project URL and anon/public key

3. **Configure environment variables:**
   - Copy `env.example` to `.env`
   - Fill in your Supabase configuration values:
     ```env
     VITE_SUPABASE_URL=your-project-url
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```

6. **Preview production build:**
   ```bash
   npm run preview
   ```

## Supabase Authentication Setup

### Google Sign-In

1. In Supabase Dashboard, go to Authentication > Providers
2. Click on Google and enable it
3. Add your Google OAuth credentials (Client ID and Client Secret)
4. Add the redirect URL: `https://your-project-ref.supabase.co/auth/v1/callback`
5. Save the changes

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

