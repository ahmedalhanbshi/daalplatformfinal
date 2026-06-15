"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { notificationService } from "@/lib/notification-service"
import { useAuth } from "@/contexts/auth-context"

interface NotificationContextValue {
    unreadCount: number
    refreshUnreadCount: () => Promise<void>
    decrementUnread: (by?: number) => void
    clearUnread: () => void
}

const NotificationContext = createContext<NotificationContextValue>({
    unreadCount: 0,
    refreshUnreadCount: async () => {},
    decrementUnread: () => {},
    clearUnread: () => {},
})

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    const [unreadCount, setUnreadCount] = useState(0)

    const refreshUnreadCount = useCallback(async () => {
        if (!user) { return }
        try {
            const count = await notificationService.getUnreadCount()
            setUnreadCount(count)
        } catch { /* silent */ }
    }, [user])

    const decrementUnread = useCallback((by = 1) => {
        setUnreadCount(prev => Math.max(0, prev - by))
    }, [])

    const clearUnread = useCallback(() => {
        setUnreadCount(0)
    }, [])

    // Fetch on mount and when user changes
    useEffect(() => {
        if (!user) return
        const timeoutId = window.setTimeout(() => {
            void refreshUnreadCount()
        }, 0)
        return () => window.clearTimeout(timeoutId)
    }, [user, refreshUnreadCount])

    // Poll every 30s as fallback
    useEffect(() => {
        if (!user) return
        const interval = setInterval(refreshUnreadCount, 30_000)
        return () => clearInterval(interval)
    }, [user, refreshUnreadCount])

    // Re-fetch when the tab becomes visible (user switched tabs, came back)
    useEffect(() => {
        const onVisible = () => { if (document.visibilityState === "visible") refreshUnreadCount() }
        document.addEventListener("visibilitychange", onVisible)
        return () => document.removeEventListener("visibilitychange", onVisible)
    }, [refreshUnreadCount])

    return (
        <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount, decrementUnread, clearUnread }}>
            {children}
        </NotificationContext.Provider>
    )
}

export function useNotifications() {
    return useContext(NotificationContext)
}
