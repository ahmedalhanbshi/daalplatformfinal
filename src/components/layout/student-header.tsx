"use client"

import Link from "next/link"
import { Bell, Menu, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
import { getFileUrl } from "@/lib/utils"
import { useNotifications } from "@/contexts/notification-context"

interface StudentHeaderProps {
  onMenuClick: () => void
}

export function StudentHeader({ onMenuClick }: StudentHeaderProps) {
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const avatarSrc = getFileUrl(user?.avatar) || "/images/placeholder.png"

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-6 shadow-sm transition-all duration-300">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="text-gray-500 hover:text-gray-900 hover:bg-gray-100/80 dark:hover:bg-slate-800"
        title="إظهار/إخفاء القائمة الجانبية"
      >
        <Menu className="h-5 w-5 transition-transform duration-300" />
        <span className="sr-only">القائمة</span>
      </Button>

      <div className="mr-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="relative rounded-full text-gray-500 hover:text-primary hover:bg-primary/10">
          <Link href="/student/notifications" title="الإشعارات">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-950 animate-pulse" />
            )}
            <span className="sr-only">الإشعارات</span>
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="pl-2 pr-1 py-1 h-auto rounded-full hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all dark:hover:bg-slate-800 dark:border-transparent dark:hover:border-slate-700">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-gray-200 dark:border-slate-700">
                  <AvatarImage src={avatarSrc} alt={user?.name ?? "student"} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {user?.name?.charAt(0) ?? "؟"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-right sm:block">
                  <p className="mb-1 text-sm font-semibold leading-none text-slate-900 dark:text-slate-100">{user?.name ?? "غير محدد"}</p>
                  <p className="text-[10px] font-bold uppercase leading-none text-blue-600">طالب</p>
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name ?? "غير محدد"}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email ?? "غير محدد"}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/student/profile" className="relative flex w-full items-center justify-end pl-4 pr-10 text-right cursor-pointer">
                <User className="absolute right-3 h-4 w-4 shrink-0" />
                <span className="w-full">الملف الشخصي</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/student/notifications" className="relative flex w-full items-center justify-end pl-4 pr-10 text-right cursor-pointer">
                <Bell className="absolute right-3 h-4 w-4 shrink-0" />
                <span className="w-full">الإشعارات</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="relative flex items-center justify-end pl-4 pr-10 text-red-600 focus:text-red-600 cursor-pointer"
            >
              <LogOut className="absolute right-3 h-4 w-4 shrink-0" />
              <span className="w-full">تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
