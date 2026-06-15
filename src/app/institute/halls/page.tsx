"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useEffect, useMemo, useRef, useState } from "react"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, X, Loader2, ChevronLeft, ChevronRight, Building2, ClipboardList, Clock3, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

import InstituteRoomBookings from "@/app/institute/room-bookings/page"
import { instituteService } from "@/lib/institute-service"
import { getFileUrl } from "@/lib/utils"

interface BlackoutPeriod {
  id: string
  label: string
  startDate: string // "YYYY-MM-DD"
  endDate: string   // "YYYY-MM-DD"
}

interface HallAvailability {
  slots: { day: string; startTime: string; endTime: string; isUsed?: boolean }[]
  blackoutPeriods: BlackoutPeriod[]
}

interface Hall {
  id: string
  name: string
  capacity: number
  location: string | null
  locationUrl: string | null
  type: string
  hourlyRate: number | string
  description: string | null
  image: string | null
  features: string[]
  availability: HallAvailability
}

// ── Blackout Calendar ─────────────────────────────────────
const ARABIC_DAYS = ["أح", "إث", "ثل", "أر", "خم", "جم", "سب"]
const ARABIC_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"]

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isInBlackout(dateStr: string, periods: BlackoutPeriod[]) {
  return periods.some(p => dateStr >= p.startDate && dateStr <= p.endDate)
}

function HallBlackoutCalendar({
  blackoutPeriods,
  bookedDates = [],
  onChange,
}: {
  blackoutPeriods: BlackoutPeriod[]
  bookedDates?: string[]
  onChange: (periods: BlackoutPeriod[]) => void
}) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selStart, setSelStart] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [labelDialogOpen, setLabelDialogOpen] = useState(false)
  const [pendingRange, setPendingRange] = useState<{ start: string; end: string } | null>(null)
  const [labelInput, setLabelInput] = useState("")
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null)

  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = firstDay.getDay() // 0=Sun

  const cells: (string | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1)
      return toDateStr(d)
    })
  ]

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const handleDayClick = (d: string) => {
    const existingPeriod = blackoutPeriods.find(p => d >= p.startDate && d <= p.endDate);
    if (existingPeriod) {
      setPendingRange({ start: existingPeriod.startDate, end: existingPeriod.endDate });
      setLabelInput(existingPeriod.label);
      setEditingPeriodId(existingPeriod.id);
      setLabelDialogOpen(true);
      return;
    }

    if (bookedDates.includes(d)) {
      toast.error("هذا اليوم يحتوي على حجز مسبق، لا يمكن إضافة فترة عدم الإتاحة");
      return;
    }

    if (!selStart) {
      setSelStart(d)
    } else {
      const start = selStart < d ? selStart : d
      const end = selStart < d ? d : selStart
      
      let hasBooked = false;
      const curr = new Date(start + 'T12:00:00Z');
      const endD = new Date(end + 'T12:00:00Z');
      while (curr <= endD) {
          const dateStr = curr.toISOString().substring(0, 10);
          if (bookedDates.includes(dateStr)) {
              hasBooked = true;
              break;
          }
          curr.setUTCDate(curr.getUTCDate() + 1);
      }

      if (hasBooked) {
          toast.error("الفترة المحددة تشمل أياماً محجوزة مسبقاً");
          setSelStart(null)
          setHovered(null)
          return;
      }

      const overlaps = blackoutPeriods.some(p => start <= p.endDate && end >= p.startDate);
      if (overlaps) {
        setSelStart(null)
        setHovered(null)
        return;
      }
      setSelStart(null)
      setHovered(null)
      setPendingRange({ start, end })
      setLabelInput("")
      setEditingPeriodId(null)
      setLabelDialogOpen(true)
    }
  }

  const confirmAdd = () => {
    if (!pendingRange) return
    let finalStart = pendingRange.start;
    let finalEnd = pendingRange.end;
    if (finalStart > finalEnd) {
      const temp = finalStart;
      finalStart = finalEnd;
      finalEnd = temp;
    }

    if (editingPeriodId) {
      onChange(blackoutPeriods.map(p =>
        p.id === editingPeriodId ? { ...p, label: labelInput.trim() || "فترة عدم الإتاحة", startDate: finalStart, endDate: finalEnd } : p
      ))
    } else {
      const newP: BlackoutPeriod = {
        id: `bp-${Date.now()}`,
        label: labelInput.trim() || "فترة عدم الإتاحة",
        startDate: finalStart,
        endDate: finalEnd,
      }
      onChange([...blackoutPeriods, newP])
    }
    setLabelDialogOpen(false)
    setPendingRange(null)
    setEditingPeriodId(null)
  }

  const removeBlackout = (id: string) => {
    onChange(blackoutPeriods.filter(p => p.id !== id))
  }

  const isInSelection = (d: string) => {
    if (!selStart) return false
    const h = hovered ?? selStart
    const lo = selStart < h ? selStart : h
    const hi = selStart < h ? h : selStart
    return d >= lo && d <= hi
  }

  const formatDate = (s: string) => {
    const d = new Date(s + 'T12:00:00')
    return `${d.getDate()} ${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`
  }

  return (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <button onClick={nextMonth} className="p-1 rounded hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm font-semibold">{ARABIC_MONTHS[month]} {year}</span>
        <button onClick={prevMonth} className="p-1 rounded hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 text-center text-xs text-slate-400 mb-1">
        {ARABIC_DAYS.map(d => <span key={d}>{d}</span>)}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const isBlackout = isInBlackout(d, blackoutPeriods)
          const inSel = isInSelection(d)
          const isBooked = bookedDates.includes(d)
          return (
            <button
              key={d}
              onClick={() => handleDayClick(d)}
              onMouseEnter={() => selStart && setHovered(d)}
              onMouseLeave={() => setHovered(null)}
              title={isBooked ? "يوجد حجز في هذا اليوم" : undefined}
              className={[
                "h-8 w-full rounded text-xs font-medium transition-colors relative flex items-center justify-center",
                isBlackout ? "bg-red-100 text-red-700 hover:bg-red-200" :
                inSel ? "bg-blue-100 text-blue-700" :
                "hover:bg-slate-100 text-slate-700",
                isBooked && !isBlackout ? "ring-1 ring-amber-400 bg-amber-50" : ""
              ].join(" ")}
            >
              <span className="z-10 relative">{parseInt(d.substring(8))}</span>
              {isBooked && (
                <div className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
              )}
            </button>
          )
        })}
      </div>

      {/* Hint */}
      <p className="text-xs text-slate-400 text-center">
        {selStart ? "الآن انقر على يوم النهاية" : "انقر على يوم البداية لتحديد فترة"}
      </p>

      {/* Blackout list */}
      {blackoutPeriods.length > 0 && (
        <div className="space-y-2 mt-2">
          {blackoutPeriods.map(p => (
            <div key={p.id} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
              <div>
                <span className="text-sm font-medium text-red-700">{p.label}</span>
                <span className="text-xs text-red-400 mr-2">{formatDate(p.startDate)} - {formatDate(p.endDate)}</span>
              </div>
              <button onClick={() => removeBlackout(p.id)} className="text-red-400 hover:text-red-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Label dialog */}
      <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تسمية فترة عدم الإتاحة</DialogTitle>
            {pendingRange && (
              <DialogDescription>
                من {formatDate(pendingRange.start)} إلى {formatDate(pendingRange.end)}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Label>التسمية (اختياري)</Label>
            <Input
              dir="rtl"
              placeholder="مثال: شهر رمضان"
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmAdd()}
            />
            {editingPeriodId && pendingRange && (
               <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                      <Label className="text-xs text-slate-500 mb-1 block">من تاريخ</Label>
                      <Input 
                          type="date" 
                          value={pendingRange.start} 
                          onChange={e => setPendingRange({...pendingRange, start: e.target.value})} 
                      />
                  </div>
                  <div>
                      <Label className="text-xs text-slate-500 mb-1 block">إلى تاريخ</Label>
                      <Input 
                          type="date" 
                          value={pendingRange.end} 
                          onChange={e => setPendingRange({...pendingRange, end: e.target.value})} 
                      />
                  </div>
               </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setLabelDialogOpen(false); setPendingRange(null); setEditingPeriodId(null); }}>إلغاء</Button>
            {editingPeriodId && (
               <Button variant="destructive" className="ml-auto" onClick={() => { removeBlackout(editingPeriodId); setLabelDialogOpen(false); setPendingRange(null); setEditingPeriodId(null); }}>
                   حذف
               </Button>
            )}
            <Button onClick={confirmAdd}>حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function InstituteHallsPage() {
  const [halls, setHalls] = useState<Hall[]>([])
  const [loading, setLoading] = useState(true)

  const [editingHall, setEditingHall] = useState<Hall | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [activeTab, setActiveTab] = useState<"halls" | "bookings">("halls")
  const [isImageDragging, setIsImageDragging] = useState(false)
  const [imagePreviewUrl, setImagePreviewUrl] = useState("")
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const hallImageInputRef = useRef<HTMLInputElement | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0)
  const [bookingsStats, setBookingsStats] = useState({ total: 0, pending: 0, approved: 0 })
  const [hallToDeleteId, setHallToDeleteId] = useState<string | null>(null)
  const [impactData, setImpactData] = useState<{ affectedCourses: number, affectedBookings: number } | null>(null)

  const loadHalls = async () => {
    setLoading(true)
    try {
      const data = await instituteService.getHalls()
      // Map backend fields to frontend interface
      const mappedHalls = data.map((room: any) => {
        const rawAvail = room.availability
        const availability: HallAvailability = Array.isArray(rawAvail)
          ? { slots: rawAvail, blackoutPeriods: [] }
          : rawAvail && typeof rawAvail === 'object'
            ? { slots: rawAvail.slots ?? [], blackoutPeriods: rawAvail.blackoutPeriods ?? [] }
            : { slots: [], blackoutPeriods: [] }
        return {
          id: room.id,
          name: room.name,
          capacity: room.capacity,
          location: room.location,
          locationUrl: room.locationUrl,
          type: room.type,
          hourlyRate: room.pricePerHour,
          description: room.description,
          image: room.image,
          features: room.facilities || [],
          availability,
          bookedDates: room.bookedDates || []
        }
      })
      setHalls(mappedHalls)
    } catch {
      toast.error("فشل تحميل بيانات القاعات")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadHalls() }, [])

  useEffect(() => {
    let cancelled = false
    const loadPendingBookingsCount = async () => {
      try {
        const bookings = await instituteService.getRoomBookings()
        if (cancelled) return
        const normalizedBookings = Array.isArray(bookings) ? bookings : []
        const pending = normalizedBookings.filter((b: any) => {
          const status = String(b?.status || "").toUpperCase()
          return ["PENDING", "PENDING_APPROVAL", "PENDING_REVIEW", "PENDING_PAYMENT"].includes(status)
        }).length
        const approved = normalizedBookings.filter((b: any) => {
          const status = String(b?.status || "").toUpperCase()
          return ["APPROVED", "ACCEPTED"].includes(status)
        }).length
        setPendingBookingsCount(pending)
        setBookingsStats({ total: normalizedBookings.length, pending, approved })
      } catch {
        if (!cancelled) {
          setPendingBookingsCount(0)
          setBookingsStats({ total: 0, pending: 0, approved: 0 })
        }
      }
    }

    loadPendingBookingsCount()
    const interval = setInterval(loadPendingBookingsCount, 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const hallsStats = useMemo(
    () => ({
      totalHalls: halls.length,
      totalBookings: bookingsStats.total,
      pendingBookings: bookingsStats.pending,
      approvedBookings: bookingsStats.approved,
    }),
    [halls.length, bookingsStats]
  )

  const createEmptyHall = (): Hall => ({
    id: "",
    name: "",
    type: "قاعة محاضرات",
    location: "",
    locationUrl: "",
    capacity: 0,
    hourlyRate: 0,
    image: "",
    features: [],
    availability: { slots: [], blackoutPeriods: [] },
    description: ""
  })

  const isValidMapsUrl = (value: string | null) => {
    if (!value) return true
    try {
      const url = new URL(value)
      if (url.protocol !== "https:") return false
      const host = url.hostname.toLowerCase()
      if (host === "maps.google.com" || host === "maps.app.goo.gl") return true
      if ((host === "google.com" || host === "www.google.com") && url.pathname.startsWith("/maps")) {
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const handleOpenEdit = (hallId: string) => {
    const hall = halls.find((item) => item.id === hallId)
    if (!hall) return
    setIsCreating(false)
    setEditingHall({ ...hall })
    setSelectedImageFile(null)
    setIsEditOpen(true)
  }

  const handleOpenCreate = () => {
    setIsCreating(true)
    setEditingHall(createEmptyHall())
    setSelectedImageFile(null)
    setIsEditOpen(true)
  }

  useEffect(() => {
    const url = editingHall?.image ?? ""
    setImagePreviewUrl(getFileUrl(url) ?? "")
  }, [editingHall?.image])

  const handleSaveEdit = async () => {
    if (!editingHall) return
    if (editingHall.locationUrl && !isValidMapsUrl(editingHall.locationUrl)) {
      toast.error("رابط الموقع غير صالح. استخدم رابط Google Maps يبدأ بـ https://")
      return
    }

    if (!isCreating) {
      setActionLoading(true)
      try {
        const impact = await instituteService.validateHallUpdate(editingHall.id, { availability: JSON.stringify(editingHall.availability) });
        if (impact.affectedCourses > 0 || impact.affectedBookings > 0) {
          setImpactData(impact);
          setActionLoading(false);
          return;
        }
      } catch (e: any) {
        toast.error("فشل التحقق من التأثيرات");
        setActionLoading(false);
        return;
      }
      setActionLoading(false);
    }
    
    executeSave();
  }

  const executeSave = async () => {
    if (!editingHall) return
    setActionLoading(true)
    try {
      const payload = new FormData()
      payload.append("name", editingHall.name)
      payload.append("capacity", String(editingHall.capacity))
      if (editingHall.location) payload.append("location", editingHall.location)
      if (editingHall.locationUrl) payload.append("locationUrl", editingHall.locationUrl)
      payload.append("type", editingHall.type)
      if (editingHall.description) payload.append("description", editingHall.description)
      payload.append("pricePerHour", String(editingHall.hourlyRate))
      payload.append("facilities", JSON.stringify(editingHall.features))
      payload.append("availability", JSON.stringify(editingHall.availability))

      if (selectedImageFile) {
        payload.append("image", selectedImageFile)
      } else if (editingHall.image === "") {
        payload.append("image", "")
      }

      if (isCreating) {
        await instituteService.addHall(payload as any)
        toast.success("تم إضافة القاعة بنجاح")
      } else {
        await instituteService.updateHall(editingHall.id, payload as any)
        toast.success("تم تحديث بيانات القاعة بنجاح")
      }
      setIsEditOpen(false)
      setIsCreating(false)
      loadHalls()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "حدث خطأ أثناء حفظ القاعة")
    } finally {
      setActionLoading(false)
    }
  }

  const confirmDeleteHall = async () => {
    if (!hallToDeleteId) return
    try {
      setActionLoading(true)
      await instituteService.removeHall(hallToDeleteId)
      toast.success("تم حذف القاعة بنجاح")
      setHalls(prev => prev.filter(h => h.id !== hallToDeleteId))
      setIsEditOpen(false)
      setHallToDeleteId(null)
    } catch {
      toast.error("فشل حذف القاعة")
    } finally {
      setActionLoading(false)
    }
  }

  const handleHallImageFile = (file?: File | null) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("الملف المحدد ليس صورة. يرجى اختيار صورة مناسبة.")
      return
    }
    const previewUrl = URL.createObjectURL(file)
    setSelectedImageFile(file)
    setEditingHall((prev) => (prev ? { ...prev, image: previewUrl } : prev))
  }

  const editingForm = editingHall

  return (
    <div className="space-y-6" dir="rtl">
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-right">
          <h1 className="text-3xl font-bold text-gray-900">إدارة القاعات</h1>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "halls" && (
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة قاعة
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[6.5px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-row-reverse items-center justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[6.5px] bg-blue-50 text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">إجمالي القاعات</p>
              <p className="text-2xl font-bold text-blue-600">{hallsStats.totalHalls}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[6.5px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-row-reverse items-center justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[6.5px] bg-indigo-50 text-indigo-600">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">طلبات الحجز</p>
              <p className="text-2xl font-bold text-indigo-600">{hallsStats.totalBookings}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[6.5px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-row-reverse items-center justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[6.5px] bg-orange-50 text-orange-600">
              <Clock3 className="h-5 w-5" />
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">قيد المراجعة</p>
              <p className="text-2xl font-bold text-orange-600">{hallsStats.pendingBookings}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[6.5px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-row-reverse items-center justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[6.5px] bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">الحجوزات المقبولة</p>
              <p className="text-2xl font-bold text-emerald-600">{hallsStats.approvedBookings}</p>
            </div>
          </div>
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "halls" | "bookings")} dir="rtl" className="w-full">
        <TabsList className="grid h-11 w-full grid-cols-2 rounded-[6.5px] bg-slate-100 p-1">
          <TabsTrigger value="halls" className="h-full rounded-[6.5px] text-sm text-slate-700 data-[state=active]:border data-[state=active]:border-blue-200 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
            القاعات
          </TabsTrigger>
          <TabsTrigger value="bookings" className="h-full rounded-[6.5px] text-sm text-slate-700 data-[state=active]:border data-[state=active]:border-blue-200 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
            <span className="inline-flex items-center justify-center gap-2">
              <span>طلبات الحجز</span>
              {pendingBookingsCount > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-5 text-white">
                  {pendingBookingsCount > 99 ? "99+" : pendingBookingsCount}
                </span>
              )}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      </div>

      {activeTab === "halls" && (
        loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : halls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <p className="mb-4">لم يتم إضافة قاعات حتى الآن</p>
            <Button onClick={handleOpenCreate} variant="outline">إضافة أول قاعة</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {halls.map((hall) => (
              <div
                key={hall.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md hover:ring-blue-200 dark:bg-slate-900 dark:ring-slate-800"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  {hall.image ? (
                    <img
                      src={getFileUrl(hall.image)}
                      alt={hall.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      لا توجد صورة
                    </div>
                  )}
                  <div className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm">
                    {hall.type}
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white line-clamp-1">
                    {hall.name}
                  </h3>

                  {hall.location && (
                    <p className="mb-4 text-sm text-slate-500 line-clamp-1">
                      {hall.location}
                    </p>
                  )}

                  <div className="mb-6 grid flex-1 grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-xs">السعة</span>
                      <span className="font-medium text-slate-700">{hall.capacity} شخص</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-xs">السعر / ساعة</span>
                      <span className="font-medium text-slate-700">{hall.hourlyRate} ريال</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleOpenEdit(hall.id)}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-blue-600 hover:text-blue-700 border-none shadow-none"
                    variant="outline"
                  >
                    تعديل القاعة
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
      {activeTab === "bookings" && <InstituteRoomBookings />}

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open)
          if (!open) {
            setEditingHall(null)
            setIsCreating(false)
            setIsImageDragging(false)
            setImagePreviewUrl("")
          }
        }}
      >
        <DialogContent
          dir="rtl"
          overlayClassName="bg-black/35"
          className="w-[min(980px,92vw)] max-w-[980px] max-h-[82vh] overflow-hidden rounded-[6.5px] p-0 [&>button[data-dialog-close='default']]:hidden"
        >
          <div className="flex h-full max-h-[82vh] flex-col">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-4">
              <DialogHeader className="space-y-1 text-right">
                <DialogTitle>{isCreating ? "إضافة قاعة جديدة" : "تعديل بيانات القاعة"}</DialogTitle>
                <DialogDescription>
                  {isCreating ? "أدخل البيانات الأساسية للقاعة الجديدة" : "حدث البيانات الأساسية للقاعة المختارة"}
                </DialogDescription>
              </DialogHeader>
              <DialogClose className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30">
                <X className="h-4 w-4" />
                <span className="sr-only">إغلاق</span>
              </DialogClose>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {editingForm && (
                <div className="grid gap-6 lg:grid-cols-[420px_1fr] [direction:ltr]">
                  <div className="space-y-3 lg:items-start">
                    <Label className="text-sm font-semibold">صورة القاعة</Label>
                    <div
                      className={`relative h-[188px] w-full max-w-[420px] overflow-hidden rounded-[6.5px] border-2 border-dashed bg-slate-50/60 transition-shadow md:h-[196px] ${isImageDragging ? "ring-2 ring-blue-500 ring-offset-2 border-blue-300" : "border-slate-200"
                        }`}
                      onDragOver={(event) => {
                        event.preventDefault()
                        setIsImageDragging(true)
                      }}
                      onDragLeave={() => setIsImageDragging(false)}
                      onDrop={(event) => {
                        event.preventDefault()
                        setIsImageDragging(false)
                        handleHallImageFile(event.dataTransfer.files?.[0])
                      }}
                      onClick={() => hallImageInputRef.current?.click()}
                    >
                      <input
                        ref={hallImageInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => {
                          handleHallImageFile(event.target.files?.[0])
                          event.currentTarget.value = ""
                        }}
                      />

                      {imagePreviewUrl ? (
                        <>
                          <img
                            src={imagePreviewUrl}
                            alt={editingForm.name || "صورة القاعة"}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                          <div className="absolute inset-x-3 bottom-3 flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="h-8 rounded-[6.5px] bg-white/95 hover:bg-white"
                              onClick={(event) => {
                                event.stopPropagation()
                                hallImageInputRef.current?.click()
                              }}
                            >
                              تغيير
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-[6.5px] bg-white/95 text-slate-700 hover:bg-white"
                              onClick={(event) => {
                                event.stopPropagation()
                                setEditingHall((prev) => (prev ? { ...prev, image: "" } : prev))
                                setImagePreviewUrl("")
                              }}
                            >
                              حذف
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                          <p className="text-sm font-semibold text-slate-700">اسحب الصورة هنا</p>
                          <span className="text-xs text-slate-400">أو</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-[6.5px] bg-white/90"
                            onClick={(event) => {
                              event.stopPropagation()
                              hallImageInputRef.current?.click()
                            }}
                          >
                            اختيار من الجهاز
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 text-right" dir="rtl">
                    <div className="grid gap-2">
                      <Label htmlFor="hall-name">اسم القاعة</Label>
                      <Input
                        id="hall-name"
                        dir="rtl"
                        className="h-11 rounded-[6.5px] text-right"
                        value={editingForm.name}
                        onChange={(event) =>
                          setEditingHall((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                        }
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="hall-capacity">السعة</Label>
                        <Input
                          id="hall-capacity"
                          type="number"
                          dir="rtl"
                          className="h-11 rounded-[6.5px] text-right"
                          value={editingForm.capacity || ""}
                          onChange={(event) =>
                            setEditingHall((prev) =>
                              prev ? { ...prev, capacity: Number(event.target.value) } : prev
                            )
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="hall-rate">السعر بالساعة</Label>
                        <Input
                          id="hall-rate"
                          type="number"
                          dir="rtl"
                          className="h-11 rounded-[6.5px] text-right"
                          value={editingForm.hourlyRate || ""}
                          onChange={(event) =>
                            setEditingHall((prev) =>
                              prev ? { ...prev, hourlyRate: Number(event.target.value) } : prev
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <Label className="text-sm font-semibold">الموقع</Label>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="hall-location-text">نص الموقع</Label>
                          <Input
                            id="hall-location-text"
                            dir="rtl"
                            className="h-11 rounded-[6.5px] text-right"
                            placeholder="مثال: صنعاء - التحرير - شارع الزبيري"
                            value={editingForm.location || ""}
                            onChange={(event) =>
                              setEditingHall((prev) =>
                                prev ? { ...prev, location: event.target.value } : prev
                              )
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="hall-location-url">رابط الموقع (Google Maps)</Label>
                          <Input
                            id="hall-location-url"
                            type="url"
                            dir="ltr"
                            className="h-11 rounded-[6.5px] text-right"
                            placeholder="https://maps.app.goo.gl/..."
                            value={editingForm.locationUrl || ""}
                            onChange={(event) =>
                              setEditingHall((prev) =>
                                prev ? { ...prev, locationUrl: event.target.value } : prev
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="hall-type">نوع القاعة</Label>
                      <Select
                        value={editingForm.type}
                        onValueChange={(value) =>
                          setEditingHall((prev) =>
                            prev ? { ...prev, type: value } : prev
                          )
                        }
                      >
                        <SelectTrigger id="hall-type" className="h-11 rounded-[6.5px] text-right">
                          <SelectValue placeholder="اختر النوع" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="قاعة محاضرات">قاعة محاضرات</SelectItem>
                          <SelectItem value="قاعة اجتماعات">قاعة اجتماعات</SelectItem>
                          <SelectItem value="معمل">معمل</SelectItem>
                          <SelectItem value="ورشة عمل">ورشة عمل</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="hall-description">وصف القاعة</Label>
                      <Textarea
                        id="hall-description"
                        dir="rtl"
                        className="min-h-[96px] rounded-[6.5px] text-right"
                        rows={4}
                        value={editingForm.description || ""}
                        onChange={(event) =>
                          setEditingHall((prev) =>
                            prev ? { ...prev, description: event.target.value } : prev
                          )
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>المميزات</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {["wifi", "projector", "screen", "computers"].map((feature) => (
                          <label key={feature} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={editingForm.features.includes(feature)}
                              onCheckedChange={(checked) => {
                                setEditingHall((prev) => {
                                  if (!prev) return prev
                                  const next = checked
                                    ? [...prev.features, feature]
                                    : prev.features.filter((item) => item !== feature)
                                  return { ...prev, features: next }
                                })
                              }}
                            />
                            <span>
                              {feature === "wifi"
                                ? "WiFi"
                                : feature === "projector"
                                  ? "بروجكتر"
                                  : feature === "screen"
                                    ? "شاشة"
                                    : "أجهزة"}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* ── أوقات العمل الأسبوعية ── */}
                    <div className="grid gap-4 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">أوقات العمل المتاحة (أسبوعياً)</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingHall(prev => prev ? {
                            ...prev,
                            availability: {
                              ...prev.availability,
                              slots: [...prev.availability.slots, { day: "SUNDAY", startTime: "08:00", endTime: "16:00" }]
                            }
                          } : prev)}
                        >
                          <Plus className="h-4 w-4 ml-1" /> إضافة فترة
                        </Button>
                      </div>
                      {editingForm.availability.slots.length === 0 ? (
                        <p className="text-sm text-gray-500">لم يتم تحديد أوقات. سيتم اعتبار القاعة متاحة دائماً.</p>
                      ) : (
                        <div className="space-y-3">
                          {editingForm.availability.slots.map((period, index) => (
                            <div key={index} className="flex items-center gap-2">
                              {period.isUsed && (
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md border whitespace-nowrap">مستخدمة</span>
                              )}
                              <Select
                                disabled={period.isUsed}
                                value={period.day}
                                onValueChange={(val) => {
                                  setEditingHall(prev => {
                                    if (!prev) return prev;
                                    const newSlots = [...prev.availability.slots];
                                    newSlots[index] = { ...newSlots[index], day: val };
                                    return { ...prev, availability: { ...prev.availability, slots: newSlots } };
                                  });
                                }}
                              >
                                <SelectTrigger className="h-10 w-[130px] rounded-[6.5px] text-right" dir="rtl">
                                  <SelectValue placeholder="اليوم" />
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                  {[
                                    { value: "SUNDAY", label: "الأحد" },
                                    { value: "MONDAY", label: "الإثنين" },
                                    { value: "TUESDAY", label: "الثلاثاء" },
                                    { value: "WEDNESDAY", label: "الأربعاء" },
                                    { value: "THURSDAY", label: "الخميس" },
                                    { value: "FRIDAY", label: "الجمعة" },
                                    { value: "SATURDAY", label: "السبت" },
                                  ].map(d => (
                                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                type="time"
                                className="h-10 w-24 rounded-[6.5px] text-center disabled:opacity-50"
                                value={period.startTime}
                                onChange={(e) => {
                                  setEditingHall(prev => {
                                    if (!prev) return prev;
                                    const newSlots = [...prev.availability.slots];
                                    newSlots[index] = { ...newSlots[index], startTime: e.target.value };
                                    return { ...prev, availability: { ...prev.availability, slots: newSlots } };
                                  });
                                }}
                              />
                              <span className="text-gray-500">-</span>
                              <Input
                                type="time"
                                className="h-10 w-24 rounded-[6.5px] text-center"
                                value={period.endTime}
                                onChange={(e) => {
                                  setEditingHall(prev => {
                                    if (!prev) return prev;
                                    const newSlots = [...prev.availability.slots];
                                    newSlots[index] = { ...newSlots[index], endTime: e.target.value };
                                    return { ...prev, availability: { ...prev.availability, slots: newSlots } };
                                  });
                                }}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={period.isUsed}
                                className="h-10 w-10 shrink-0 rounded-[6.5px] text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                                onClick={() => {
                                  setEditingHall(prev => {
                                    if (!prev) return prev;
                                    const newSlots = [...prev.availability.slots];
                                    newSlots.splice(index, 1);
                                    return { ...prev, availability: { ...prev.availability, slots: newSlots } };
                                  });
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── فترات عدم الإتاحة (تقويم) ── */}
                    <div className="grid gap-4 border-t pt-4">
                      <Label className="text-sm font-semibold">فترات عدم الإتاحة</Label>
                      <p className="text-xs text-slate-400 -mt-2">حدد التواريخ التي تكون فيها القاعة غير متاحة (مثل الإجازات والمناسبات).</p>
                      <HallBlackoutCalendar
                        blackoutPeriods={editingForm.availability.blackoutPeriods}
                        bookedDates={(editingForm as any).bookedDates}
                        onChange={(periods) =>
                          setEditingHall(prev => prev ? {
                            ...prev,
                            availability: { ...prev.availability, blackoutPeriods: periods }
                          } : prev)
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 z-10 border-t border-slate-100 bg-white px-6 py-4">
              <div className="flex justify-between items-center w-full">
                {!isCreating && (
                  <Button variant="destructive" className="rounded-[6.5px]" onClick={() => setHallToDeleteId(editingForm!.id)}>
                    حذف القاعة
                  </Button>
                )}
                <div className="flex gap-2 mr-auto">
                  <Button variant="outline" className="rounded-[6.5px]" onClick={() => setIsEditOpen(false)} disabled={actionLoading}>
                    إلغاء
                  </Button>
                  <Button className="rounded-[6.5px]" onClick={handleSaveEdit} disabled={actionLoading || !editingForm?.name}>
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                    حفظ التغييرات
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!hallToDeleteId}
        onOpenChange={(open) => {
          if (!open && !actionLoading) setHallToDeleteId(null)
        }}
      >
        <DialogContent
          dir="rtl"
          className="max-w-md rounded-[6.5px] border border-slate-200 bg-white p-0 shadow-xl [&>[data-dialog-close=default]]:hidden"
        >
          <div className="p-5 text-right">
            <DialogHeader className="space-y-2 text-right">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 text-right">
                  <DialogTitle className="text-lg font-bold text-slate-900">حذف القاعة</DialogTitle>
                  <DialogDescription className="text-sm leading-6 text-slate-600">
                    هل أنت متأكد من حذف هذه القاعة؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع البيانات المتعلقة بها.
                  </DialogDescription>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6.5px] bg-red-50 text-red-600">
                  <X className="h-4 w-4" />
                </div>
              </div>
            </DialogHeader>

            <div className="mt-5 flex items-center justify-start gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-[6.5px] px-4"
                onClick={() => setHallToDeleteId(null)}
                disabled={actionLoading}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                className="h-9 rounded-[6.5px] bg-red-600 px-4 text-white hover:bg-red-700"
                onClick={confirmDeleteHall}
                disabled={actionLoading}
              >
                {actionLoading ? "جاري الحذف..." : "حذف القاعة"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!impactData} onOpenChange={(open) => { if (!open) setImpactData(null) }}>
        <DialogContent dir="rtl" className="max-w-md rounded-[6.5px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2 font-bold">
              تحذير: تعارض مع حجوزات أو دورات
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4 text-sm">
            <p className="text-slate-700 leading-relaxed">
              لا يمكن حفظ التعديلات على فترات الإتاحة لأن التعديل (تقليص أو حذف) يتعارض مع الكيانات التالية:
            </p>
            <ul className="list-disc list-inside space-y-1.5 font-semibold text-slate-800 bg-red-50 p-4 rounded-lg">
              {impactData?.affectedCourses ? <li>{impactData.affectedCourses} دورة نشطة/مستقبلية</li> : null}
              {impactData?.affectedBookings ? <li>{impactData.affectedBookings} حجز قاعة نشط/مستقبلي</li> : null}
            </ul>
            <p className="text-slate-500 text-xs leading-relaxed">
              يرجى مراجعة الفترات والتأكد من عدم تقليص أوقات مستخدمة حالياً. يمكنك إضافة فترات جديدة أو توسيع الفترات الحالية بحرية.
            </p>
          </div>
          <div className="flex justify-end pt-2 border-t">
            <Button onClick={() => setImpactData(null)} variant="outline" className="rounded-[6.5px]">تعديل الفترات</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


