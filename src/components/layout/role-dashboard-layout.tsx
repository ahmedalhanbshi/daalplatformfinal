"use client"

import { Suspense, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { DashboardRole, ROLE_LAYOUT_CONFIG } from "./role-layout-config"
import { RoleHeader } from "./role-header"
import { RoleSidebar } from "./role-sidebar"

interface RoleDashboardLayoutProps {
  role: DashboardRole
  children: React.ReactNode
  contentMode?: "default" | "fullBleed"
}

export function RoleDashboardLayout({ role, children, contentMode = "default" }: RoleDashboardLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(ROLE_LAYOUT_CONFIG[role].storageKey) === "1"
  })
  const [isDesktop, setIsDesktop] = useState(false)
  const pathname = usePathname()
  const config = ROLE_LAYOUT_CONFIG[role]
  const isFullBleed = contentMode === "fullBleed"

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)")
    const updateDesktop = () => setIsDesktop(media.matches)
    updateDesktop()
    media.addEventListener("change", updateDesktop)
    return () => media.removeEventListener("change", updateDesktop)
  }, [config.storageKey])

  useEffect(() => {
    const timeout = window.setTimeout(() => setIsMobileSidebarOpen(false), 0)
    return () => window.clearTimeout(timeout)
  }, [pathname])

  const handleMenuClick = () => {
    if (isDesktop) {
      setIsSidebarCollapsed((prev) => {
        const next = !prev
        window.localStorage.setItem(config.storageKey, next ? "1" : "0")
        return next
      })
      return
    }
    setIsMobileSidebarOpen((prev) => !prev)
  }

  return (
    <div className="trainer-radius-5 h-screen bg-slate-50 dark:bg-slate-950/50 overflow-hidden" dir="rtl">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute right-[-100px] top-[-100px] h-[500px] w-[500px] rounded-full bg-blue-400/10 blur-3xl opacity-50 mix-blend-multiply" />
        <div className="absolute bottom-[-150px] left-[-150px] h-[600px] w-[600px] rounded-full bg-indigo-400/10 blur-3xl opacity-50 mix-blend-multiply" />
      </div>

      <div className="relative z-10 h-full overflow-hidden">
        <Suspense fallback={null}>
          <RoleHeader role={role} isSidebarOpen={isMobileSidebarOpen || !isSidebarCollapsed} onMenuClick={handleMenuClick} />
        </Suspense>

        <div className="flex h-[calc(100vh-72px)] overflow-hidden">
          {isMobileSidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          <div
            className={cn(
              "fixed right-0 top-[72px] z-50 h-[calc(100vh-72px)] w-[260px] shrink-0 transition-[width,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width,transform] lg:static lg:h-full lg:translate-x-0",
              isMobileSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
              isSidebarCollapsed ? "lg:w-20" : "lg:w-[260px]"
            )}
          >
            <Suspense fallback={null}>
              <RoleSidebar role={role} isCollapsed={isDesktop && isSidebarCollapsed} onNavigate={() => setIsMobileSidebarOpen(false)} />
            </Suspense>
          </div>

          <div className="relative flex-1 min-w-0 overflow-hidden bg-slate-50">
            <main
              className={cn(
                "h-full overflow-y-auto no-scrollbar bg-slate-50 pb-10",
                isFullBleed ? "m-0 w-full max-w-none p-0 pt-0 md:p-0 md:pt-0" : "px-6 pt-4 md:px-8 md:pt-4"
              )}
            >
              <div
                className={cn(
                  "animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both",
                  isFullBleed ? "m-0 w-full max-w-none p-0" : "mx-auto max-w-7xl"
                )}
              >
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
