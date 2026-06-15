"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Book, BookOpen, Home, Calendar } from "lucide-react"
import { cn, getFileUrl } from "@/lib/utils"
import { PLATFORM_NAME } from "@/lib/brand"
import { usePlatform } from "@/contexts/platform-context"

const links = [
  { href: "/student/dashboard", label: "الصفحة الرئيسية", icon: Home },
  { href: "/student/courses", label: "تصفح الدورات", icon: BookOpen },
  { href: "/student/my-courses", label: "دوراتي", icon: Book },
  { href: "/student/schedule", label: "الجدول", icon: Calendar },
]

export function StudentSidebar() {
  const pathname = usePathname()
  const { settings } = usePlatform()
  const siteName = settings?.general.siteName || PLATFORM_NAME

  return (
    <aside className="flex h-screen w-[280px] flex-col border-l-0 bg-white/80 shadow-[4px_0_24px_rgba(0,0,0,0.02)] backdrop-blur-xl dark:bg-slate-900/80">
      <div className="flex h-16 items-center gap-3 border-b border-gray-100 p-6 dark:border-slate-800">
        <Link href="/student/dashboard" className="flex items-center gap-3">
          <div className="relative h-8 w-8">
            <Image src={getFileUrl(settings?.general?.siteLogo) || "/images/logo.png"} alt={siteName} fill className="object-contain" unoptimized />
          </div>
          <span className="bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-xl font-bold text-transparent">
            {siteName}
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
        {links.map((link) => {
          let isActive = false
          if (link.href === "/student/courses") {
            isActive = pathname === link.href || pathname.startsWith("/student/explore/course/")
          } else if (link.href === "/student/my-courses") {
            isActive = pathname.startsWith(link.href) || (pathname.startsWith("/student/courses/") && pathname !== "/student/courses")
          } else {
            isActive = pathname.startsWith(link.href)
          }

          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200",
                isActive ? "bg-blue-700 text-white shadow-md shadow-blue-200" : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
              )}
            >
              <div className="flex w-full items-center gap-3">
                <Icon className={cn("h-5 w-5", isActive ? "text-white" : "text-gray-400 group-hover:text-blue-600")} />
                <span className="flex-1 text-right">{link.label}</span>
              </div>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
