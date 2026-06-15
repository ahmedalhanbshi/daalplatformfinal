"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@/types'
import { authService } from '@/lib/auth-service'
import { clearAccessToken } from '@/lib/api-client'

interface RegisterData {
    name: string
    email: string
    password: string
    phone?: string
    role?: string
}

type AuthContextType = {
    user: User | null
    login: (email: string, password: string) => Promise<boolean>
    register: (data: RegisterData | FormData) => Promise<boolean>
    logout: () => void
    updateUser: (data: Partial<User>) => void
    isLoading: boolean
    isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    /**
     * Initialize auth state on app startup
     * Calls /auth/me to restore session from HTTP-only cookie
     */
    const initializeAuth = useCallback(async () => {
        try {
            setIsLoading(true)

            // Call /auth/me to get current user
            // If access token expired, interceptor will auto-refresh
            const userData = await authService.getCurrentUser()

            setUser(userData)
        } catch {
            // Failed to get user (not authenticated or refresh failed)
            setUser(null)
            clearAccessToken()
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        initializeAuth()
    }, [initializeAuth])

    /**
     * Login with email and password
     */
    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            setIsLoading(true)

            const response = await authService.login(email, password)

            setUser(response.user)
            return true
        } catch (error: unknown) {
            console.warn('Login failed:', error instanceof Error ? error.message : 'Login failed')
            setUser(null)

            // Re-throw error with proper message for UI display
            const errorMessage =
                typeof error === 'object' && error !== null && 'response' in error
                    ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Login failed')
                    : error instanceof Error
                        ? error.message
                        : 'Login failed'
            throw new Error(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    /**
     * Register new user
     */
    const register = async (data: RegisterData | FormData): Promise<boolean> => {
        try {
            setIsLoading(true)

            await authService.register(data)

            // Don't auto-login - redirect to login page instead
            return true
        } catch (error) {
            console.error('Register error:', (error as Error)?.message || 'Registration failed')
            return false
        } finally {
            setIsLoading(false)
        }
    }

    /**
     * Logout user
     * Clears tokens and redirects to home
     */
    const logout = useCallback(async () => {
        try {
            await authService.logout()
        } catch (error) {
            console.error('Logout error:', error)
        } finally {
            // Always clear state
            setUser(null)
            clearAccessToken()
            router.push('/')
        }
    }, [router])

    const updateUser = useCallback((data: Partial<User>) => {
        setUser(prev => prev ? { ...prev, ...data } as User : null)
    }, [])

    const isAuthenticated = !!user

    return (
        <AuthContext.Provider value={{ user, login, register, logout, updateUser, isLoading, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
