"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  Bell,
  Building2,
  Loader2,
  UserCheck,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { adminService, type DashboardStats } from "@/lib/admin-service"
import { notificationService, type NotificationItem } from "@/lib/notification-service"
import { formatDate, getFileUrl } from "@/lib/utils"

type DashboardItem = {
  id: string
  title: string
  subtitle: string
  status: string
  meta: string
  href: string
  icon?: React.ReactNode
}

type DashboardTrainer = {
  id: string
  createdAt?: string | Date
  verificationStatus?: string
  status?: string
  name?: string
  email?: string
  phone?: string
  avatar?: string | null
  user?: {
    createdAt?: string | Date
    name?: string
    email?: string
    phone?: string
  }
}

type DashboardInstitute = {
  id: string
  createdAt?: string | Date
  verificationStatus?: string
  status?: string
  name?: string
  email?: string
  phone?: string
  address?: string
  logo?: string | null
}

function MediaIcon({
  src,
  alt,
  fallback,
}: {
  src?: string | null
  alt: string
  fallback: React.ReactNode
}) {
  const [failed, setFailed] = useState(false)
  const resolvedSrc = src ? getFileUrl(src) : undefined

  if (!resolvedSrc || failed) {
    return <>{fallback}</>
  }

  return <img src={resolvedSrc} alt={alt} className="h-6 w-6 rounded-full object-cover" onError={() => setFailed(true)} />
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0)
}

function sortByDateDesc<T>(items: T[], getDate: (item: T) => string | Date | null | undefined) {
  return [...items].sort((a, b) => {
    const aTime = getDate(a) ? new Date(getDate(a) as string | Date).getTime() : 0
    const bTime = getDate(b) ? new Date(getDate(b) as string | Date).getTime() : 0
    return bTime - aTime
  })
}

function getStatusLabel(status?: string) {
  switch (status) {
    case "approved":
      return "معتمد"
    case "pending":
      return "قيد المراجعة"
    case "rejected":
      return "مرفوض"
    case "suspended":
      return "معلق"
    case "read":
      return "مقروء"
    case "unread":
      return "جديد"
    default:
      return status || "غير محدد"
  }
}

function QuickStatCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string
  value: number
  icon: React.ReactNode
  tone: "blue" | "emerald" | "amber" | "violet"
}) {
  const toneMap = {
    blue: { icon: "bg-blue-600 text-white", ring: "hover:border-blue-200 hover:shadow-[0_14px_26px_rgba(37,99,235,0.08)]" },
    emerald: { icon: "bg-emerald-600 text-white", ring: "hover:border-emerald-200 hover:shadow-[0_14px_26px_rgba(16,185,129,0.08)]" },
    amber: { icon: "bg-amber-500 text-white", ring: "hover:border-amber-200 hover:shadow-[0_14px_26px_rgba(245,158,11,0.08)]" },
    violet: { icon: "bg-violet-600 text-white", ring: "hover:border-violet-200 hover:shadow-[0_14px_26px_rgba(124,58,237,0.08)]" },
  }[tone]

  return (
    <Card className={`rounded-[12px] border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition-all duration-200 ${toneMap.ring}`}>
      <CardContent className="flex items-center justify-between gap-4 p-4 text-right">
        <div className="min-w-0 text-right">
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-extrabold leading-none text-slate-900">{formatNumber(value)}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneMap.icon}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

function SectionCard({
  title,
  href,
  counter,
  icon,
  tone,
  items,
  emptyText,
  emptyIcon,
}: {
  title: string
  href: string
  counter: string
  icon: React.ReactNode
  tone: "blue" | "emerald" | "amber"
  items: DashboardItem[]
  emptyText: string
  emptyIcon: React.ReactNode
}) {
  const toneMap = {
    blue: {
      icon: "bg-blue-600 text-white",
      chip: "bg-blue-50 text-blue-700 border-blue-200",
      ring: "hover:border-blue-200 hover:shadow-[0_10px_22px_rgba(37,99,235,0.08)]",
    },
    emerald: {
      icon: "bg-emerald-600 text-white",
      chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
      ring: "hover:border-emerald-200 hover:shadow-[0_10px_22px_rgba(16,185,129,0.08)]",
    },
    amber: {
      icon: "bg-amber-500 text-white",
      chip: "bg-amber-50 text-amber-700 border-amber-200",
      ring: "hover:border-amber-200 hover:shadow-[0_10px_22px_rgba(245,158,11,0.08)]",
    },
  }[tone]

  return (
    <Card className={`flex h-full flex-col overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition-all duration-200 ${toneMap.ring}`}>
      <CardHeader className="px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="secondary" className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneMap.chip}`}>
            {counter}
          </Badge>
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-bold leading-none text-slate-900">{title}</CardTitle>
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneMap.icon}`}>
              {icon}
            </div>
          </div>
        </div>
      </CardHeader>

      <div className="mx-4 border-t border-slate-100" />

      <CardContent className="flex flex-1 flex-col px-4 py-3">
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-slate-500">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${toneMap.icon}`}>
              {emptyIcon}
            </div>
            <p className="text-sm font-medium text-slate-500">{emptyText}</p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-3">
            {items.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-[10px] border border-slate-200 bg-white px-3 py-3 transition-all hover:-translate-y-[1px] hover:shadow-sm">
                <div className="flex items-start gap-3">
                  {item.icon && (
                    <div className="mt-0.5 shrink-0 text-slate-400">
                      {item.icon}
                    </div>
                  )}

                  <div className="min-w-0 flex-1 text-right">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{item.subtitle}</p>
                      </div>
                      <Badge variant="outline" className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${toneMap.chip}`}>
                        {getStatusLabel(item.status)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">{item.meta}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 border-t border-slate-100 pt-3">
          <Button asChild variant="outline" className="h-11 w-full rounded-[10px] border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50">
            <Link href={href}>
              <ArrowUpRight className="ml-2 h-4 w-4" />
              عرض الكل
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [trainers, setTrainers] = useState<DashboardTrainer[]>([])
  const [institutes, setInstitutes] = useState<DashboardInstitute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError("")
      const [statsData, notificationData, trainerData, instituteData] = await Promise.all([
        adminService.getDashboardStats(),
        notificationService.getNotifications(),
        adminService.getAllTrainers(),
        adminService.getAllInstitutes(),
      ])

      setDashboardStats(statsData)
      setNotifications(notificationData)
      setTrainers(trainerData)
      setInstitutes(instituteData)
    } catch (err) {
      console.error(err)
      setError("فشل تحميل بيانات لوحة التحكم")
    } finally {
      setLoading(false)
    }
  }

  const latestNotifications = useMemo(
    () =>
      sortByDateDesc(notifications, (item) => item.createdAt)
        .slice(0, 3)
        .map<DashboardItem>((item) => ({
          id: item.id,
          title: item.title,
          subtitle: item.message,
          status: item.isRead ? "read" : "unread",
          meta: formatDate(new Date(item.createdAt)),
          href: "/admin/notifications",
          icon: <Bell className="h-4 w-4" />,
        })),
    [notifications]
  )

  const latestTrainers = useMemo(
    () =>
      sortByDateDesc(trainers, (item) => item.createdAt || item.user?.createdAt)
        .slice(0, 3)
        .map<DashboardItem>((trainer) => ({
          id: trainer.id,
          title: trainer.name || trainer.user?.name || "مدرب بدون اسم",
          subtitle: trainer.email || trainer.user?.email || trainer.phone || trainer.user?.phone || "لا توجد بيانات اتصال",
          status: trainer.verificationStatus || trainer.status || "غير محدد",
          meta: (() => {
            const createdAt = trainer.createdAt ?? trainer.user?.createdAt
            return createdAt ? formatDate(new Date(createdAt)) : "غير محدد"
          })(),
          href: "/admin/trainers",
          icon: <MediaIcon src={trainer.avatar} alt={trainer.name || "Trainer"} fallback={<UserCheck className="h-4 w-4" />} />,
        })),
    [trainers]
  )

  const latestInstitutes = useMemo(
    () =>
      sortByDateDesc(institutes, (item) => item.createdAt)
        .slice(0, 3)
        .map<DashboardItem>((institute) => ({
          id: institute.id,
          title: institute.name || "معهد بدون اسم",
          subtitle: institute.email || institute.phone || institute.address || "لا توجد بيانات متاحة",
          status: institute.verificationStatus || institute.status || "غير محدد",
          meta: institute.createdAt ? formatDate(new Date(institute.createdAt)) : "غير محدد",
          href: "/admin/institutes",
          icon: <MediaIcon src={institute.logo} alt={institute.name || "Institute"} fallback={<Building2 className="h-4 w-4" />} />,
        })),
    [institutes]
  )

  const bannerStats = [
    { title: "إجمالي المستخدمين", value: 26, icon: <Users className="h-5 w-5" />, tone: "blue" as const },
    { title: "إجمالي المدربين", value: 7, icon: <UserCheck className="h-5 w-5" />, tone: "emerald" as const },
    { title: "إجمالي المعاهد", value: 5, icon: <Building2 className="h-5 w-5" />, tone: "amber" as const },
    { title: "الإشعارات الجديدة", value: 0, icon: <Bell className="h-5 w-5" />, tone: "violet" as const },
  ]

  const stats = useMemo(
    () => ({
      totalUsers: dashboardStats?.stats.totalUsers ?? 26,
      totalTrainers: trainers.length || 7,
      totalInstitutes: institutes.length || 5,
      newNotifications: notifications.filter((notification) => !notification.isRead).length,
    }),
    [dashboardStats, institutes.length, notifications, trainers.length]
  )

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          جارٍ تحميل لوحة التحكم...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-red-600">
        {error}
        <div className="mt-4">
          <Button onClick={loadDashboard} className="rounded-xl">
            إعادة المحاولة
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-10">
      <div className="rounded-[14px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-6 text-white shadow-[0_16px_38px_rgba(15,23,42,0.16)]">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.95fr] lg:items-center">
          <div className="max-w-2xl text-right">
            <Badge variant="outline" className="mb-3 border-white/15 bg-white/10 text-white">
              Admin Portal
            </Badge>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">لوحة تحكم المدير</h1>
            <p className="mt-2 text-sm leading-7 text-slate-300 md:text-base">
              متابعة الإشعارات وإدارة المدربين والمعاهد من مكان واحد.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {bannerStats.map((item) => (
              <div
                key={item.title}
                className="rounded-[8px] border border-white/12 bg-white/8 p-3 text-right backdrop-blur-sm"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-slate-300/90">{item.icon}</div>
                  <p className="text-[11px] font-medium text-slate-300">{item.title}</p>
                </div>
                <p className="text-2xl font-extrabold leading-none text-white">{formatNumber(item.value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <SectionCard
          title="الإشعارات"
          counter={`${stats.newNotifications} إشعار`}
          href="/admin/notifications"
          icon={<Bell className="h-5 w-5" />}
          tone="blue"
          items={latestNotifications}
          emptyText="لا توجد إشعارات جديدة"
          emptyIcon={<Bell className="h-5 w-5" />}
        />

        <SectionCard
          title="إدارة المدربين"
          counter={`${stats.totalTrainers} مدرب`}
          href="/admin/trainers"
          icon={<UserCheck className="h-5 w-5" />}
          tone="emerald"
          items={latestTrainers}
          emptyText="لا توجد طلبات أو حسابات للمدربين"
          emptyIcon={<UserCheck className="h-5 w-5" />}
        />

        <SectionCard
          title="إدارة المعاهد"
          counter={`${stats.totalInstitutes} معهد`}
          href="/admin/institutes"
          icon={<Building2 className="h-5 w-5" />}
          tone="amber"
          items={latestInstitutes}
          emptyText="لا توجد طلبات أو حسابات للمعاهد"
          emptyIcon={<Building2 className="h-5 w-5" />}
        />
      </div>
    </div>
  )
}
