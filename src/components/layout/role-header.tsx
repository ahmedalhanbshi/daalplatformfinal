"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AlignJustify, Heart, LogOut, Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn, getFileUrl } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { useNotifications } from "@/contexts/notification-context"
import { usePlatform } from "@/contexts/platform-context"
import { DashboardRole, ROLE_LAYOUT_CONFIG, notificationIcon } from "./role-layout-config"
import { instituteService } from "@/lib/institute-service"
import { PLATFORM_NAME } from "@/lib/brand"

interface RoleHeaderProps {
  role: DashboardRole
  isSidebarOpen: boolean
  onMenuClick: () => void
}

export function RoleHeader({ role, isSidebarOpen, onMenuClick }: RoleHeaderProps) {
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const { settings } = usePlatform()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const siteName = settings?.general.siteName || PLATFORM_NAME
  const config = ROLE_LAYOUT_CONFIG[role]
  const NotificationIcon = notificationIcon
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [profileAvatarSrc, setProfileAvatarSrc] = useState<string | undefined>(undefined)
  const dashboardUrl = config.navItems[0]?.href || "/"

  const isHallsPage = pathname?.startsWith("/trainer/halls") || pathname?.startsWith("/institute/halls")
  const isStudentCoursesPage = pathname === "/student/courses"
  const isSearchPage = isHallsPage || isStudentCoursesPage
  const currentQuery = isSearchPage ? (searchParams.get("q") ?? "") : ""

  const submitSearch = () => {
    if (!isSearchPage) return
    const value = (searchInputRef.current?.value || "").trim()
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set("q", value)
    else params.delete("q")
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname || "/")
  }

  const userWithMedia = user as
    | (typeof user & {
        image?: string
        profileImage?: string
        logo?: string
        instituteLogo?: string
        institute?: { logo?: string; instituteLogo?: string }
      })
    | null

  const avatarCandidate =
    userWithMedia?.avatar ||
    userWithMedia?.image ||
    userWithMedia?.profileImage ||
    userWithMedia?.logo ||
    userWithMedia?.instituteLogo ||
    userWithMedia?.institute?.logo ||
    userWithMedia?.institute?.instituteLogo
  const avatarSrc = getFileUrl(avatarCandidate)
  const finalAvatarSrc = (userWithMedia?.avatar ? getFileUrl(userWithMedia.avatar) : undefined) || profileAvatarSrc || avatarSrc

  useEffect(() => {
    let cancelled = false

    const loadProfileAvatar = async () => {
      if (role !== "INSTITUTE_ADMIN") {
        setProfileAvatarSrc(undefined)
        return
      }

      try {
        const profile = await instituteService.getProfile()
        if (cancelled) return
        const candidate =
          profile?.avatar ||
          profile?.profileImage ||
          profile?.instituteLogo ||
          profile?.logo ||
          profile?.image
        setProfileAvatarSrc(getFileUrl(candidate))
      } catch {
        if (!cancelled) setProfileAvatarSrc(undefined)
      }
    }

    void loadProfileAvatar()
    return () => {
      cancelled = true
    }
  }, [role])

  return (
    <header className="sticky top-0 z-[60] h-[72px] border-b border-slate-200/70 bg-white px-4 md:px-6" dir="rtl">
      <div className="relative flex h-full items-center">
        <div className="flex shrink-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="h-11 w-11 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            title={isSidebarOpen ? "تصغير القائمة الجانبية" : "توسيع القائمة الجانبية"}
          >
            <AlignJustify className={cn("h-6 w-6 transition-transform duration-300", isSidebarOpen ? "rotate-90" : "rotate-0")} />
            <span className="sr-only">القائمة</span>
          </Button>

          <Link href={dashboardUrl} className="flex items-center gap-2">
            <div className="relative h-9 w-9 rounded-md bg-white">
              <Image src={getFileUrl(settings?.general?.siteLogo) || "/images/logo.png"} alt={siteName} fill className="object-contain p-0.5" unoptimized />
            </div>
            <div className="hidden lg:block">
              <p className="text-xl font-extrabold leading-none text-[#2563EB]">{siteName}</p>
            </div>
          </Link>
        </div>

        {isSearchPage && (
          <div className="absolute left-1/2 top-1/2 hidden w-full max-w-[560px] -translate-x-1/2 -translate-y-1/2 lg:block">
            <div className="relative">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                key={`${pathname || "root"}-${currentQuery}`}
                ref={searchInputRef}
                type="text"
                dir="rtl"
                defaultValue={currentQuery}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    submitSearch()
                  }
                }}
                placeholder={isHallsPage ? "ابحث عن قاعة..." : "ابحث عن دورة..."}
                className="h-11 w-full rounded-full border border-[#E5E7EB] bg-slate-50/70 pr-12 pl-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              <button type="button" onClick={submitSearch} className="absolute right-0 top-0 h-11 w-11 rounded-full" aria-label="بحث" />
            </div>
          </div>
        )}

        <div className="absolute left-4 top-1/2 flex -translate-y-1/2 shrink-0 items-center gap-1 sm:gap-2 md:left-6">
          {role === "STUDENT" && config.favoritesPath && (
            <Button variant="ghost" size="icon" asChild className="rounded-full text-slate-500 hover:bg-blue-50 hover:text-[#2563EB]">
              <Link href={config.favoritesPath} title="المفضلة">
                <Heart className="h-5 w-5" />
              </Link>
            </Button>
          )}

          {config.notificationsPath && (
            <Button variant="ghost" size="icon" asChild className="relative rounded-full text-slate-500 hover:bg-blue-50 hover:text-[#2563EB]">
              <Link href={config.notificationsPath} title="الإشعارات">
                <NotificationIcon className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 h-4 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] leading-4 text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button suppressHydrationWarning type="button" className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-slate-100">
                <Avatar className="h-10 w-10 border border-slate-200">
                  <AvatarImage src={finalAvatarSrc} alt={user?.name ?? "user"} />
                  <AvatarFallback className="bg-blue-50 font-bold text-[#2563EB]">{(user?.name || "?").charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="hidden text-right sm:block">
                  <p className="mb-1 text-sm font-bold leading-none text-slate-900">{user?.name || "غير محدد"}</p>
                  <p className="text-xs leading-none text-slate-500">{config.roleLabel}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" dir="rtl" className="w-56 text-right">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1 text-right">
                  <p className="text-sm font-semibold leading-none">{user?.name || "غير محدد"}</p>
                  <p className="text-xs leading-none text-slate-500">{user?.email || "-"}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={config.profilePath} className="relative flex w-full items-center justify-end pl-4 pr-10 text-right cursor-pointer">
                  <User className="absolute right-3 h-4 w-4 shrink-0" />
                  <span className="w-full">الملف الشخصي</span>
                </Link>
              </DropdownMenuItem>
              {config.notificationsPath && (
                <DropdownMenuItem asChild>
                  <Link href={config.notificationsPath} className="relative flex w-full items-center justify-end pl-4 pr-10 text-right cursor-pointer">
                    <NotificationIcon className="absolute right-3 h-4 w-4 shrink-0" />
                    <span className="w-full">الإشعارات</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()} className="relative cursor-pointer text-red-600 focus:text-red-600 flex items-center justify-end pl-4 pr-10 text-right">
                <LogOut className="absolute right-3 h-4 w-4 shrink-0" />
                <span className="w-full">تسجيل الخروج</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
