"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CourseCard } from "@/components/course-card"
import { AlertCircle, Bell, BookOpen, CalendarDays, Heart, Loader2, PlayCircle, Search } from "lucide-react"
import { studentService, StudentCourse, StudentDashboardData, StudentNotification } from "@/lib/student-service"
import { formatDate, formatTime, getFileUrl } from "@/lib/utils"
import { useNotifications } from "@/contexts/notification-context"

type ScheduleSession = {
  id: string
  topic?: string
  courseTitle?: string
  startTime: string
  endTime: string
  type?: "online" | "in_person" | "hybrid" | string
}

type WishlistCourse = {
  id: string
  title: string
}

type DashboardCourse = StudentCourse & {
  trainerAvatar?: string
  trainerImage?: string
  trainerPhoto?: string
  instituteAvatar?: string
  instituteLogo?: string
}

const COURSE_IMAGE_PLACEHOLDER = "/images/course-abstract.svg"

function relativeTime(isoDate: string) {
  const now = Date.now()
  const time = new Date(isoDate).getTime()
  const diff = time - now
  const absMinutes = Math.floor(Math.abs(diff) / 60000)
  if (absMinutes < 60) return diff >= 0 ? `بعد ${Math.max(1, absMinutes)} دقيقة` : `منذ ${Math.max(1, absMinutes)} دقيقة`
  const hours = Math.floor(absMinutes / 60)
  if (hours < 24) return diff >= 0 ? `بعد ${hours} ساعة` : `منذ ${hours} ساعة`
  const days = Math.floor(hours / 24)
  return diff >= 0 ? `بعد ${days} يوم` : `منذ ${days} يوم`
}

function sessionTypeLabel(type?: string) {
  if (type === "flexible") return "يعتمد على المعهد لاحقاً"
  if (type === "online") return "أونلاين"
  if (type === "in_person") return "حضوري"
  if (type === "hybrid") return "هجين"
  return "جلسة"
}

function notificationTypeClass(type: StudentNotification["type"]) {
  if (type === "success") return "bg-emerald-500"
  if (type === "warning") return "bg-amber-500"
  if (type === "reminder") return "bg-blue-500"
  if (type === "material") return "bg-indigo-500"
  return "bg-slate-500"
}

function getCourseOwnerAvatar(course: DashboardCourse) {
  return getFileUrl(course.trainerAvatar || course.trainerImage || course.trainerPhoto || course.instituteAvatar || course.instituteLogo)
}

function makeFallbackAvatarDataUri(name: string) {
  const letter = (name || "؟").trim().charAt(0) || "؟"
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='100%' height='100%' rx='48' fill='#DBEAFE'/><text x='50%' y='55%' text-anchor='middle' dominant-baseline='middle' font-family='Thmanyah Sans' font-size='42' font-weight='700' fill='#1D4ED8'>${letter}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export default function StudentDashboard() {
  const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null)
  const [schedule, setSchedule] = useState<ScheduleSession[]>([])
  const [wishlist, setWishlist] = useState<WishlistCourse[]>([])
  const [nowTs, setNowTs] = useState(() => Date.now())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { unreadCount } = useNotifications()

  useEffect(() => {
    Promise.all([studentService.getDashboard(), studentService.getSchedule(), studentService.getWishlist()])
      .then(([dashboardData, scheduleData, wishlistData]) => {
        setDashboard(dashboardData)
        setSchedule(scheduleData || [])
        setWishlist(wishlistData || [])
      })
      .catch(() => setError("فشل تحميل بيانات لوحة التحكم"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const upcomingSessions = useMemo(
    () =>
      schedule
        .filter((session) => new Date(session.endTime).getTime() > nowTs)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [schedule, nowTs]
  )

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
        <Loader2 className="ml-3 h-7 w-7 animate-spin" />
        <span className="text-lg">جاري تحميل لوحة التحكم...</span>
      </div>
    )
  }

  if (error || !dashboard) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-red-500">
        <AlertCircle className="h-10 w-10" />
        <p className="text-lg">{error || "حدث خطأ غير متوقع"}</p>
        <Button asChild variant="outline">
          <Link href="/student/dashboard">إعادة المحاولة</Link>
        </Button>
      </div>
    )
  }

  const { user, currentCourses, recentNotifications, stats } = dashboard

  return (
    <div dir="rtl" className="mx-auto max-w-7xl space-y-6 bg-slate-50/80 pb-10 text-right">
      <section className="relative overflow-hidden rounded-2xl border border-blue-700/35 bg-gradient-to-r from-[#1D4ED8] via-[#2749DD] to-[#3C39D3] p-4 text-white shadow-[0_18px_36px_rgba(30,64,175,0.20)] md:p-5">
        <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 right-12 h-56 w-56 rounded-full bg-indigo-400/25 blur-3xl" />

        <div dir="ltr" className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div dir="rtl" className="order-2 space-y-2">
            <h1 className="text-2xl font-extrabold md:text-3xl">مرحباً، {user.name || "أحمد الخنيشي"} 👋</h1>
            <p className="text-sm text-blue-100 md:text-base">هذا ملخص نشاطك التعليمي اليوم</p>
            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-start">
              <Button asChild className="h-10 rounded-lg bg-white text-[#1E40AF] hover:bg-blue-50">
                <Link href="/student/courses">
                  <Search className="ml-2 h-4 w-4" />
                  استعراض الدورات
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-10 rounded-lg border-blue-300/70 bg-blue-700/25 text-white hover:bg-white hover:text-blue-700">
                <Link href="/student/my-courses">
                  <BookOpen className="ml-2 h-4 w-4" />
                  دوراتي
                </Link>
              </Button>
            </div>
          </div>

          <div dir="rtl" className="order-1 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
              <BookOpen className="mb-2 h-4 w-4 text-blue-100" />
              <p className="text-2xl font-black leading-none">{stats.activeCourses}</p>
              <p className="mt-1 text-xs text-blue-100">الدورات النشطة</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
              <CalendarDays className="mb-2 h-4 w-4 text-blue-100" />
              <p className="text-2xl font-black leading-none">{upcomingSessions.length}</p>
              <p className="mt-1 text-xs text-blue-100">الجلسات القادمة</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
              <Heart className="mb-2 h-4 w-4 text-blue-100" />
              <p className="text-2xl font-black leading-none">{wishlist.length}</p>
              <p className="mt-1 text-xs text-blue-100">الرغبات</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
              <Bell className="mb-2 h-4 w-4 text-blue-100" />
              <p className="text-2xl font-black leading-none">{unreadCount}</p>
              <p className="mt-1 text-xs text-blue-100">الإشعارات غير المقروءة</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="flex h-full flex-col rounded-2xl border border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100 p-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              الجدول القادم
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col p-4">
            {upcomingSessions.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center">
                <CalendarDays className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm font-bold text-slate-900">لا توجد جلسات قادمة</p>
                <p className="mt-1 text-xs text-slate-500">عند انضمامك لدورة ستظهر جلساتك هنا</p>
              </div>
            ) : (
              <div className="flex-1 space-y-2">
                {upcomingSessions.slice(0, 2).map((session) => (
                  <div key={session.id} className="rounded-xl border border-slate-200/80 bg-white p-3">
                    <div dir="ltr" className="flex items-center justify-between gap-4">
                      <div className="flex shrink-0 flex-col items-start gap-2 self-start">
                        <span className="text-[11px] text-slate-400">{relativeTime(session.startTime)}</span>
                        <Button asChild size="sm" variant="outline" className="h-9 min-w-[84px] rounded-lg border-blue-200 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                          <Link href="/student/schedule">التفاصيل</Link>
                        </Button>
                      </div>
                      <div dir="rtl" className="min-w-0 flex-1 space-y-1 text-right">
                        <p className="line-clamp-1 text-sm font-extrabold text-slate-900">{session.courseTitle || session.topic || "جلسة قادمة"}</p>
                        <Badge variant="outline" className="h-5 w-fit text-[11px]">
                          {sessionTypeLabel(session.type)}
                        </Badge>
                        <p className="line-clamp-1 text-xs text-slate-500">
                          {formatDate(new Date(session.startTime))} · {formatTime(new Date(session.startTime))} - {formatTime(new Date(session.endTime))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button asChild variant="outline" className="mt-3 h-9 w-full rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50">
              <Link href="/student/schedule">عرض الجدول كامل</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col rounded-2xl border border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100 p-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Bell className="h-4 w-4 text-blue-600" />
              آخر الإشعارات
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col p-4">
            {recentNotifications.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-center text-sm text-slate-500">لا توجد إشعارات جديدة</p>
              </div>
            ) : (
              <div className="flex-1 space-y-2">
                {recentNotifications.slice(0, 2).map((notification) => (
                  <div key={notification.id} className="rounded-lg border border-slate-100 p-2.5">
                    <div className="flex items-start gap-2">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notificationTypeClass(notification.type)}`} />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-bold text-slate-800">{notification.title}</p>
                        <div dir="ltr" className="flex items-center justify-between gap-2">
                          {!notification.isRead && (
                            <Badge className="flex h-5 w-fit items-center justify-center rounded-full bg-blue-100 px-2 text-[10px] font-bold text-blue-700 hover:bg-blue-100">
                              جديد
                            </Badge>
                          )}
                          <p dir="rtl" className="line-clamp-1 flex-1 text-xs text-slate-600">{notification.message}</p>
                        </div>
                        <div className="mt-1">
                          <span className="text-[11px] text-slate-400">{relativeTime(notification.time)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button asChild variant="outline" className="mt-3 h-9 w-full rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50">
              <Link href="/student/notifications">عرض كل الإشعارات</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col rounded-2xl border border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100 p-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Heart className="h-4 w-4 text-rose-500" />
              قائمة الرغبات
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col p-4">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
              <p className="text-xs text-slate-500">عدد الدورات المحفوظة</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{wishlist.length}</p>
            </div>
            {wishlist.length === 0 ? (
              <div className="mt-2 flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 p-3 text-center">
                <p className="text-sm font-bold text-slate-800">لم تقم بحفظ أي دورة بعد</p>
              </div>
            ) : (
              <div className="mt-2 flex-1 space-y-2">
                {wishlist.slice(0, 1).map((course) => (
                  <div key={course.id} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2.5">
                    <Heart className="h-3.5 w-3.5 text-rose-500" />
                    <p className="line-clamp-1 text-sm text-slate-700">{course.title}</p>
                  </div>
                ))}
              </div>
            )}
            <Button asChild variant="outline" className="mt-3 h-9 w-full rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50">
              <Link href="/student/wishlist">عرض الرغبات</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <PlayCircle className="h-5 w-5 text-blue-600" />
            دوراتي الحالية
          </h2>
          <Button asChild variant="ghost" className="text-sm text-blue-700 hover:bg-blue-50 hover:text-blue-800">
            <Link href="/student/my-courses">عرض الكل</Link>
          </Button>
        </div>

        {currentCourses.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-slate-200 bg-white shadow-sm">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <BookOpen className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-lg font-bold text-slate-900">لا توجد دورات نشطة حالياً</p>
              <p className="mt-1 text-sm text-slate-500">ابدأ بتصفح الدورات وانضم إلى الدورة المناسبة لك</p>
              <Button asChild className="mt-5 rounded-lg bg-blue-600 hover:bg-blue-700">
                <Link href="/student/courses">استعراض الدورات</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(currentCourses as DashboardCourse[]).map((course) => (
              <CourseCard
                key={course.id}
                id={course.id}
                title={course.title}
                description={course.shortDescription}
                price={0}
                studentsCount={0}
                duration={"0"}
                image={getFileUrl(course.image) || COURSE_IMAGE_PLACEHOLDER}
                category={course.category || "الفئة"}
                instructor={{
                  name: course.trainer || "غير محدد",
                  avatar: getCourseOwnerAvatar(course) || makeFallbackAvatarDataUri(course.trainer || "غير محدد"),
                }}
                instructors={course.trainers?.map((t: any) => ({ name: t.name, avatar: t.avatar || undefined }))}
                basePath="/student/courses"
                imageVariant="browse"
                hideStats={true}
                hidePrice={true}
                fullWidthButton={true}
                hideButtonArrow={true}
                hideFavoriteButton={true}
                disableImageZoom={true}
                disableHoverEffects={true}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

