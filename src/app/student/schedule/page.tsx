"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, Video, AlertTriangle, Loader2, ChevronDown, MapPin } from "lucide-react"
import { formatDate, formatTime } from "@/lib/utils"
import { toast } from "sonner"
import { studentService } from "@/lib/student-service"

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function StudentSchedulePage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => new Date())
  const [view, setView] = useState<"all" | "upcoming" | "completed">("upcoming")
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all")

  useEffect(() => {
    studentService
      .getSchedule()
      .then((data) => setSessions(data))
      .catch(() => toast.error("حدث خطأ أثناء جلب الجدول"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(t)
  }, [])

  const courseOptions = Array.from(new Map(sessions.map((s) => [s.courseId, s.courseTitle])).entries()).filter(([id]) => id !== null) as [string, string][]

  const filteredSessions = sessions.filter((s) => {
    const matchesCourse = selectedCourseId === "all" || s.courseId === selectedCourseId
    const isCompleted = new Date(s.endTime).getTime() < now.getTime()
    const isUpcoming = new Date(s.endTime).getTime() > now.getTime()
    if (view === "all") return matchesCourse
    if (view === "completed") return matchesCourse && isCompleted
    return matchesCourse && isUpcoming
  })

  const toLocalDateKey = (iso: string) => formatDateKey(new Date(iso))

  const sessionsByDate = filteredSessions.reduce((acc, s) => {
    const k = toLocalDateKey(s.startTime)
    if (!acc[k]) acc[k] = []
    acc[k].push(s)
    return acc
  }, {} as Record<string, any[]>)

  const sortedDates = Object.keys(sessionsByDate).sort()
  sortedDates.forEach((k) => sessionsByDate[k].sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()))

  const getEffectiveStatus = (s: any) => {
    if (s.status === "cancelled") return "cancelled"
    if (new Date(s.endTime).getTime() < now.getTime()) return "completed"
    return s.status
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "scheduled":
        return { label: "قادم", className: "bg-blue-100 text-blue-700" }
      case "completed":
        return { label: "مكتمل", className: "bg-green-100 text-green-700" }
      case "cancelled":
        return { label: "ملغي", className: "bg-red-100 text-red-700" }
      case "postponed":
        return { label: "مؤجل", className: "bg-amber-100 text-amber-700" }
      default:
        return { label: status, className: "bg-gray-100 text-gray-700" }
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-gray-500">جاري جلب جدولك...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-8 pt-4 text-right" dir="rtl">
      <Card className="overflow-hidden rounded-[6.5px] border border-blue-300/30 bg-gradient-to-l from-[#2563EB] to-[#4F46E5] shadow-sm">
        <CardContent className="flex min-h-[112px] flex-col justify-center gap-3 p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div className="space-y-1 text-right text-white">
            <h1 className="text-2xl font-extrabold leading-none">جدولي</h1>
            <p className="text-sm text-blue-100">تابع مواعيد جلساتك القادمة</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white">
            <CalendarIcon className="h-4 w-4" />
            <span>{filteredSessions.length} جلسة</span>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 rounded-[6.5px] border border-[#E2E8F0] bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1 text-right md:min-w-[240px]">
              <h2 className="text-base font-bold text-slate-900">تصفية الجدول</h2>
              <p className="text-sm text-slate-500">اختر نوع الجلسات والدورة المطلوبة</p>
            </div>

            <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row md:items-start md:gap-4">
              <div className="space-y-1.5">
                <label className="block text-right text-sm font-semibold text-slate-600">حالة الجلسة</label>
                <div className="inline-flex h-10 overflow-hidden rounded-[6.5px] border border-slate-200 bg-white">
                  <button
                    onClick={() => setView("upcoming")}
                    className={`h-10 px-4 text-sm font-semibold transition-colors ${view === "upcoming" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    القادمة
                  </button>
                  <button
                    onClick={() => setView("all")}
                    className={`h-10 border-x border-slate-200 px-4 text-sm font-semibold transition-colors ${view === "all" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    الكل
                  </button>
                  <button
                    onClick={() => setView("completed")}
                    className={`h-10 px-4 text-sm font-semibold transition-colors ${view === "completed" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    المنتهية
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-right text-sm font-semibold text-slate-600">الدورة</label>
                <div className="relative w-full md:min-w-[220px]">
                  <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="h-10 w-full appearance-none rounded-[6.5px] border border-slate-200 bg-white px-3 pl-9 text-right text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">جميع الدورات</option>
                    {courseOptions.map(([id, title]) => (
                      <option key={id} value={id}>
                        {title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredSessions.length === 0 ? (
        <Card className="mt-7 rounded-[6.5px] border-2 border-dashed border-slate-200 bg-gray-50">
          <CardContent className="p-10 text-center">
            <CalendarIcon className="mx-auto mb-4 h-10 w-10 text-gray-300" />
            <h3 className="mb-2 text-lg font-bold text-gray-900">
              {selectedCourseId === "all" ? "لا توجد جلسات مجدولة" : "لا توجد جلسات لهذه الدورة"}
            </h3>
            <p className="text-gray-500">
              {selectedCourseId !== "all"
                ? "جرّب اختيار دورة أخرى."
                : view === "completed"
                  ? "لا توجد جلسات منتهية بعد."
                  : view === "upcoming"
                    ? "لا توجد جلسات قادمة حالياً."
                    : "لا توجد جلسات حالياً."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-7 space-y-7">
          {sortedDates.map((dateStr) => (
            <section key={dateStr} className="space-y-4">
              <div className="flex items-center justify-start gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {formatDate(new Date(`${dateStr}T00:00:00`), { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </h3>
              </div>

              <div className="space-y-4 border-r border-blue-100/70 pr-3">
                {sessionsByDate[dateStr].map((session: any) => {
                  const eff = getEffectiveStatus(session)
                  const statusCfg = getStatusConfig(eff)

                  return (
                    <Card key={session.id} className="rounded-[6.5px] border border-[#E2E8F0] bg-white shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="order-2 md:order-3 md:min-w-[220px]">
                            {(["scheduled", "postponed"].includes(eff) && (session.type === "online" || session.type === "hybrid")) ? (
                              session.meetingLink ? (
                                <Button asChild className="h-[38px] w-full rounded-[6.5px] bg-blue-600 font-semibold hover:bg-blue-700">
                                  <a href={session.meetingLink} target="_blank" rel="noopener noreferrer">دخول الجلسة</a>
                                </Button>
                              ) : (
                                <div className="flex h-[38px] items-center justify-center gap-1 rounded-[6.5px] border border-amber-200 bg-amber-50 px-3 text-xs font-medium text-amber-700">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  <span>رابط الاجتماع لم يتوفر بعد</span>
                                </div>
                              )
                            ) : (
                              <div className="h-[38px]" />
                            )}
                          </div>

                          <div className="order-1 flex-1 text-right md:order-2">
                            <div className="mb-1.5 flex items-center justify-start gap-2">
                              <h4 className="text-base font-extrabold text-slate-900">{session.topic || session.title || "جلسة تدريبية"}</h4>
                              <Badge className={`${statusCfg.className} rounded-full px-2 py-0.5 text-[11px]`}>{statusCfg.label}</Badge>
                            </div>
                            <p className="text-sm font-semibold text-slate-700">{session.courseTitle || "-"}</p>
                            <div className="mt-1.5 flex items-center justify-start gap-1 text-sm text-slate-500">
                              {session.type === "online" ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                              <span>{session.location || (session.type === "online" ? "أونلاين" : "حضوري")}</span>
                            </div>
                          </div>

                          <div className="order-3 md:order-1">
                            <div className="inline-flex min-w-[92px] flex-col items-center justify-center rounded-[6.5px] border border-blue-100 bg-blue-50 px-3 py-2 text-blue-700">
                              <span className="text-sm font-bold leading-none">{formatTime(new Date(session.startTime))}</span>
                              <span className="my-1 text-[11px] leading-none text-blue-500">إلى</span>
                              <span className="text-sm font-bold leading-none">{formatTime(new Date(session.endTime))}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

