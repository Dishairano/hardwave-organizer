import { app, safeStorage } from 'electron'
import path from 'path'
import fs from 'fs'

const API_BASE = 'https://hardwavestudios.com/api'
const AUTH_FILE = path.join(app.getPath('userData'), 'auth.json')

interface AuthData {
  token: string
  user: {
    id: number
    email: string
    displayName: string | null
    isAdmin: boolean
  }
  subscription: {
    status: string
    planName: string
    currentPeriodEnd: string
  } | null
}

let cachedAuth: AuthData | null = null

// Save auth data securely
export function saveAuth(data: AuthData): void {
  try {
    const jsonStr = JSON.stringify(data)

    // Use safeStorage if available (encrypted storage)
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(jsonStr)
      fs.writeFileSync(AUTH_FILE, encrypted)
    } else {
      // Fallback to plain JSON (less secure but functional)
      fs.writeFileSync(AUTH_FILE, jsonStr)
    }

    cachedAuth = data
  } catch (error) {
    console.error('Failed to save auth data:', error)
  }
}

// Load auth data
export function loadAuth(): AuthData | null {
  if (cachedAuth) return cachedAuth

  try {
    if (!fs.existsSync(AUTH_FILE)) return null

    const fileContent = fs.readFileSync(AUTH_FILE)

    // Try to decrypt if encryption is available
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const decrypted = safeStorage.decryptString(fileContent)
        cachedAuth = JSON.parse(decrypted)
        return cachedAuth
      } catch {
        // File might be in plain JSON format
        cachedAuth = JSON.parse(fileContent.toString())
        return cachedAuth
      }
    } else {
      cachedAuth = JSON.parse(fileContent.toString())
      return cachedAuth
    }
  } catch (error) {
    console.error('Failed to load auth data:', error)
    return null
  }
}

// Clear auth data (logout)
export function clearAuth(): void {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      fs.unlinkSync(AUTH_FILE)
    }
    cachedAuth = null
  } catch (error) {
    console.error('Failed to clear auth data:', error)
  }
}

// Login with email and password
export async function login(email: string, password: string): Promise<{ success: boolean; error?: string; data?: AuthData }> {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const result = await response.json()

    if (!result.success) {
      return { success: false, error: result.error || 'Login failed' }
    }

    // Fetch subscription status
    const subResponse = await fetch(`${API_BASE}/subscription`, {
      headers: { 'Authorization': `Bearer ${result.token}` },
    })

    let subscription = null
    if (subResponse.ok) {
      const subResult = await subResponse.json()
      if (subResult.success && subResult.subscription) {
        subscription = {
          status: subResult.subscription.status,
          planName: subResult.subscription.planName,
          currentPeriodEnd: subResult.subscription.currentPeriodEnd,
        }
      }
    }

    const authData: AuthData = {
      token: result.token,
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.display_name,
        isAdmin: result.user.isAdmin,
      },
      subscription,
    }

    saveAuth(authData)

    return { success: true, data: authData }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'Connection failed. Please check your internet.' }
  }
}

// Verify current session and subscription
export async function verifySession(): Promise<{ valid: boolean; hasSubscription: boolean; data?: AuthData }> {
  const auth = loadAuth()

  if (!auth) {
    return { valid: false, hasSubscription: false }
  }

  try {
    // Verify token is still valid by fetching subscription
    const response = await fetch(`${API_BASE}/subscription`, {
      headers: { 'Authorization': `Bearer ${auth.token}` },
    })

    if (!response.ok) {
      if (response.status === 401) {
        clearAuth()
        return { valid: false, hasSubscription: false }
      }
      // Network error, use cached data
      return {
        valid: true,
        hasSubscription: auth.subscription?.status === 'active' || auth.subscription?.status === 'trialing',
        data: auth,
      }
    }

    const result = await response.json()

    // Update subscription info
    if (result.success) {
      auth.subscription = result.subscription ? {
        status: result.subscription.status,
        planName: result.subscription.planName,
        currentPeriodEnd: result.subscription.currentPeriodEnd,
      } : null

      saveAuth(auth)
    }

    const hasSubscription = auth.subscription?.status === 'active' || auth.subscription?.status === 'trialing' || auth.user.isAdmin

    return { valid: true, hasSubscription, data: auth }
  } catch (error) {
    console.error('Session verification error:', error)
    // Network error, use cached data
    return {
      valid: true,
      hasSubscription: auth.subscription?.status === 'active' || auth.subscription?.status === 'trialing' || auth.user.isAdmin,
      data: auth,
    }
  }
}

// Get current auth data
export function getAuth(): AuthData | null {
  return loadAuth()
}

// Check if user has active subscription
export function hasActiveSubscription(): boolean {
  const auth = loadAuth()
  if (!auth) return false
  if (auth.user.isAdmin) return true
  return auth.subscription?.status === 'active' || auth.subscription?.status === 'trialing'
}

// Get stored token for API requests
export function getStoredToken(): string | null {
  const auth = loadAuth()
  return auth?.token ?? null
}
