"use client"

import Link from "next/link"
import Image from "next/image"
import { Bell, User, LogOut, Menu, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getFileUrl } from "@/lib/utils"
import { UserRole } from "@/types"
import { useAuth } from "@/contexts/auth-context"
import { useNotifications } from "@/contexts/notification-context"
import { PLATFORM_NAME } from "@/lib/brand"
import { usePlatform } from "@/contexts/platform-context"
import { usePathname } from "next/navigation"

interface NavbarProps {
  onMenuClick?: () => void
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const { settings } = usePlatform()
  const pathname = usePathname()
  const siteName = settings?.general.siteName || PLATFORM_NAME
  const isAuthRoute = pathname?.startsWith("/auth")

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "STUDENT":
        return "طالب"
      case "TRAINER":
        return "مدرب"
      case "INSTITUTE_ADMIN":
        return "مسؤول معهد"
      case "PLATFORM_ADMIN":
        return "مسؤول منصة"
      default:
        return role
    }
  }

  const getProfileLink = (role: UserRole) => {
    switch (role) {
      case "STUDENT":
        return "/student/profile"
      case "TRAINER":
        return "/trainer/profile"
      case "INSTITUTE_ADMIN":
        return "/institute/profile"
      case "PLATFORM_ADMIN":
        return "/admin/profile"
      default:
        return "/"
    }
  }

  const getNotificationsLink = (role: UserRole) => {
    switch (role) {
      case "STUDENT":
        return "/student/notifications"
      case "TRAINER":
        return "/trainer/notifications"
      case "INSTITUTE_ADMIN":
        return "/institute/notifications"
      case "PLATFORM_ADMIN":
        return "/admin/announcements"
      default:
        return "/"
    }
  }

  return (
    <nav className="sticky top-0 z-50 h-[72px] border-b border-slate-200/70 bg-white px-4 shadow-sm" dir="rtl">
      {isAuthRoute ? (
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative h-9 w-9 rounded-md">
                <Image src={getFileUrl(settings?.general?.siteLogo) || "/images/logo.png"} alt={siteName} fill className="object-contain p-0.5" unoptimized />
              </div>
              <span className="text-xl font-extrabold leading-none text-[#2563EB]">{siteName}</span>
            </Link>

            <div className="hidden items-center gap-1 lg:flex">
              <Button variant="ghost" asChild className="h-10 rounded-[6.5px] px-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#2563EB]">
                <Link href="/courses">الدورات</Link>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="h-10 rounded-[6.5px] px-4 font-medium text-slate-700 hover:bg-blue-50 hover:text-[#2563EB]">
              <Link href="/auth/login">تسجيل الدخول</Link>
            </Button>
            <Button asChild className="h-10 rounded-[6.5px] bg-[#2563EB] px-4 font-medium text-white shadow-sm hover:bg-[#1D4ED8]">
              <Link href="/auth/register">إنشاء حساب</Link>
            </Button>
          </div>
        </div>
      ) : (
      <div className="mx-auto grid h-full max-w-7xl grid-cols-[auto_minmax(0,520px)_auto] items-center gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-9 w-9 rounded-md">
              <Image src={getFileUrl(settings?.general?.siteLogo) || "/images/logo.png"} alt={siteName} fill className="object-contain p-0.5" unoptimized />
            </div>
            <span className="text-xl font-extrabold leading-none text-[#2563EB]">{siteName}</span>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            <Button variant="ghost" asChild className="h-10 rounded-[6.5px] px-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#2563EB]">
              <Link href="/courses">الدورات</Link>
            </Button>
          </div>

          <div className="md:hidden">
            {onMenuClick ? (
              <Button variant="ghost" size="sm" onClick={onMenuClick} className="h-10 w-10 rounded-[6.5px]">
                <Menu className="h-5 w-5" />
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-10 w-10 rounded-[6.5px]">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56" dir="rtl">
                  <DropdownMenuItem asChild>
                    <Link href="/">الرئيسية</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/courses">الدورات التدريبية</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {!user && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/auth/login">تسجيل الدخول</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/auth/register">إنشاء حساب</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {!isAuthRoute && <div className="hidden w-full max-w-[520px] justify-self-center md:block">
          <div className="relative w-full">
            <input
              type="text"
              dir="rtl"
              placeholder="ابحث عن دورة..."
              className="h-11 w-full rounded-full border border-[#E5E7EB] bg-slate-50/70 pr-12 pl-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>}

        <div className="mr-auto flex items-center gap-2">
          {!isAuthRoute && <Button variant="ghost" size="icon" className="rounded-full text-slate-500 hover:bg-blue-50 hover:text-[#2563EB] md:hidden">
            <Search className="h-5 w-5" />
          </Button>}

          {user ? (
            <>
              <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-slate-100" asChild>
                <Link href={getNotificationsLink(user.role)}>
                  <Bell className="h-5 w-5 text-slate-600" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
                  )}
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-auto rounded-full border border-transparent py-1 pl-2 pr-1 transition-all hover:border-slate-200 hover:bg-slate-100">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-slate-200">
                        <AvatarImage src={getFileUrl(user.avatar)} alt={user.name} />
                        <AvatarFallback className="bg-primary/10 font-medium text-primary">
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden text-right sm:block">
                        <p className="mb-1 text-sm font-semibold leading-none text-slate-900">{user.name}</p>
                        <p className="text-xs font-medium leading-none text-primary">{getRoleLabel(user.role)}</p>
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount dir="rtl">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={getProfileLink(user.role)} className="cursor-pointer">
                      <User className="ml-2 h-4 w-4" />
                      الملف الشخصي
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={getNotificationsLink(user.role)} className="cursor-pointer">
                      <Bell className="ml-2 h-4 w-4" />
                      الإشعارات
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600"
                    onClick={() => logout()}
                  >
                    <LogOut className="ml-2 h-4 w-4" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" asChild className="h-10 rounded-[6.5px] px-4 font-medium text-slate-700 hover:bg-blue-50 hover:text-[#2563EB]">
                <Link href="/auth/login">تسجيل الدخول</Link>
              </Button>
              <Button asChild className="h-10 rounded-[6.5px] bg-[#2563EB] px-4 font-medium text-white shadow-sm hover:bg-[#1D4ED8]">
                <Link href="/auth/register">إنشاء حساب</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
      )}

      {!isAuthRoute && (
        <div className="mx-auto max-w-7xl px-1 pb-3 md:hidden">
          <div className="relative">
            <input
              type="text"
              dir="rtl"
              placeholder="ابحث عن دورة..."
              className="h-10 w-full rounded-full border border-[#E5E7EB] bg-slate-50/70 pr-11 pl-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      )}
    </nav>
  )
}
