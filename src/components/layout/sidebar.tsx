"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { UserRole } from "@/types"
import {
  Home,
  BookOpen,
  User,
  Bell,
  CreditCard,
  Users,
  Calendar,
  FileText,
  Settings,
  Building,
  Shield,
  BarChart3,
  MessageSquare,
  CheckSquare,
  Award,
  Clock,
  MapPin,
  FileCheck,
  Send,
  TrendingUp,
  UserCheck,
  GraduationCap,
  Megaphone,
  Database,
  Key,
  Heart,
  Building2
} from "lucide-react"

interface SidebarProps {
  role: UserRole
  className?: string
}

const studentMenuItems = [
  { href: "/student/dashboard", label: "لوحة التحكم", icon: Home },
  { href: "/student/courses", label: "استعراض الدورات", icon: BookOpen },
  { href: "/student/my-courses", label: "دوراتي", icon: GraduationCap },
  { href: "/student/schedule", label: "الجدول", icon: Calendar },
  { href: "/student/wishlist", label: "قائمة الرغبات", icon: Heart },
]

const trainerMenuItems = [
  { href: "/trainer/dashboard", label: "لوحة التحكم", icon: Home },
  { href: "/courses", label: "استعراض الدورات", icon: BookOpen },
  { href: "/trainer/courses", label: "إدارة الدورات", icon: GraduationCap },
  { href: "/trainer/courses/create", label: "إنشاء دورة جديدة", icon: FileText },
  { href: "/trainer/students", label: "إدارة الطلاب", icon: Users },
  { href: "/trainer/attendance", label: "سجل الحضور", icon: CheckSquare },
  { href: "/trainer/announcements", label: "الإعلانات", icon: Megaphone },
  { href: "/trainer/room-bookings", label: "حجوزات القاعات", icon: MapPin },
  { href: "/trainer/halls", label: "القاعات", icon: Building },
  { href: "/trainer/settings", label: "الإعدادات", icon: Settings },
]

const instituteAdminMenuItems = [
  { href: "/institute/dashboard", label: "الصفحة الرئيسية", icon: Home },
  { href: "/institute/courses", label: "إدارة الدورات", icon: BookOpen },
  { href: "/institute/schedule", label: "جدول الجلسات", icon: Calendar },
  { href: "/institute/students", label: "إدارة الطلاب", icon: Users },
  { href: "/institute/enrollments", label: "طلبات التسجيل", icon: UserCheck },
  { href: "/institute/staff", label: "إدارة المدربين", icon: Users },
  { href: "/institute/halls", label: "إدارة القاعات", icon: Building2 },
  { href: "/institute/announcements", label: "الإعلانات", icon: Megaphone },
]

const platformAdminMenuItems = [
  { href: "/admin/dashboard", label: "لوحة التحكم", icon: Home },
  { href: "/admin/notifications", label: "الإشعارات", icon: Bell },
  { href: "/admin/verifications", label: "طلبات التحقق", icon: Shield },
  { href: "/admin/institutes", label: "إدارة المعاهد", icon: Building },
  { href: "/admin/trainers", label: "إدارة المدربين", icon: UserCheck },
  { href: "/admin/students", label: "إدارة الطلاب", icon: Users },
  { href: "/admin/courses", label: "إدارة الدورات", icon: BookOpen },
  { href: "/admin/halls", label: "إدارة القاعات", icon: Building2 },
  { href: "/admin/announcements", label: "الإعلانات العامة", icon: Megaphone },
  { href: "/admin/logs", label: "سجلات النظام", icon: FileText },
  { href: "/admin/system", label: "إعدادات النظام", icon: Settings },
]

export function Sidebar({ role, className }: SidebarProps) {
  const pathname = usePathname()

  const getMenuItems = () => {
    switch (role) {
      case 'STUDENT': return studentMenuItems
      case 'TRAINER': return trainerMenuItems
      case 'INSTITUTE_ADMIN': return instituteAdminMenuItems
      case 'PLATFORM_ADMIN': return platformAdminMenuItems
      default: return []
    }
  }

  const menuItems = getMenuItems()

  return (
    <aside className={cn("bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 w-64 min-h-screen transition-colors duration-300", className)}>
      <div className="p-4">
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
