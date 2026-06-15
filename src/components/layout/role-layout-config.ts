"use client"

import {
  BarChart3,
  Bell,
  BookOpen,
  Building,
  Building2,
  CalendarDays,
  FileText,
  GraduationCap,
  Heart,
  Home,
  LogOut,
  Megaphone,
  Settings,
  Shield,
  UserCheck,
  Users,
  MapPin,
  type LucideIcon,
} from "lucide-react"
import { UserRole } from "@/types"

export type DashboardRole = UserRole

export interface RoleNavItem {
  href: string
  label: string
  icon: LucideIcon
  match?: "exact" | "prefix"
}

export interface RoleLayoutConfig {
  roleLabel: string
  storageKey: string
  profilePath: string
  notificationsPath?: string
  favoritesPath?: string
  searchPlaceholder: string
  searchRoute: string
  navItems: RoleNavItem[]
}

export const ROLE_LAYOUT_CONFIG: Record<DashboardRole, RoleLayoutConfig> = {
  TRAINER: {
    roleLabel: "مدرب",
    storageKey: "trainer_sidebar_collapsed",
    profilePath: "/trainer/profile",
    notificationsPath: "/trainer/notifications",
    favoritesPath: "/trainer/explore",
    searchPlaceholder: "ابحث عن دورة، طالب، طلب تسجيل...",
    searchRoute: "/trainer/explore",
    navItems: [
      { href: "/trainer/dashboard", label: "الصفحة الرئيسية", icon: Home, match: "exact" },
      // { href: "/trainer/explore", label: "استعراض الدورات", icon: BookOpen, match: "prefix" },
      { href: "/trainer/courses", label: "إدارة الدورات", icon: GraduationCap, match: "prefix" },
      { href: "/trainer/students", label: "إدارة الطلاب", icon: Users, match: "prefix" },
      { href: "/trainer/announcements", label: "الإعلانات", icon: Megaphone, match: "prefix" },
      { href: "/trainer/room-bookings", label: "حجوزاتي", icon: MapPin, match: "prefix" },
      { href: "/trainer/halls", label: "القاعات", icon: Building, match: "prefix" },
      { href: "/trainer/schedule", label: "جدول المواعيد", icon: CalendarDays, match: "prefix" },
    ],
  },
  STUDENT: {
    roleLabel: "طالب",
    storageKey: "student_sidebar_collapsed",
    profilePath: "/student/profile",
    notificationsPath: "/student/notifications",
    favoritesPath: "/student/wishlist",
    searchPlaceholder: "ابحث عن دورة...",
    searchRoute: "/student/courses",
    navItems: [
      { href: "/student/dashboard", label: "لوحة التحكم", icon: Home, match: "exact" },
      { href: "/student/courses", label: "استعراض الدورات", icon: BookOpen, match: "prefix" },
      { href: "/student/my-courses", label: "دوراتي", icon: GraduationCap, match: "prefix" },
      { href: "/student/schedule", label: "الجدول", icon: CalendarDays, match: "prefix" },
      { href: "/student/wishlist", label: "قائمة الرغبات", icon: Heart, match: "prefix" },
    ],
  },
  INSTITUTE_ADMIN: {
    roleLabel: "معهد",
    storageKey: "institute_sidebar_collapsed",
    profilePath: "/institute/profile",
    notificationsPath: "/institute/notifications",
    searchPlaceholder: "ابحث عن دورة أو طالب...",
    searchRoute: "/institute/courses",
    navItems: [
      { href: "/institute/dashboard", label: "الصفحة الرئيسية", icon: Home, match: "exact" },
      { href: "/institute/courses", label: "إدارة الدورات", icon: BookOpen, match: "prefix" },
      { href: "/institute/schedule", label: "جدول الجلسات", icon: CalendarDays, match: "prefix" },
      { href: "/institute/students", label: "إدارة الطلاب", icon: Users, match: "prefix" },
      { href: "/institute/staff", label: "إدارة المدربين", icon: Users, match: "prefix" },
      { href: "/institute/halls", label: "إدارة القاعات", icon: Building2, match: "prefix" },
      { href: "/institute/announcements", label: "الإعلانات", icon: Megaphone, match: "prefix" },
    ],
  },
  PLATFORM_ADMIN: {
    roleLabel: "أدمن",
    storageKey: "admin_sidebar_collapsed",
    profilePath: "/admin/profile",
    notificationsPath: "/admin/notifications",
    searchPlaceholder: "ابحث في النظام...",
    searchRoute: "/admin/courses",
    navItems: [
      { href: "/admin/dashboard", label: "لوحة التحكم", icon: Home, match: "exact" },
      { href: "/admin/notifications", label: "الإشعارات", icon: Bell, match: "prefix" },
      { href: "/admin/verifications", label: "طلبات التحقق", icon: Shield, match: "prefix" },
      { href: "/admin/institutes", label: "إدارة المعاهد", icon: Building, match: "prefix" },
      { href: "/admin/trainers", label: "إدارة المدربين", icon: UserCheck, match: "prefix" },
      { href: "/admin/students", label: "إدارة الطلاب", icon: Users, match: "prefix" },
      { href: "/admin/courses", label: "إدارة الدورات", icon: GraduationCap, match: "prefix" },
      { href: "/admin/halls", label: "إدارة القاعات", icon: Building2, match: "prefix" },
      { href: "/admin/announcements", label: "الإعلانات العامة", icon: Megaphone, match: "prefix" },
      { href: "/admin/logs", label: "سجلات النظام", icon: FileText, match: "prefix" },
      { href: "/admin/system", label: "إعدادات النظام", icon: Settings, match: "prefix" },
    ],
  },
}

export const logoutIcon = LogOut
export const notificationIcon = Bell
