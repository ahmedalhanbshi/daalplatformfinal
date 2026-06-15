"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { DashboardRole, ROLE_LAYOUT_CONFIG, logoutIcon } from "./role-layout-config"
import { trainerService } from "@/lib/trainer-service"
import { instituteService } from "@/lib/institute-service"

interface RoleSidebarProps {
  role: DashboardRole
  isCollapsed?: boolean
  onNavigate?: () => void
}

type EnrollmentLite = { status?: string; payments?: Array<{ status?: string }> }
type BookingLite = { status?: string }

export function RoleSidebar({ role, isCollapsed = false, onNavigate }: RoleSidebarProps) {
  const pathname = usePathname()
  const { logout } = useAuth()
  const config = ROLE_LAYOUT_CONFIG[role]
  const LogoutIcon = logoutIcon
  const [enrollmentAlertsCount, setEnrollmentAlertsCount] = useState(0)
  const [hallAlertsCount, setHallAlertsCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    if (!(role === "TRAINER" || role === "INSTITUTE_ADMIN")) return

    async function loadPendingCounts() {
      try {
        if (role === "TRAINER") {
          const enrollments = await trainerService.getEnrollments()
          if (cancelled) return
          const pending = (Array.isArray(enrollments) ? (enrollments as EnrollmentLite[]) : []).filter((e) => {
            const status = String(e?.status || "").toUpperCase()
            const latestPayment = e?.payments?.[0]
            const paymentStatus = String(latestPayment?.status || "").toUpperCase()
            // Only show badge for requests that still need a decision (accept/reject).
            return status === "PRELIMINARY" || (status === "PENDING_PAYMENT" && paymentStatus === "PENDING_REVIEW")
          }).length
          setEnrollmentAlertsCount(pending)
          setHallAlertsCount(0)
          return
        }

        if (role === "INSTITUTE_ADMIN") {
          const [enrollments, bookings] = await Promise.all([
            instituteService.getEnrollments(),
            instituteService.getRoomBookings(),
          ])
          if (cancelled) return

          const pendingEnrollments = (Array.isArray(enrollments) ? (enrollments as EnrollmentLite[]) : []).filter((e) => {
            const status = String(e?.status || "").toUpperCase()
            const latestPayment = e?.payments?.[0]
            const paymentStatus = String(latestPayment?.status || "").toUpperCase()
            return status === "PRELIMINARY" || (status === "PENDING_PAYMENT" && paymentStatus === "PENDING_REVIEW")
          }).length

          const pendingBookings = (Array.isArray(bookings) ? (bookings as BookingLite[]) : []).filter((b) => {
            const status = String(b?.status || "").toUpperCase()
            // Room booking badge should also represent "awaiting review/decision" only.
            return ["PENDING", "PENDING_APPROVAL", "PENDING_REVIEW"].includes(status)
          }).length

          setEnrollmentAlertsCount(pendingEnrollments)
          setHallAlertsCount(pendingBookings)
        }
      } catch {
        if (!cancelled) {
          setEnrollmentAlertsCount(0)
          setHallAlertsCount(0)
        }
      }
    }

    loadPendingCounts()
    const interval = setInterval(loadPendingCounts, 30_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [role, pathname])

  return (
    <aside
      className={cn(
        "h-full border-l border-slate-200/80 bg-white shadow-[0_0_20px_rgba(15,23,42,0.04)] flex flex-col transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isCollapsed ? "w-20" : "w-[260px]"
      )}
    >
      <nav className={cn("flex-1 overflow-y-auto py-4 space-y-1.5", isCollapsed ? "px-2" : "px-3")}>
        {config.navItems.map((item) => {
          const isStudentCourseDetails = role === "STUDENT" && /^\/student\/courses\/[^/]+/.test(pathname)
          const isMyCoursesItem = role === "STUDENT" && item.href === "/student/my-courses"
          const isExploreCoursesItem = role === "STUDENT" && item.href === "/student/courses"
          const isEnrollmentsItem = item.href.endsWith("/enrollments")
          const isStudentsRegistrationsItem =
            (role === "INSTITUTE_ADMIN" || role === "TRAINER") && item.href.endsWith("/students")
          const isHallsItem = item.href.endsWith("/halls") || item.href.endsWith("/room-bookings")

          let isActive = item.match === "exact" ? pathname === item.href : pathname.startsWith(item.href.split("?")[0])
          if (isStudentCourseDetails) {
            if (isMyCoursesItem) isActive = true
            if (isExploreCoursesItem) isActive = false
          }
          const Icon = item.icon
          const badgeCount = isEnrollmentsItem || isStudentsRegistrationsItem
            ? enrollmentAlertsCount
            : isHallsItem && role === "INSTITUTE_ADMIN"
            ? hallAlertsCount
            : 0

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              onClick={onNavigate}
              className={cn(
                "group transition-all duration-200 h-12 rounded-md font-semibold",
                isCollapsed ? "flex items-center justify-center px-2" : "flex items-center justify-between px-4 py-3 text-[17px]",
                isActive ? "bg-[#2563EB] text-white shadow-lg shadow-blue-200/70" : "text-slate-700 hover:bg-slate-100 hover:text-[#2563EB]"
              )}
            >
              <div className={cn("relative flex items-center w-full", isCollapsed ? "justify-center" : "gap-3")}>
                <Icon className={cn("h-5 w-5", isActive ? "text-white" : "text-slate-400 group-hover:text-[#2563EB]")} />
                {!isCollapsed && (
                  <div className="flex flex-1 items-center justify-between">
                    <span className="text-right">{item.label}</span>
                    {badgeCount > 0 && (
                      <span
                        className={cn(
                          "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-5",
                          isActive ? "bg-white/20 text-white" : "bg-red-500 text-white"
                        )}
                      >
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </div>
                )}
                {isCollapsed && badgeCount > 0 && (
                  <span className="absolute -mt-5 mr-6 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      <div className={cn("pb-5 pt-3 border-t border-slate-200/70", isCollapsed ? "px-2" : "px-4")}>
        <button
          type="button"
          onClick={() => logout()}
          title={isCollapsed ? "تسجيل الخروج" : undefined}
          className={cn(
            "w-full rounded-md text-red-600 hover:bg-red-50 transition-colors",
            isCollapsed ? "flex h-12 items-center justify-center" : "flex items-center gap-3 px-4 py-3 text-[18px] font-semibold"
          )}
        >
          <LogoutIcon className="h-5 w-5" />
          {!isCollapsed && <span className="flex-1 text-right">تسجيل الخروج</span>}
        </button>
      </div>
    </aside>
  )
}

