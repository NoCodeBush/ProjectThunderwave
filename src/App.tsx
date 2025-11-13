import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { TenantProvider } from './context/TenantContext'
import { useTenantSettings } from './hooks/useTenantSettings'
import { ROUTES } from './constants/routes'
import SignIn from './components/SignIn'
import Dashboard from './components/Dashboard'
import Admin from './components/Admin'
import JobDetails from './components/JobDetails'
import AssetManagement from './components/AssetManagement'

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth()
  return currentUser ? (
    <>{children}</>
  ) : (
    <Navigate to={ROUTES.SIGN_IN} replace />
  )
}

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth()
  return !currentUser ? (
    <>{children}</>
  ) : (
    <Navigate to={ROUTES.DASHBOARD} replace />
  )
}

function AppRoutes() {
  // Apply tenant settings (colors, logo) globally
  useTenantSettings()
  
  return (
    <Routes>
      <Route
        path={ROUTES.SIGN_IN}
        element={
          <PublicRoute>
            <SignIn />
          </PublicRoute>
        }
      />
      <Route
        path={ROUTES.DASHBOARD}
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN}
        element={
          <PrivateRoute>
            <Admin />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.JOB_DETAILS}
        element={
          <PrivateRoute>
            <JobDetails />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.ASSET_MANAGEMENT}
        element={
          <PrivateRoute>
            <AssetManagement />
          </PrivateRoute>
        }
      />
      <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <TenantProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </TenantProvider>
    </Router>
  )
}

export default App

