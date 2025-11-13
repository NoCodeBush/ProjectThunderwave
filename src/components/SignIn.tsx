import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { MESSAGES } from '../constants'
import Input from './ui/Input'
import Button from './ui/Button'

const SignIn: React.FC = () => {
  const { 
    signInWithGoogle, 
    signInWithApple, 
    signInWithEmail, 
    signUpWithEmail, 
    resetPassword 
  } = useAuth()
  
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState<'email' | 'google' | 'apple' | 'reset' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailError(MESSAGES.INVALID_EMAIL)
      return false
    }
    setEmailError(null)
    return true
  }

  const validatePassword = (password: string): boolean => {
    if (password.length < 6) {
      setPasswordError(MESSAGES.WEAK_PASSWORD)
      return false
    }
    setPasswordError(null)
    return true
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!validateEmail(email)) return
    if (mode === 'reset') {
      try {
        setLoading('reset')
        await resetPassword(email)
        setSuccess(MESSAGES.PASSWORD_RESET_SENT)
        setMode('signin')
        setEmail('')
      } catch (err: any) {
        setError(err.message || MESSAGES.PASSWORD_RESET_FAILED)
      } finally {
        setLoading(null)
      }
      return
    }

    if (!validatePassword(password)) return

    try {
      setLoading('email')
      if (mode === 'signup') {
        await signUpWithEmail(email, password)
        setSuccess('Account created! Please check your email to verify your account.')
        setMode('signin')
        setPassword('')
      } else {
        await signInWithEmail(email, password)
      }
    } catch (err: any) {
      setError(err.message || (mode === 'signup' ? MESSAGES.SIGN_UP_EMAIL_FAILED : MESSAGES.SIGN_IN_EMAIL_FAILED))
    } finally {
      setLoading(null)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading('google')
      setError(null)
      await signInWithGoogle()
    } catch (err: any) {
      setError(err.message || MESSAGES.SIGN_IN_GOOGLE_FAILED)
    } finally {
      setLoading(null)
    }
  }

  const handleAppleSignIn = async () => {
    try {
      setLoading('apple')
      setError(null)
      await signInWithApple()
    } catch (err: any) {
      setError(err.message || MESSAGES.SIGN_IN_APPLE_FAILED)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 safe-area-inset">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-500 rounded-2xl mb-4 shadow-lg">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Thunderbolt</h1>
          <p className="text-gray-600 text-sm">{MESSAGES.SIGN_IN_TO_CONTINUE}</p>
        </div>

        {/* Sign In Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
            <Input
              label={MESSAGES.EMAIL}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (emailError) setEmailError(null)
              }}
              error={emailError || undefined}
              required
              disabled={loading !== null}
            />

            {mode !== 'reset' && (
              <Input
                label={MESSAGES.PASSWORD}
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (passwordError) setPasswordError(null)
                }}
                error={passwordError || undefined}
                required
                disabled={loading !== null}
              />
            )}

            {mode === 'signin' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset')
                    setError(null)
                    setSuccess(null)
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  {MESSAGES.FORGOT_PASSWORD}
                </button>
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              disabled={loading !== null}
            >
              {loading === 'email' || loading === 'reset' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : mode === 'reset' ? (
                MESSAGES.RESET_PASSWORD
              ) : mode === 'signup' ? (
                MESSAGES.SIGN_UP
              ) : (
                MESSAGES.SIGN_IN
              )}
            </Button>

            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => {
                  setMode('signin')
                  setError(null)
                  setSuccess(null)
                }}
                className="w-full text-sm text-gray-600 hover:text-gray-700 font-medium"
              >
                Back to sign in
              </button>
            )}

            {mode !== 'reset' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin')
                    setError(null)
                    setSuccess(null)
                    setEmailError(null)
                    setPasswordError(null)
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  {mode === 'signin' ? MESSAGES.DONT_HAVE_ACCOUNT : MESSAGES.ALREADY_HAVE_ACCOUNT}
                </button>
              </div>
            )}
          </form>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">{MESSAGES.OR_CONTINUE_WITH}</span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-4">
            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading === 'google' ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              <span>{MESSAGES.CONTINUE_GOOGLE}</span>
            </button>

            {/* Apple Sign In Button */}
            <button
              onClick={handleAppleSignIn}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-black text-white rounded-xl font-medium hover:bg-gray-900 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading === 'apple' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
              )}
              <span>{MESSAGES.CONTINUE_APPLE}</span>
            </button>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignIn

