"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CalendarClock,
  CalendarDays,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Clock3,
  Filter,
  Globe,
  Loader2,
  MapPin,
  Search,
  Settings,
  Users,
  Video,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { formatDate, formatTime } from "@/lib/utils"
import { Session, trainerService } from "@/lib/trainer-service"

const TIME_SLOTS = [
  "08:00 - 09:00",
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 13:00",
  "13:00 - 14:00",
  "14:00 - 15:00",
  "15:00 - 16:00",
  "16:00 - 17:00",
  "17:00 - 18:00",
  "18:00 - 19:00",
  "19:00 - 20:00",
]
const WEEK_DAYS = ["أحد", "إثن", "ثلا", "أرب", "خم", "جم", "سبت"]
const radiusClass = "rounded-[6.5px]"

type StatusFilter = "all" | "upcoming" | "today" | "completed" | "direct"
type TypeFilter = "all" | "online" | "in_person"

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function normalizeLocationLabel(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase()
  if (!normalized) return "غير محدد"
  if (normalized === "teams" || normalized.includes("microsoft teams")) return "Microsoft Teams"
  if (normalized === "other") return "رابط خارجي"
  if (normalized === "meet" || normalized.includes("google meet")) return "Google Meet"
  if (normalized === "zoom") return "Zoom"
  return String(value)
}

export default function TrainerSchedulePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => new Date())

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("upcoming")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [searchTerm, setSearchTerm] = useState("")

  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [actionType, setActionType] = useState<"reschedule" | "cancel" | "update_link">("reschedule")
  const [reason, setReason] = useState("")
  const [updateAll, setUpdateAll] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [calendarOffset, setCalendarOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [isSlotsLoading, setIsSlotsLoading] = useState(false)
  const [blackoutPeriods, setBlackoutPeriods] = useState<any[]>([])
  const [unavailableMessage, setUnavailableMessage] = useState("")

  const [newDate, setNewDate] = useState("")
  const [newStartTime, setNewStartTime] = useState("")
  const [newEndTime, setNewEndTime] = useState("")

  useEffect(() => {
    trainerService
      .getSchedule()
      .then((data) => setSessions(data))
      .catch(() => toast.error("حدث خطأ أثناء جلب الجدول"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (isManageOpen && selectedSession?.roomId) {
      trainerService.getHallAvailability(selectedSession.roomId)
        .then((data) => {
          setBlackoutPeriods(data.availability?.blackoutPeriods || [])
        })
        .catch((e) => console.error("Failed to fetch hall availability", e))
    } else {
      setBlackoutPeriods([])
      setUnavailableMessage("")
    }
  }, [isManageOpen, selectedSession?.roomId])

  const getBlackoutPeriodForDate = useCallback((dateKey: string) => {
    const dDate = new Date(dateKey)
    dDate.setHours(12, 0, 0, 0)
    return blackoutPeriods.find((bp: any) => {
      const start = new Date(bp.startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(bp.endDate)
      end.setHours(23, 59, 59, 999)
      return dDate >= start && dDate <= end
    })
  }, [blackoutPeriods])

  const todayKey = formatDateKey(now)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const monthDate = new Date(todayStart.getFullYear(), todayStart.getMonth() + calendarOffset, 1)
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const monthLabel = monthDate.toLocaleDateString("ar-SA-u-nu-latn", { month: "long", year: "numeric" })
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()

  const calendarDays: Array<{ day: number; dateKey: string; isPast: boolean } | null> = []
  for (let i = 0; i < firstDay; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    calendarDays.push({ day: d, dateKey, isPast: new Date(year, month, d) < todayStart })
  }
  while (calendarDays.length % 7 !== 0) calendarDays.push(null)

  const getEffectiveStatus = useCallback(
    (session: Session) => {
      if (session.status === "cancelled") return "cancelled"
      if (new Date(session.endTime).getTime() < now.getTime()) return "completed"
      return "scheduled"
    },
    [now],
  )

  const getStatusMeta = useCallback(
    (session: Session) => {
      const effective = getEffectiveStatus(session)
      const isToday = formatDateKey(new Date(session.startTime)) === todayKey
      if (effective === "cancelled") return { label: "ملغي", className: "bg-red-100 text-red-700" }
      if (effective === "completed") return { label: "مكتمل", className: "bg-slate-100 text-slate-700" }
      if (isToday) return { label: "اليوم", className: "bg-violet-100 text-violet-700" }
      return { label: "قادم", className: "bg-blue-100 text-blue-700" }
    },
    [getEffectiveStatus, todayKey],
  )

  const nearestUpcomingSessionId = useMemo(() => {
    const upcoming = sessions
      .filter((s) => new Date(s.endTime).getTime() > now.getTime() && s.status !== "cancelled")
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    return upcoming[0]?.id || null
  }, [sessions, now])

  const filteredSessions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return sessions.filter((session) => {
      const startDateKey = formatDateKey(new Date(session.startTime))
      const endTs = new Date(session.endTime).getTime()
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "upcoming"
            ? endTs > now.getTime() && session.status !== "cancelled"
            : statusFilter === "today"
              ? startDateKey === todayKey
              : statusFilter === "direct"
                ? session.isDirectBooking === true
                : endTs <= now.getTime() && session.status !== "cancelled"

      const matchesType =
        typeFilter === "all"
          ? true
          : typeFilter === "online"
            ? session.type === "online"
            : session.type !== "online"

      const matchesSearch =
        !query ||
        session.title.toLowerCase().includes(query) ||
        session.courseTitle.toLowerCase().includes(query)

      return matchesStatus && matchesType && matchesSearch
    })
  }, [sessions, statusFilter, typeFilter, searchTerm, now, todayKey])

  const groupedByDate = useMemo(() => {
    const groups = filteredSessions.reduce(
      (acc, session) => {
        const key = formatDateKey(new Date(session.startTime))
        if (!acc[key]) acc[key] = []
        acc[key].push(session)
        return acc
      },
      {} as Record<string, Session[]>,
    )
    const keys = Object.keys(groups).sort()
    keys.forEach((key) => groups[key].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()))
    return { groups, keys }
  }, [filteredSessions])

  const stats = useMemo(() => {
    const completed = sessions.filter((s) => new Date(s.endTime).getTime() <= now.getTime() && s.status !== "cancelled").length
    const upcoming = sessions.filter((s) => new Date(s.endTime).getTime() > now.getTime() && s.status !== "cancelled").length
    const todayCount = sessions.filter((s) => formatDateKey(new Date(s.startTime)) === todayKey).length
    return {
      total: sessions.length,
      today: todayCount,
      upcoming,
      completed,
    }
  }, [sessions, now, todayKey])

  const filtersActive = statusFilter !== "upcoming" || typeFilter !== "all" || searchTerm.trim().length > 0

  const handleSelectDay = useCallback(
    async (dateKey: string) => {
      const blackout = getBlackoutPeriodForDate(dateKey)
      if (blackout) {
        setSelectedDate(dateKey)
        setSelectedSlot(null)
        setAvailableSlots([])
        setUnavailableMessage(`فترة غير متاحة: ${blackout.label || 'صيانة أو حجز مسبق'}`)
        return
      }

      setSelectedDate(dateKey)
      setSelectedSlot(null)
      setAvailableSlots([])
      setUnavailableMessage("")

      if (!selectedSession?.roomId) return
      setIsSlotsLoading(true)
      try {
        const data = await trainerService.getHallAvailability(selectedSession.roomId, dateKey)
        const [y, m, d] = dateKey.split("-").map(Number)
        const dayName = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][new Date(y, m - 1, d).getDay()]
        const availabilitySlots = Array.isArray(data.availability) ? data.availability : (data.availability?.slots ?? [])
        const allowedPeriods = availabilitySlots.filter((slot: any) => slot.day === dayName) || []
        const hasAvailability = availabilitySlots.length > 0
        const booked: any[] = data.bookedSessions || []

        const openSlots = TIME_SLOTS.filter((slot) => {
          const [start, end] = slot.split(" - ")
          if (hasAvailability) {
            const allowed = allowedPeriods.some(
              (period: any) => start >= period.startTime.substring(0, 5) && end <= period.endTime.substring(0, 5),
            )
            if (!allowed) return false
          }
          const slotStart = new Date(`${dateKey}T${start}:00`)
          const slotEnd = new Date(`${dateKey}T${end}:00`)
          return !booked.some((bookedSlot: any) => {
            if (bookedSlot.id === selectedSession.id) return false
            return slotStart < new Date(bookedSlot.endTime) && slotEnd > new Date(bookedSlot.startTime)
          })
        })
        setAvailableSlots(openSlots)
      } catch {
        toast.error("فشل جلب أوقات القاعة")
      } finally {
        setIsSlotsLoading(false)
      }
    },
    [selectedSession, getBlackoutPeriodForDate],
  )

  const handleOpenManage = (session: Session) => {
    setSelectedSession(session)
    setActionType("reschedule")
    setReason("")
    setSelectedDate(null)
    setSelectedSlot(null)
    setAvailableSlots([])
    setUnavailableMessage("")
    setIsManageOpen(true)
    setCalendarOffset(0)
    setUpdateAll(false)
    const startDate = new Date(session.startTime)
    setNewDate(formatDateKey(startDate))
    setNewStartTime(startDate.toTimeString().slice(0, 5))
    setNewEndTime(new Date(session.endTime).toTimeString().slice(0, 5))
    setIsManageOpen(true)
  }

  const handleConfirm = async () => {
    if (!selectedSession) return
    if (!reason.trim()) {
      toast.error("يرجى كتابة سبب التغيير/الإلغاء")
      return
    }

    if (actionType === "reschedule") {
      if (selectedSession.roomId) {
        if (!selectedDate || !selectedSlot) {
          toast.error("يرجى اختيار يوم ووقت متاح")
          return
        }
      } else if (!newDate || !newStartTime || !newEndTime) {
        toast.error("يرجى تحديد التاريخ والوقت")
        return
      }
    }

    setIsSaving(true)
    try {
      if (actionType === "cancel") {
        await trainerService.updateSession(selectedSession.id, { status: "CANCELLED", reason })
        setSessions((prev) => prev.map((s) => (s.id === selectedSession.id ? { ...s, status: "cancelled" } : s)))
        toast.error("تم إلغاء الجلسة")
      } else if (actionType === "update_link") {
        await trainerService.updateSession(selectedSession.id, {
          meetingLink: selectedSession.meetingLink ?? undefined,
          updateAll,
          reason,
        })
        if (updateAll) {
          setSessions((prev) =>
            prev.map((s) => (s.courseTitle === selectedSession.courseTitle ? { ...s, meetingLink: selectedSession.meetingLink } : s)),
          )
        } else {
          setSessions((prev) => prev.map((s) => (s.id === selectedSession.id ? { ...s, meetingLink: selectedSession.meetingLink } : s)))
        }
        toast.success("تم تحديث الرابط بنجاح")
      } else {
        let startTime: string
        let endTime: string
        if (selectedSession.roomId && selectedDate && selectedSlot) {
          const [start, end] = selectedSlot.split(" - ")
          startTime = new Date(`${selectedDate}T${start}:00`).toISOString()
          endTime = new Date(`${selectedDate}T${end}:00`).toISOString()
        } else {
          startTime = new Date(`${newDate}T${newStartTime}:00`).toISOString()
          endTime = new Date(`${newDate}T${newEndTime}:00`).toISOString()
        }

        await trainerService.updateSession(selectedSession.id, {
          startTime,
          endTime,
          meetingLink: selectedSession.meetingLink ?? undefined,
          updateAll,
          reason,
        })
        setSessions((prev) => prev.map((s) => (s.id === selectedSession.id ? { ...s, startTime, endTime, meetingLink: selectedSession.meetingLink } : s)))
        toast.success("تم تغيير موعد الجلسة بنجاح")
      }
      setIsManageOpen(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "حدث خطأ")
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-gray-500">جاري جلب الجدول...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 md:px-6 lg:px-8" dir="rtl">
      <section className="rounded-[6.5px] bg-gradient-to-l from-indigo-600 to-blue-500 p-6 text-white shadow-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-right">
            <h1 className="mb-1 text-2xl font-bold">جدولي</h1>
            <p className="text-sm text-blue-100">إدارة ومتابعة مواعيد دروسك</p>
          </div>
          <div className={`flex items-center gap-2 bg-white/10 px-3 py-2 text-sm ${radiusClass}`}>
            <CalendarIcon className="h-4 w-4 opacity-80" />
            <span className="font-medium">{filteredSessions.length} جلسة</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className={`border-[#E5E7EB] bg-white transition-shadow hover:shadow-sm ${radiusClass}`}>
          <CardContent className="flex items-center justify-between p-5 text-right">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">إجمالي الجلسات</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[6.5px] bg-blue-50 text-blue-600">
              <CalendarDays className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className={`border-[#E5E7EB] bg-white transition-shadow hover:shadow-sm ${radiusClass}`}>
          <CardContent className="flex items-center justify-between p-5 text-right">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">جلسات اليوم</p>
              <p className="text-2xl font-bold text-violet-700">{stats.today}</p>
            </div>
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[6.5px] bg-violet-50 text-violet-600">
              <Clock3 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className={`border-[#E5E7EB] bg-white transition-shadow hover:shadow-sm ${radiusClass}`}>
          <CardContent className="flex items-center justify-between p-5 text-right">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">الجلسات القادمة</p>
              <p className="text-2xl font-bold text-blue-700">{stats.upcoming}</p>
            </div>
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[6.5px] bg-indigo-50 text-indigo-600">
              <CalendarClock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className={`border-[#E5E7EB] bg-white transition-shadow hover:shadow-sm ${radiusClass}`}>
          <CardContent className="flex items-center justify-between p-5 text-right">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">المكتملة</p>
              <p className="text-2xl font-bold text-slate-700">{stats.completed}</p>
            </div>
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[6.5px] bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className={`border border-[#E5E7EB] bg-white p-3 ${radiusClass}`}>
        <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap" dir="rtl">
          <div className="relative w-full min-w-0 basis-full md:min-w-[360px] md:flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم الجلسة أو الدورة..."
              className={`h-10 w-full pr-9 text-right ${radiusClass}`}
            />
          </div>

          <div className="shrink-0">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
              <SelectTrigger className={`h-10 w-[170px] ${radiusClass}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                <SelectItem value="online">أونلاين</SelectItem>
                <SelectItem value="in_person">حضوري</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 md:flex-nowrap">
            {[
              { key: "all", label: "الكل" },
              { key: "upcoming", label: "القادمة" },
              { key: "today", label: "اليوم" },
              { key: "completed", label: "المنتهية" },
              { key: "direct", label: "الحجوزات المباشرة" },
            ].map((tab) => (
              <Button
                key={tab.key}
                type="button"
                size="sm"
                variant={statusFilter === tab.key ? "default" : "outline"}
                className={`h-10 ${statusFilter === tab.key ? `${radiusClass} bg-blue-600 hover:bg-blue-700` : radiusClass}`}
                onClick={() => setStatusFilter(tab.key as StatusFilter)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {filtersActive ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`${radiusClass} h-10 shrink-0`}
              onClick={() => {
                setStatusFilter("upcoming")
                setTypeFilter("all")
                setSearchTerm("")
              }}
            >
              <Filter className="ml-1 h-4 w-4" />
              إعادة ضبط
            </Button>
          ) : null}
        </div>
      </section>

      {filteredSessions.length === 0 ? (
        <div className={`border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center ${radiusClass}`}>
          <CalendarIcon className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-semibold text-slate-900">لا توجد جلسات مطابقة للفلتر</h3>
          <p className="text-slate-500">جرّب تغيير الفلتر لعرض نتائج أكثر</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByDate.keys.map((dateStr) => (
            <section key={dateStr} className="space-y-3">
              <h3 className="flex items-center justify-start gap-2 text-lg font-semibold text-slate-900">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                {formatDate(new Date(`${dateStr}T00:00:00`), { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </h3>

              <div className="space-y-3">
                {groupedByDate.groups[dateStr].map((session) => {
                  const status = getStatusMeta(session)
                  const isNearest = session.id === nearestUpcomingSessionId
                  const isActive = status.label === "قادم" || status.label === "اليوم"

                  return (
                    <Card
                      key={session.id}
                      className={`border-[#E5E7EB] bg-white transition-shadow hover:shadow-sm ${radiusClass} ${isNearest ? "border-blue-300 bg-blue-50/30" : ""
                        }`}
                    >
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[140px_1fr_220px] lg:items-center">
                          <div className={`border p-3 text-center ${radiusClass} ${isNearest ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                            <p className="text-base font-bold">{formatTime(new Date(session.startTime))}</p>
                            <p className="text-xs text-slate-500">إلى</p>
                            <p className="text-base font-bold">{formatTime(new Date(session.endTime))}</p>
                          </div>

                          <div className="space-y-2 text-right">
                            <div className="flex flex-wrap items-center justify-start gap-2">
                              <h4 className="text-lg font-bold text-slate-900">{session.title}</h4>
                              <Badge className={`${radiusClass} ${status.className}`}>{status.label}</Badge>
                              {isNearest ? <Badge className={`${radiusClass} bg-blue-600 text-white`}>الجلسة القادمة</Badge> : null}
                              {session.isDirectBooking ? <Badge className={`${radiusClass} bg-orange-100 text-orange-700`}>حجز مباشر</Badge> : null}
                            </div>
                            <p className="text-sm text-slate-600">{session.courseTitle}</p>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                {session.type === "online" ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                                {session.type === "online" ? "أونلاين" : "حضوري"}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {session.enrolledStudents} طالب
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className={`flex items-center justify-center gap-2 border bg-slate-50 px-3 py-2 text-sm text-slate-600 ${radiusClass}`}>
                              {session.type === "online" ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                              <span className="truncate">{normalizeLocationLabel(session.location)}</span>
                            </div>
                            {isActive ? (
                              <>
                                {session.type === "online" && session.meetingLink ? (
                                  <Button asChild className={`h-9 w-full ${radiusClass}`}>
                                    <a href={session.meetingLink} target="_blank" rel="noopener noreferrer">
                                      بدء الجلسة
                                    </a>
                                  </Button>
                                ) : null}
                                <Button
                                  variant="outline"
                                  className={`h-9 w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 ${radiusClass}`}
                                  onClick={() => handleOpenManage(session)}
                                >
                                  <Settings className="ml-2 h-4 w-4" />
                                  إدارة الجلسة
                                </Button>
                              </>
                            ) : status.label === "مكتمل" ? (
                              <div className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-slate-600">
                                <CheckCircle className="h-4 w-4" />
                                تم الانتهاء
                              </div>
                            ) : (
                              <div className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-red-600">
                                <XCircle className="h-4 w-4" />
                                ملغي
                              </div>
                            )}
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

      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className={`max-h-[90vh] overflow-y-auto sm:max-w-[600px] [&>button]:hidden ${radiusClass}`}>
          <DialogHeader className="w-full text-right sm:text-right">
            <DialogTitle className="w-full text-right">تعديل موعد الجلسة</DialogTitle>
            <DialogDescription className="w-full text-right">
              {selectedSession?.title} - {selectedSession?.courseTitle}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <RadioGroup value={actionType} onValueChange={(v) => setActionType(v as any)} className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <div>
                <RadioGroupItem value="reschedule" id="r-reschedule" className="peer sr-only" />
                <Label htmlFor="r-reschedule" className={`flex h-full cursor-pointer flex-col items-center justify-between border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:text-blue-600 ${radiusClass}`}>
                  <Clock className="mb-3 h-6 w-6" />
                  تغيير الموعد
                </Label>
              </div>
              {(selectedSession?.type === "online" || selectedSession?.type === "hybrid") && (
                <div>
                  <RadioGroupItem value="update_link" id="r-link" className="peer sr-only" />
                  <Label htmlFor="r-link" className={`flex h-full cursor-pointer flex-col items-center justify-between border-2 border-muted bg-popover p-4 text-center hover:bg-blue-50 hover:text-blue-900 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:text-blue-600 ${radiusClass}`}>
                    <Globe className="mb-3 h-6 w-6" />
                    تحديث الرابط
                  </Label>
                </div>
              )}
              <div>
                <RadioGroupItem value="cancel" id="r-cancel" className="peer sr-only" />
                <Label htmlFor="r-cancel" className={`flex h-full cursor-pointer flex-col items-center justify-between border-2 border-muted bg-popover p-4 hover:bg-red-50 hover:text-red-900 peer-data-[state=checked]:border-red-600 peer-data-[state=checked]:text-red-600 ${radiusClass}`}>
                  <AlertTriangle className="mb-3 h-6 w-6" />
                  إلغاء الجلسة
                </Label>
              </div>
            </RadioGroup>

            {actionType === "update_link" && (
              <div className={`space-y-4 border border-blue-100 bg-blue-50/50 p-4 ${radiusClass}`}>
                <div className="grid gap-2">
                  <Label>رابط الاجتماع الجديد</Label>
                  <div className="relative">
                    <Video className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="https://..."
                      value={selectedSession?.meetingLink || ""}
                      onChange={(e) => setSelectedSession((session) => (session ? { ...session, meetingLink: e.target.value } : null))}
                      className={`bg-white pl-10 ${radiusClass}`}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="checkbox"
                    id="manage-update-all"
                    checked={updateAll}
                    onChange={(e) => setUpdateAll(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="manage-update-all" className="cursor-pointer text-sm font-medium leading-none">
                    تطبيق على جميع جلسات هذه الدورة
                  </Label>
                </div>
              </div>
            )}

            {actionType === "reschedule" &&
              (selectedSession?.roomId ? (
                <div className={`space-y-4 border border-blue-100 bg-blue-50/50 p-4 ${radiusClass}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setCalendarOffset((value) => Math.max(0, value - 1))} disabled={calendarOffset === 0}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-semibold">{monthLabel}</span>
                    <Button variant="ghost" size="sm" onClick={() => setCalendarOffset((value) => Math.min(5, value + 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mb-1 grid grid-cols-7 text-center text-xs text-gray-500">
                    {WEEK_DAYS.map((day) => (
                      <div key={day}>{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, idx) => {
                      if (!day) return <div key={idx} />
                      const selected = selectedDate === day.dateKey
                      const blackout = getBlackoutPeriodForDate(day.dateKey)
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={day.isPast}
                          onClick={() => handleSelectDay(day.dateKey)}
                          className={`h-9 text-sm transition-all ${radiusClass} ${selected
                              ? "bg-blue-600 text-white"
                              : day.isPast
                                ? "bg-gray-100 text-gray-300"
                                : blackout
                                  ? "bg-red-50 text-red-500 border-red-200 border hover:bg-red-100"
                                  : "border bg-white hover:bg-blue-50"
                            }`}
                        >
                          {day.day}
                        </button>
                      )
                    })}
                  </div>
                  {selectedDate && (
                    <div className="border-t pt-3">
                      <h4 className="mb-2 text-sm font-semibold">الأوقات المتاحة</h4>
                      {isSlotsLoading ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        </div>
                      ) : unavailableMessage ? (
                        <p className="py-4 text-center text-sm font-medium text-red-500">{unavailableMessage}</p>
                      ) : availableSlots.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={`border p-2 text-sm transition-colors ${radiusClass} ${selectedSlot === slot ? "border-blue-600 bg-blue-600 text-white" : "bg-white hover:border-blue-300 hover:bg-blue-50"
                                }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="py-4 text-center text-sm text-gray-500">لا يوجد أوقات متاحة في هذا اليوم</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className={`space-y-4 border border-blue-100 bg-blue-50/50 p-4 ${radiusClass}`}>
                  <div className="grid gap-2">
                    <Label>التاريخ الجديد</Label>
                    <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className={`bg-white ${radiusClass}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>وقت البدء</Label>
                      <Input type="time" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} className={`bg-white ${radiusClass}`} />
                    </div>
                    <div className="grid gap-2">
                      <Label>وقت النهاية</Label>
                      <Input type="time" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} className={`bg-white ${radiusClass}`} />
                    </div>
                  </div>
                </div>
              ))}

            {actionType === "cancel" && (
              <div className={`flex gap-3 border border-red-200 bg-red-50 p-4 ${radiusClass}`}>
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <h4 className="text-sm font-bold text-red-900">تحذير هام</h4>
                  <p className="mt-1 text-sm text-red-700">سيتم إشعار الطلاب بإلغاء الجلسة، وهذا الإجراء لا يمكن التراجع عنه.</p>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>سبب التغيير/الإلغاء (إجباري)</Label>
              <Textarea
                placeholder="مثال: ظرف طارئ أو تعديل تنظيمي..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={radiusClass}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className={radiusClass} onClick={() => setIsManageOpen(false)}>
              إغلاق
            </Button>
            <Button
              className={`${radiusClass} ${actionType === "cancel" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
              onClick={handleConfirm}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {actionType === "reschedule" ? "تأكيد تغيير الموعد" : actionType === "update_link" ? "تأكيد تحديث الرابط" : "تأكيد إلغاء الجلسة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}







