"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import {
  BookOpen,
  Home,
  Users,
  UserCheck,
  Megaphone,
  Building,
  GraduationCap,
  CalendarDays,
  LogOut,
  MapPin,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { trainerService } from "@/lib/trainer-service"

const links = [
  { href: "/trainer/dashboard", label: "الصفحة الرئيسية", icon: Home },
  { href: "/trainer/explore", label: "استعراض الدورات", icon: BookOpen },
  { href: "/trainer/courses", label: "إدارة الدورات", icon: GraduationCap },
  { href: "/trainer/students", label: "إدارة الطلاب", icon: Users },
  { href: "/trainer/announcements", label: "الإعلانات", icon: Megaphone },
  { href: "/trainer/room-bookings", label: "حجوزاتي", icon: MapPin },
  { href: "/trainer/halls", label: "القاعات", icon: Building },
  { href: "/trainer/schedule", label: "جدول المواعيد", icon: CalendarDays },
]

interface TrainerSidebarProps {
  isCollapsed?: boolean
  onNavigate?: () => void
}

export function TrainerSidebar({ isCollapsed = false, onNavigate }: TrainerSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { logout } = useAuth()
  const [pendingRegistrationsCount, setPendingRegistrationsCount] = useState(0)

  useEffect(() => {
    let mounted = true
    const loadCount = async () => {
      try {
        const enrollments = await trainerService.getEnrollments()
        if (!mounted || !Array.isArray(enrollments)) return
        const count = enrollments.filter((e) => {
          const status = String(e?.status || "").toUpperCase()
          const paymentStatus = String(e?.payments?.[0]?.status || "").toUpperCase()
          return status === "PRELIMINARY" || paymentStatus === "PENDING_REVIEW"
        }).length
        setPendingRegistrationsCount(count)
      } catch {
        setPendingRegistrationsCount(0)
      }
    }
    loadCount()
    return () => {
      mounted = false
    }
  }, [])

  const visibleLinks = [...links]
  if (pendingRegistrationsCount > 0) {
    const studentsIndex = visibleLinks.findIndex((x) => x.href === "/trainer/students")
    if (studentsIndex >= 0) {
      visibleLinks.splice(studentsIndex + 1, 0, {
        href: "/trainer/students?tab=requests",
        label: "طلبات التسجيل والدفع",
        icon: UserCheck,
      })
    }
  }

  return (
    <aside
      className={cn(
        "h-full border-l border-slate-200/80 bg-white shadow-[0_0_20px_rgba(15,23,42,0.04)] flex flex-col transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isCollapsed ? "w-20" : "w-[260px]"
      )}
    >
      <nav className={cn("flex-1 overflow-y-auto py-4 space-y-1.5", isCollapsed ? "px-2" : "px-3")}>
        {visibleLinks.map((link) => {
          let isActive = false
          if (link.href === "/trainer/dashboard") {
            isActive = pathname === link.href
          } else if (link.href === "/trainer/explore") {
            isActive = pathname.startsWith("/trainer/explore")
          } else if (link.href === "/trainer/students?tab=requests") {
            isActive = pathname.startsWith("/trainer/students") && searchParams.get("tab") === "requests"
          } else {
            isActive = pathname.startsWith(link.href)
          }

          const Icon = link.icon

          return (
            <Link
              key={link.href}
              href={link.href}
              title={isCollapsed ? link.label : undefined}
              onClick={onNavigate}
              className={cn(
                "group transition-all duration-200 h-12 rounded-md font-semibold",
                isCollapsed
                  ? "flex items-center justify-center px-2"
                  : "flex items-center justify-between px-4 py-3 text-[17px]",
                isActive
                  ? "bg-[#2563EB] text-white shadow-lg shadow-blue-200/70"
                  : "text-slate-700 hover:bg-slate-100 hover:text-[#2563EB]"
              )}
            >
              <div className={cn("flex items-center w-full", isCollapsed ? "justify-center" : "gap-3")}>
                <div className="relative">
                  <Icon className={cn("h-5 w-5", isActive ? "text-white" : "text-slate-400 group-hover:text-[#2563EB]")} />
                  {isCollapsed && link.href === "/trainer/students" && pendingRegistrationsCount > 0 ? (
                    <span className="absolute -right-2 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">
                      {pendingRegistrationsCount > 99 ? "99+" : pendingRegistrationsCount}
                    </span>
                  ) : null}
                </div>
                {!isCollapsed && (
                  <span className="flex flex-1 items-center justify-end gap-2 text-right">
                    {link.label}
                    {link.href === "/trainer/students" && pendingRegistrationsCount > 0 ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-5 text-white">
                        {pendingRegistrationsCount > 99 ? "99+" : pendingRegistrationsCount}
                      </span>
                    ) : null}
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
            isCollapsed
              ? "flex h-12 items-center justify-center"
              : "flex items-center gap-3 px-4 py-3 text-[18px] font-semibold"
          )}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span className="flex-1 text-right">تسجيل الخروج</span>}
        </button>
      </div>
    </aside>
  )
}
