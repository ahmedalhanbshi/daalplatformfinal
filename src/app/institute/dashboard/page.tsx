"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Bell, BookOpen, Building2, CalendarDays, Clock3, Loader2, Plus, Users, UserPlus } from "lucide-react"
import { formatDate, formatTime } from "@/lib/utils"
import { instituteService, InstituteDashboardData } from "@/lib/institute-service"

function relativeMinutes(dateIso?: string) {
  if (!dateIso) return "الآن"
  const now = Date.now()
  const diffMs = Math.max(0, now - new Date(dateIso).getTime())
  const minutes = Math.max(1, Math.floor(diffMs / 60000))
  if (minutes < 60) return `منذ ${minutes} دقيقة`
  const hours = Math.floor(minutes / 60)
  return `منذ ${hours} ساعة`
}

function normalizeStatus(status?: string) {
  return String(status || "")
    .trim()
    .toLowerCase()
}

function isPendingStatus(status?: string) {
  const value = normalizeStatus(status)
  return value === "pending" || value === "pending_approval" || value === "pending_review" || value === "under_review"
}

function statusLabel(status?: string) {
  const value = normalizeStatus(status)
  if (value === "approved" || value === "accepted") return "مقبول"
  if (isPendingStatus(value)) return "قيد المراجعة"
  if (value === "pending_payment") return "بانتظار الدفع"
  if (value === "rejected") return "مرفوض"
  if (value === "cancelled") return "ملغي"
  return "مجدول"
}

export default function InstituteDashboard() {
  const [data, setData] = useState<InstituteDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    instituteService
      .getDashboard()
      .then(setData)
      .catch(() => setError("فشل تحميل بيانات لوحة التحكم"))
      .finally(() => setLoading(false))
  }, [])

  const dashboard = useMemo(() => {
    if (!data) {
      return {
        instituteName: "المعهد",
        totalCourses: 0,
        totalStudents: 0,
        totalRooms: 0,
        pendingBookings: 0,
        upcomingSessions: [] as InstituteDashboardData["upcomingSessions"],
        newEnrollments: [] as InstituteDashboardData["recentEnrollments"],
        notifications: [] as { title: string; subtitle: string; time: string; dot: string }[],
      }
    }

    const sortedUpcoming = [...(data.upcomingSessions || [])].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    )
    const upcomingSessions = sortedUpcoming.slice(0, 3)
    const newEnrollments = (data.recentEnrollments || []).slice(0, 3)
    const todayBookingsCount = data.stats?.roomBookingsToday || 0

    const notifications = (data.recentNotifications || []).slice(0, 3).map((notification: any) => ({
        title: notification.title,
        subtitle: notification.message,
        time: relativeMinutes(notification.createdAt),
        dot: notification.isRead ? "bg-slate-300" : "bg-blue-500",
    }))

    return {
      instituteName: data.institute?.name || "المعهد",
      totalCourses: data.stats?.totalCourses ?? 0,
      totalStudents: data.stats?.totalStudents ?? 0,
      totalRooms: data.stats?.rooms ?? 0,
      todayBookingsCount,
      upcomingSessions,
      newEnrollments,
      notifications,
    }
  }, [data])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-400" dir="rtl">
        <Loader2 className="ml-3 h-7 w-7 animate-spin" />
        <span className="text-lg">جاري تحميل لوحة التحكم...</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-red-500" dir="rtl">
        <AlertCircle className="h-10 w-10" />
        <p className="text-lg">{error || "حدث خطأ غير متوقع"}</p>
        <Button
          variant="outline"
          onClick={() => {
            setLoading(true)
            setError(null)
            instituteService
              .getDashboard()
              .then(setData)
              .catch(() => setError("فشل تحميل بيانات لوحة التحكم"))
              .finally(() => setLoading(false))
          }}
        >
          إعادة المحاولة
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10" dir="rtl">
      <section className="relative overflow-hidden rounded-2xl border border-blue-700/40 bg-gradient-to-r from-[#1D4ED8] via-[#2445DE] to-[#3B38D0] p-5 text-white shadow-[0_18px_36px_rgba(30,64,175,0.28)] md:p-6">
        <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 right-10 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative z-10 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-4 text-right">
            <div>
              <h1 className="text-3xl font-extrabold leading-tight">مرحبًا، {dashboard.instituteName} 👋</h1>
              <p className="mt-1 text-sm text-blue-100 md:text-base">هذا ملخص لأداء المعهد ودوراته وحجوزاته اليوم</p>
            </div>
            <div className="flex flex-wrap justify-start gap-2.5">
              <Button asChild className="h-10 rounded-lg bg-white text-[#1E40AF] hover:bg-blue-50">
                <Link href="/institute/courses/create">
                  <Plus className="ml-2 h-4 w-4" />
                  إنشاء دورة جديدة
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-10 rounded-lg border-blue-300/60 bg-blue-700/30 text-white hover:bg-white hover:text-blue-700">
                <Link href="/institute/halls">
                  <Building2 className="ml-2 h-4 w-4" />
                  إضافة قاعة
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-10 rounded-lg border-blue-300/60 bg-blue-700/30 text-white hover:bg-white hover:text-blue-700">
                <Link href="/institute/schedule">
                  <CalendarDays className="ml-2 h-4 w-4" />
                  عرض الجدول
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 text-center backdrop-blur-sm">
              <BookOpen className="mx-auto mb-2 h-5 w-5 text-blue-100" />
              <div className="text-3xl font-black leading-none">{dashboard.totalCourses}</div>
              <div className="mt-1 text-xs text-blue-100">الدورات</div>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 text-center backdrop-blur-sm">
              <Users className="mx-auto mb-2 h-5 w-5 text-blue-100" />
              <div className="text-3xl font-black leading-none">{dashboard.totalStudents}</div>
              <div className="mt-1 text-xs text-blue-100">الطلاب</div>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 text-center backdrop-blur-sm">
              <Building2 className="mx-auto mb-2 h-5 w-5 text-blue-100" />
              <div className="text-3xl font-black leading-none">{dashboard.totalRooms}</div>
              <div className="mt-1 text-xs text-blue-100">القاعات</div>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 text-center backdrop-blur-sm">
              <Clock3 className="mx-auto mb-2 h-5 w-5 text-blue-100" />
              <div className="text-3xl font-black leading-none">{dashboard.todayBookingsCount}</div>
              <div className="mt-1 text-xs text-blue-100">حجوزات اليوم</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="flex h-full flex-col rounded-2xl border border-slate-200/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              الجلسات القادمة
            </CardTitle>
            <Link href="/institute/schedule" className="text-sm font-bold text-blue-600 hover:text-blue-700">
              عرض الكل
            </Link>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col p-4">
            {!dashboard.upcomingSessions || dashboard.upcomingSessions.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-center text-sm text-slate-500">لا توجد جلسات قادمة</p>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-3">
                  {dashboard.upcomingSessions.map((session: any, idx: number) => (
                    <div key={session.id || idx} className="rounded-xl border border-slate-100 p-3">
                      <p className="text-base font-extrabold text-slate-900">{session.title}</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>{formatDate(new Date(session.startDate))}</span>
                        <span>{formatTime(new Date(session.startDate))}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {session.enrolledStudents || 0} طالب
                        </span>
                        <Badge variant="outline" className="text-[11px]">
                          {String(session.type).toUpperCase() === "ONLINE" ? "جلسة أونلاين" : "جلسة حضورية"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <Button asChild className="mt-4 h-10 w-full rounded-lg bg-[#2563EB] hover:bg-blue-700">
                  <Link href="/institute/schedule">عرض الجدول</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col rounded-2xl border border-slate-200/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <UserPlus className="h-4 w-4 text-blue-600" />
              طلبات التسجيل الجديدة
            </CardTitle>
            <Link href="/institute/students" className="text-sm font-bold text-blue-600 hover:text-blue-700">
              عرض الكل
            </Link>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col p-4">
            {dashboard.newEnrollments.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-center text-sm text-slate-500">لا توجد طلبات تسجيل جديدة</p>
              </div>
            ) : (
              <div className="flex-1 space-y-3">
                {dashboard.newEnrollments.map((request: any, idx: number) => (
                  <div key={request.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-600">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1 px-3 text-right">
                      <p className="truncate text-sm font-bold text-slate-800">{request.studentName}</p>
                      <p className="truncate text-xs text-slate-500">{request.courseTitle}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {statusLabel(request.status)} - {relativeMinutes(request.enrolledAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button asChild variant="outline" className="mt-auto h-10 w-full rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50">
              <Link href="/institute/students">عرض جميع الطلبات</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col rounded-2xl border border-slate-200/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Bell className="h-4 w-4 text-blue-600" />
              أحدث الإشعارات
            </CardTitle>
            <Link href="/institute/notifications" className="text-sm font-bold text-blue-600 hover:text-blue-700">
              عرض الكل
            </Link>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-3 p-4">
            {dashboard.notifications.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-center text-sm text-slate-500">لا توجد إشعارات جديدة</p>
              </div>
            ) : (
              <div className="flex-1 space-y-3">
                {dashboard.notifications.map((item: any, idx: number) => (
                  <div key={`${item.title}-${idx}`} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.dot}`} />
                    <div className="min-w-0 flex-1 text-right">
                      <p className="text-sm font-bold text-slate-800">{item.title}</p>
                      <p className="truncate text-sm text-slate-600">{item.subtitle}</p>
                      <p className="mt-1 text-xs text-slate-400">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-auto" />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}


