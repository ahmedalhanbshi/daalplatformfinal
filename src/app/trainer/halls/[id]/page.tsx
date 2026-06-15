"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import React, { useCallback, useMemo, useRef, useState, ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, FileText, Globe, Loader2, Lock, Mail, MapPin, Monitor, Phone, Projector, UploadCloud, Users, Wifi, X, ImageOff, Landmark, Check, Clock, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react"
import { cn, formatDate, formatNumber, getFileUrl } from "@/lib/utils"
import { HallImage } from "@/components/halls/HallImage"
import { trainerService } from "@/lib/trainer-service"
import { useEffect } from "react"
import { usePlatform } from "@/contexts/platform-context"
import { toast } from "sonner"

// Local HallImage component removed in favor of shared component

const timeSlots = [
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
  "19:00 - 20:00"
]

const halls = [
  {
    id: "hall-1",
    name: "القاعة الرئيسية",
    type: "قاعة محاضرات",
    location: "الشرج، الشارع الأول",
    locationUrl: "https://maps.app.goo.gl/4mZb9Y6WgS7",
    capacity: 80,
    hourlyRate: 18000,
    image: "https://images.unsplash.com/photo-1760121788536-9797394e210e?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
    gallery: [
      "https://images.unsplash.com/photo-1760121788536-9797394e210e?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
      "https://images.unsplash.com/photo-1685955011121-1ef868d21c99?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000"
    ],
    features: ["wifi", "projector", "screen"],
    description: "قاعة واسعة للمحاضرات والفعاليات الكبرى مع تجهيزات عرض متكاملة."
  },
  {
    id: "hall-2",
    name: "قاعة الاجتماعات الذكية",
    type: "قاعة اجتماعات",
    location: "الشرج، الشارع الأول",
    locationUrl: "https://maps.app.goo.gl/4mZb9Y6WgS7",
    capacity: 18,
    hourlyRate: 12000,
    image: "https://images.unsplash.com/photo-1766802981801-4b4a9a1d8f1c?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
    gallery: [
      "https://images.unsplash.com/photo-1766802981801-4b4a9a1d8f1c?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
      "https://images.unsplash.com/photo-1685955011121-1ef868d21c99?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000"
    ],
    features: ["wifi", "screen"],
    description: "مساحة مريحة لاجتماعات الفرق مع شاشة تفاعلية وإضاءة هادئة."
  },
  {
    id: "hall-3",
    name: "معمل الحاسب المتقدم",
    type: "معمل",
    location: "الشرج، الشارع الأول",
    locationUrl: "https://maps.app.goo.gl/4mZb9Y6WgS7",
    capacity: 30,
    hourlyRate: 15000,
    image: "https://images.unsplash.com/photo-1725274032244-9a8f0fa1e9a7?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
    gallery: [
      "https://images.unsplash.com/photo-1725274032244-9a8f0fa1e9a7?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
      "https://images.unsplash.com/photo-1760121788536-9797394e210e?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000"
    ],
    features: ["wifi", "projector", "computers"],
    description: "معمل مجهز لأعمال التدريب العملي مع أجهزة حديثة وشبكة قوية."
  },
  {
    id: "hall-4",
    name: "قاعة التدريب (ج)",
    type: "قاعة محاضرات",
    location: "الشرج، الشارع الأول",
    locationUrl: "https://maps.app.goo.gl/4mZb9Y6WgS7",
    capacity: 40,
    hourlyRate: 14000,
    image: "https://images.unsplash.com/photo-1670348060135-d4c6662b4138?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
    gallery: [
      "https://images.unsplash.com/photo-1670348060135-d4c6662b4138?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000",
      "https://images.unsplash.com/photo-1685955011121-1ef868d21c99?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000"
    ],
    features: ["wifi", "projector"],
    description: "قاعة متوسطة مناسبة للدورات وورش العمل القصيرة."
  }
]

const featureMap: Record<string, { label: string; icon: ReactNode }> = {
  wifi: { label: "WiFi", icon: <Wifi className="h-4 w-4" /> },
  projector: { label: "بروجكتر", icon: <Projector className="h-4 w-4" /> },
  screen: { label: "شاشة", icon: <Monitor className="h-4 w-4" /> },
  computers: { label: "أجهزة", icon: <Monitor className="h-4 w-4" /> }
}



interface Hall {
  id: string
  name: string
  type: string
  description: string
  hourlyRate: number
  image: string
  features: string[]
  location: string
  locationUrl?: string
  capacity: number
  gallery?: string[]
  institute?: {
    name: string
    description: string
    logo: string
    phone: string
    email: string
    address: string
    website: string
  }
  bankAccounts?: any[]
  blackoutPeriods?: any[]
}

export default function HallDetailsPage() {
  const params = useParams()
  const hallId = typeof params.id === "string" ? params.id : ""
  const { settings } = usePlatform()

  const [hall, setHall] = useState<Hall | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHall = async () => {
      try {
        setLoading(true)
        const data = await trainerService.getHallById(hallId)
        // Map database fields to UI fields
        const mappedHall = {
          ...data,
          hourlyRate: Number(data.pricePerHour),
          image: getFileUrl(data.image),
          features: data.facilities || [],
          location: data.location || "غير محدد",
          locationUrl: data.locationUrl || "",
          type: data.type || "قاعة محاضرات",
          institute: {
            name: data.institute?.name || "معهد غير مسمى",
            description: data.instituteDescription || data.institute?.description || "لا يوجد وصف متاح لهذا المعهد حالياً.",
            logo: getFileUrl(data.instituteLogo) || getFileUrl(settings?.general?.siteLogo) || "/images/logo.png",
            phone: data.institute?.phone || "",
            email: data.institute?.email || "",
            address: data.institute?.address || "",
            website: data.institute?.website || "",
          },
          blackoutPeriods: Array.isArray(data.availability?.blackoutPeriods) ? data.availability.blackoutPeriods : []
        }
        setHall(mappedHall)
      } catch (err: any) {
        console.error("Failed to fetch hall details", err)
        setError("فشل في تحميل تفاصيل القاعة")
      } finally {
        setLoading(false)
      }
    }

    if (hallId) fetchHall()
  }, [hallId, settings?.general?.siteLogo])

  const locationText = hall?.location?.trim() ?? ""
  const locationUrl = hall?.locationUrl?.trim() ?? ""
  const locationLabel = locationText || "عرض الموقع على الخريطة"

  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptInfo, setReceiptInfo] = useState({ name: "" })
  const [paymentError, setPaymentError] = useState("")
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [expandedBankId, setExpandedBankId] = useState<string | null>(null)
  const paymentFileRef = useRef<HTMLInputElement | null>(null)
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [selectedSlotsByDate, setSelectedSlotsByDate] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [hallBookingStatus, setHallBookingStatus] = useState<any | null>(null)

  // For storing dynamic availability fetched from backend
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [isFetchingSlots, setIsFetchingSlots] = useState(false)
  const [hallAvailabilityData, setHallAvailabilityData] = useState<any>(null)
  const [unavailableMessage, setUnavailableMessage] = useState("")

  // Global availability fetch removed. Per-date fetch in handleDateSelect.
  useEffect(() => {
    // Reset selection when hallId changes
    setSelectedSlotsByDate({})
    setActiveDate(null)
    setAvailableSlots([])
    setUnavailableMessage("")
  }, [hallId])

  const resolveHallBooking = useCallback((bookings: any[]) => {
    const related = bookings.filter((booking) =>
      booking?.room?.id === hallId || booking?.roomId === hallId || booking?.hallId === hallId
    )
    if (!related.length) return null
    return related.sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime()
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime()
      return bTime - aTime
    })[0]
  }, [hallId])

  const refreshHallBookingStatus = useCallback(async () => {
    try {
      const bookings = await trainerService.getRoomBookings()
      setHallBookingStatus(resolveHallBooking(bookings))
    } catch {
      // keep page functional if booking lookup fails
    }
  }, [resolveHallBooking])

  useEffect(() => {
    if (!hallId) return
    refreshHallBookingStatus()
  }, [hallId, refreshHallBookingStatus])

  // Cleanup receipt preview URL
  useEffect(() => {
    return () => {
      if (receiptPreview) {
        URL.revokeObjectURL(receiptPreview)
      }
    }
  }, [receiptPreview])

  const today = new Date()
  const [monthOffset, setMonthOffset] = useState(0)
  const displayDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const currentYear = displayDate.getFullYear()
  const currentMonth = displayDate.getMonth()
  const monthStart = new Date(currentYear, currentMonth, 1)
  const monthEnd = new Date(currentYear, currentMonth + 1, 0)
  const daysInMonth = monthEnd.getDate()
  const leadingBlanks = monthStart.getDay()
  const dayLabels = ["ح", "ن", "ث", "ر", "خ", "ج", "س"]

  const formatDateKey = (date: Date) => {
    // Standardize to local date string to avoid timezone shifts
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }
  const formatTime = (hour: number) => `${String(hour).padStart(2, "0")}:00`
  const isPastDate = (date: Date) => date.setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)

  const getBlackoutPeriodForDate = (dateKey: string) => {
    const dDate = new Date(dateKey)
    dDate.setHours(12, 0, 0, 0)
    return hall?.blackoutPeriods?.find((bp: any) => {
        const start = new Date(bp.startDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(bp.endDate)
        end.setHours(23, 59, 59, 999)
        return dDate >= start && dDate <= end
    })
  }

  const handleDateSelect = async (dateKey: string) => {
    if (receiptFile || receiptPreview || receiptInfo.name) {
      if (receiptPreview) URL.revokeObjectURL(receiptPreview)
      setReceiptPreview(null)
      setReceiptFile(null)
      setReceiptInfo({ name: "" })
      setPaymentError("")
    }
    setActiveDate(dateKey)
    setAvailableSlots([])
    setUnavailableMessage("")

    const blackout = getBlackoutPeriodForDate(dateKey)
    if (blackout) {
        setUnavailableMessage(`فترة غير متاحة: ${blackout.label || 'صيانة أو حجز مسبق'}`)
        return
    }

    if (!selectedSlotsByDate[dateKey]) {
      setSelectedSlotsByDate(prev => ({ ...prev, [dateKey]: [] }))
    }

    try {
      setIsFetchingSlots(true)
      const data = await trainerService.getHallAvailability(hallId, dateKey)
      setHallAvailabilityData(data)

      const [yearStr, monthStr, dayStr] = dateKey.split("-")
      const dateObj = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr))
      const dayOfWeekMap = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
      const dayName = dayOfWeekMap[dateObj.getDay()]

      // Support both legacy array format and new {slots, blackoutPeriods} format
      const availabilitySlots = Array.isArray(data.availability)
        ? data.availability
        : (data.availability?.slots ?? [])

      const allowedPeriods = availabilitySlots.filter((a: any) => a.day === dayName) || []
      const hasAvailabilityDefined = availabilitySlots.length > 0
      const booked = data.bookedSessions || []

      const openSlots = timeSlots.filter(slot => {
        const [startHourStr, endHourStr] = slot.split(" - ")

        // 1. Check against base availability (working hours)
        if (hasAvailabilityDefined) {
          const isWithinWorkingHours = allowedPeriods.some((period: any) => {
            const pStart = period.startTime.substring(0, 5)
            const pEnd = period.endTime.substring(0, 5)
            return startHourStr >= pStart && endHourStr <= pEnd
          })
          if (!isWithinWorkingHours) return false
        }

        // 2. Check against booked sessions
        const slotStart = new Date(`${dateKey}T${startHourStr}:00`)
        const slotEnd = new Date(`${dateKey}T${endHourStr}:00`)

        const isOverlap = booked.some((b: any) => {
          const bStart = new Date(b.startTime)
          const bEnd = new Date(b.endTime)
          return slotStart < bEnd && slotEnd > bStart
        })

        return !isOverlap
      })

      setAvailableSlots(openSlots)
    } catch (e) {
      console.error("Failed to fetch slots", e)
    } finally {
      setIsFetchingSlots(false)
    }
  }

  const handleSlotToggle = (slot: string) => {
    if (!activeDate) return
    if (receiptFile || receiptPreview || receiptInfo.name) {
      if (receiptPreview) URL.revokeObjectURL(receiptPreview)
      setReceiptPreview(null)
      setReceiptFile(null)
      setReceiptInfo({ name: "" })
      setPaymentError("")
    }
    setSelectedSlotsByDate((prev) => {
      const current = prev[activeDate] ?? []
      if (current.includes(slot)) {
        return { ...prev, [activeDate]: current.filter((v) => v !== slot) }
      }
      return { ...prev, [activeDate]: [...current, slot].sort() }
    })
  }

  const totalHours = Object.values(selectedSlotsByDate).reduce((sum, slots) => sum + slots.length, 0)
  const totalPrice = totalHours * (hall?.hourlyRate ?? 0)
  const bookingInvoiceRows = useMemo(() => {
    const hourlyPrice = hall?.hourlyRate ?? 0
    return Object.entries(selectedSlotsByDate)
      .filter(([, slots]) => slots.length > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, slots]) => {
        const parsedDate = new Date(`${date}T00:00:00`)
        const dayName = parsedDate.toLocaleDateString("ar-YE-u-nu-latn", { weekday: "long" })
        const dateLabel = formatDate(parsedDate)
        const dayHours = slots.reduce((acc, slot) => {
          const [start, end] = slot.split(" - ")
          const startHour = Number(start.split(":")[0])
          const endHour = Number(end.split(":")[0])
          return acc + Math.max(endHour - startHour, 0)
        }, 0)
        const dayPrice = dayHours * hourlyPrice
        return { date, dayName, dateLabel, slots, dayHours, dayPrice }
      })
  }, [selectedSlotsByDate, hall?.hourlyRate])
  const selectedDateCount = bookingInvoiceRows.length
  const selectedSlotsForActiveDate = activeDate ? (selectedSlotsByDate[activeDate] ?? []) : []
  const hasSelectedDate = Boolean(activeDate)
  const hasSelectedSlot = selectedSlotsForActiveDate.length > 0
  const canShowPaymentDetails = totalHours > 0
  const canConfirmBooking = canShowPaymentDetails && Boolean(receiptFile)
  const footerHelperText = !hasSelectedDate
    ? "اختر تاريخ الحجز أولًا"
    : !hasSelectedSlot
    ? "اختر الفترة الزمنية"
      : !receiptFile
        ? "ارفع سند الدفع لتفعيل زر التأكيد"
        : "جاهز لتأكيد الحجز"

  const bookingStatusValue = String(hallBookingStatus?.status || "").toUpperCase()
  const isBookingPending = ["PENDING", "PENDING_APPROVAL", "PENDING_PAYMENT", "PENDING_REVIEW"].includes(bookingStatusValue)
  const isBookingApproved = ["APPROVED", "CONFIRMED"].includes(bookingStatusValue)
  const isBookingRejected = ["REJECTED", "DECLINED"].includes(bookingStatusValue)
  const hasExistingBooking = Boolean(hallBookingStatus) && (isBookingPending || isBookingApproved || isBookingRejected)

  const handleInitialBooking = () => {
    if (Object.keys(selectedSlotsByDate).length === 0 || totalHours === 0) return
    // Directly go to payment review if paying immediately, or pending if not paying immediately. Let's force payment receipt collection first.
    setIsPaymentOpen(true)
  }

  const handleReceiptFile = (file: File | null) => {
    if (!file) return

    // Cleanup previous preview
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview)
      setReceiptPreview(null)
    }

    setReceiptFile(file)
    setReceiptInfo({ name: file.name })
    setPaymentError("")

    // Generate preview if it's an image
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file)
      setReceiptPreview(url)
    }
  }

  const handlePaymentConfirmation = async () => {
    if (!receiptFile?.name && !receiptInfo.name) {
      setPaymentError("يرجى رفع سند الدفع قبل التأكيد.")
      return
    }

    try {
      setIsSubmitting(true)

      // Transform selectedSlotsByDate to flat array
      const flatSessions: { date: string; slot: number }[] = []
      Object.entries(selectedSlotsByDate).forEach(([date, slotArr]) => {
        slotArr.forEach(slotStr => {
          const startHour = parseInt(slotStr.split(":")[0])
          flatSessions.push({ date, slot: startHour })
        })
      })

      const bookingResponse = await trainerService.bookHall(
        hallId,
        flatSessions,
        receiptFile || undefined,
        "حجز مباشر للقاعة من قبل المدرب"
      );

      toast.success("تم إرسال طلب الحجز بنجاح 🎉")
      setHallBookingStatus((bookingResponse as any)?.data || (bookingResponse as any) || { status: "PENDING", room: { id: hallId } })
      setIsBookingOpen(false)
      setIsSuccess(false)
      setSelectedSlotsByDate({})
      setActiveDate(null)
      if (receiptPreview) {
        URL.revokeObjectURL(receiptPreview)
      }
      setReceiptPreview(null)
      setReceiptFile(null)
      setReceiptInfo({ name: "" })
      setPaymentError("")
      refreshHallBookingStatus()
    } catch (err: any) {
      setPaymentError(err?.response?.data?.message || err.message || "فشل في إرسال الحجز");
    } finally {
      setIsSubmitting(false)
    }
  }



  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-lg font-medium text-slate-600">جاري تحميل تفاصيل القاعة...</p>
        </div>
      </div>
    )
  }

  if (error || !hall) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100 max-w-md w-full">
          <div className="flex justify-center mb-4">
            <X className="h-12 w-12 text-red-500 bg-red-50 rounded-full p-2" />
          </div>
          <p className="text-xl font-bold text-slate-900 mb-2">{error || "القاعة غير موجودة"}</p>
          <p className="text-slate-500 mb-6">حدث خطأ أثناء محاولة جلب تفاصيل القاعة من قاعدة البيانات.</p>
          <Button
            className="w-full rounded-full"
            onClick={() => window.location.reload()}
          >
            إعادة المحاولة
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="relative overflow-hidden bg-gradient-to-l from-blue-950 via-blue-900 to-slate-900 text-white">
        <div className="container mx-auto px-4 pt-6 pb-16">
          <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] items-start">
            <div className="flex flex-col gap-4 text-right">
              <div className="flex flex-wrap items-center justify-start gap-4">
                <Button asChild className="h-10 rounded-xl bg-[#FACC15] px-4 font-bold text-[#111827] hover:bg-[#eab308]">
                  <Link href="/trainer/halls">
                    <ArrowRight className="ml-2 h-4 w-4" />
                    العودة لاستكشاف القاعات
                  </Link>
                </Button>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                {hall.name}
              </h1>
              <p className="text-lg text-blue-100 leading-relaxed">
                {hall.description}
              </p>
              <div className="flex justify-start">
                <Badge className="border border-white/20 bg-white/10 text-white">
                  {hall.type}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-blue-200">السعر بالساعة</span>
                <span className="text-2xl font-bold">{hall.hourlyRate} ر.ي</span>
              </div>
              <div className="grid gap-3 text-sm text-blue-100 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {locationUrl ? (
                    <a
                      href={locationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-white/40 underline-offset-4 hover:text-white"
                    >
                      {locationLabel}
                    </a>
                  ) : (
                    <span className="text-blue-100/60 cursor-not-allowed">
                      {locationLabel}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>السعة: {hall.capacity} شخص</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>يتوفر الحجز حسب الجدولة</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {hall.features.map((feature) => (
                  <span
                    key={feature}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/90"
                  >
                    {featureMap[feature]?.icon}
                    {featureMap[feature]?.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/15 bg-slate-900 shadow-sm">
                <HallImage
                  src={hall.image}
                  alt={hall.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 360px, 420px"
                />
              </div>

              <div className="w-full">
                {!hasExistingBooking && (
                  <Button
                    onClick={() => setIsBookingOpen(true)}
                    className="h-12 w-full rounded-[6.5px] bg-white px-10 text-base font-semibold text-blue-900 transition-all duration-200 hover:bg-blue-50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-950 active:scale-[0.99] animate-cta-pop"
                  >
                    حجز القاعة
                  </Button>
                )}

                {hasExistingBooking && (
                  <div className="rounded-[6.5px] border border-white/20 bg-white/10 px-5 py-4 text-white backdrop-blur-sm shadow-sm">
                    <div className="space-y-1 text-center">
                      <h3 className="text-sm font-semibold">
                        {isBookingPending && "تم إرسال طلب الحجز"}
                        {isBookingApproved && "تم تأكيد الحجز"}
                        {isBookingRejected && "تم رفض طلب الحجز"}
                      </h3>
                      <p className="text-xs text-blue-100">
                        {isBookingPending && "طلبك قيد مراجعة المعهد، وسيتم إشعارك عند الرد."}
                        {isBookingApproved && "وافق المعهد على طلبك وتم تأكيد القاعة."}
                        {isBookingRejected && "يمكنك إرسال طلب جديد أو اختيار وقت آخر."}
                      </p>
                    </div>

                    <div className="mx-auto mt-4 grid w-fit grid-cols-[auto_230px_auto] items-start" dir="ltr">
                      <div className="col-start-1 flex flex-col items-center">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-[6.5px] border text-sm font-bold",
                            isBookingPending && "border-amber-400 bg-white/10 text-amber-300",
                            isBookingApproved && "border-emerald-600 bg-emerald-600 text-white",
                            isBookingRejected && "border-red-400 bg-white/10 text-red-300"
                          )}
                        >
                          2
                        </div>
                        <span
                          className={cn(
                            "mt-2 whitespace-nowrap text-center text-xs font-semibold",
                            isBookingPending && "text-amber-300",
                            isBookingApproved && "text-emerald-200",
                            isBookingRejected && "text-red-200"
                          )}
                        >
                          {isBookingPending && "بانتظار موافقة المعهد"}
                          {isBookingApproved && "تم تأكيد الحجز"}
                          {isBookingRejected && "لم تتم الموافقة"}
                        </span>
                      </div>

                      <div className="col-start-2 flex h-8 items-center px-2">
                        <div className="relative h-[2px] w-full overflow-hidden rounded-full bg-white/30">
                          <div
                            className={cn(
                              "absolute right-0 top-0 h-full rounded-full",
                              isBookingPending && "w-1/2 bg-blue-500",
                              isBookingApproved && "w-full bg-blue-500",
                              isBookingRejected && "w-1/2 bg-red-300/80"
                            )}
                          />
                        </div>
                      </div>

                      <div className="col-start-3 flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-[6.5px] bg-blue-600 text-sm font-bold text-white">
                          1
                        </div>
                        <span className="mt-2 whitespace-nowrap text-center text-xs font-semibold text-white">
                          تم إرسال الطلب
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                      {(isBookingPending || isBookingApproved) && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => window.location.href = "/trainer/room-bookings"}
                          className="h-9 w-fit rounded-[6.5px] border-white/30 bg-transparent px-4 text-sm font-medium text-white hover:bg-white/10 hover:text-white"
                        >
                          {isBookingPending ? "عرض تفاصيل الطلب" : "عرض الحجز"}
                        </Button>
                      )}
                      
                      <Button
                        onClick={() => setIsBookingOpen(true)}
                        className="h-9 w-fit rounded-[6.5px] bg-white px-5 text-sm font-semibold text-slate-900 hover:bg-slate-50 shadow-sm"
                      >
                        {isBookingRejected ? "طلب حجز جديد" : "حجز فترة أخرى"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isBookingOpen} onOpenChange={(open) => {
        setIsBookingOpen(open)
        if (!open) {
          // Reset success state when closing
          setTimeout(() => setIsSuccess(false), 300)
        }
      }}>
        <DialogContent
          dir="rtl"
          className="max-h-[88vh] w-[95vw] max-w-5xl overflow-hidden rounded-[6.5px] border border-[#E5EAF2] bg-white p-0 shadow-xl"
        >
          <DialogHeader className="sticky top-0 z-20 border-b border-[#E5EAF2] bg-white px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <DialogTitle className="text-lg font-bold text-slate-900">حجز القاعة</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-500">اختر التاريخ والفترة ثم ارفع سند الدفع لتأكيد الحجز</DialogDescription>
              </div>
              <DialogClose className="flex h-9 w-9 items-center justify-center rounded-[6.5px] border border-slate-200 transition-colors hover:bg-slate-100">
                <X className="h-4 w-4" />
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(88vh-156px)] space-y-4 overflow-y-auto bg-[#F7FAFF] px-5 py-4 pb-32">
            {isSuccess ? (
              <div className="animate-in fade-in zoom-in duration-500 py-10 text-center">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[6.5px] bg-emerald-100">
                  <Check className="h-12 w-12 text-emerald-600" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-slate-900">تم استلام طلب حجزك!</h3>
                <p className="mx-auto mb-7 max-w-sm text-sm text-slate-500">تم إرسال طلب الحجز وسند الدفع بنجاح. سيقوم المعهد بمراجعة طلبك والموافقة عليه في أقرب وقت.</p>
                <div className="mx-auto flex w-full max-w-md flex-col gap-3 sm:flex-row">
                  <Button className="h-11 flex-1 rounded-[6.5px] bg-slate-900 font-bold text-white hover:bg-slate-800" onClick={() => window.location.href = "/trainer/room-bookings"}>عرض طلبات الحجز</Button>
                  <Button variant="outline" className="h-11 flex-1 rounded-[6.5px] font-bold" onClick={() => setIsBookingOpen(false)}>إغلاق</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[6.5px] border border-[#E5EAF2] bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">{new Date(currentYear, currentMonth).toLocaleDateString("ar-YE-u-nu-latn", { month: "long", year: "numeric" })}</p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-[6.5px] border-slate-200" onClick={() => setMonthOffset((prev) => prev - 1)}><ChevronRight className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-[6.5px] border-slate-200" onClick={() => setMonthOffset((prev) => prev + 1)}><ChevronLeft className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">{dayLabels.map((label) => <span key={label}>{label}</span>)}</div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {Array.from({ length: leadingBlanks + daysInMonth }, (_, idx) => {
                        if (idx < leadingBlanks) return <div key={`blank-${idx}`} />
                        const day = idx - leadingBlanks + 1
                        const date = new Date(currentYear, currentMonth, day)
                        const dateKey = formatDateKey(date)
                        const disabled = isPastDate(date)
                        const isSelected = activeDate === dateKey
                        const isToday = formatDateKey(new Date()) === dateKey
                        const hasSelection = (selectedSlotsByDate[dateKey]?.length ?? 0) > 0
                        const blackout = getBlackoutPeriodForDate(dateKey)
                        return (
                          <button
                            key={dateKey}
                            type="button"
                            disabled={disabled}
                            onClick={() => handleDateSelect(dateKey)}
                            className={`relative h-9 rounded-[6.5px] text-sm font-medium transition-all ${
                              isSelected
                                ? "z-10 bg-blue-600 text-white shadow-sm"
                                : disabled
                                  ? "cursor-not-allowed bg-slate-50 text-slate-300"
                                  : blackout
                                    ? "bg-red-50 text-red-500 border-red-200 border hover:bg-red-100"
                                    : hasSelection
                                      ? "border-2 border-blue-200 bg-blue-50 text-blue-700"
                                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {day}
                            {isToday && !isSelected && (
                              <span className="absolute inset-0 rounded-[6.5px] border border-blue-300" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="rounded-[6.5px] border border-[#E5EAF2] bg-white p-4 shadow-sm">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><Clock className="h-4 w-4 text-blue-600" />الفترات المتاحة</h3>
                    {!activeDate ? (
                      <div className="flex min-h-[210px] flex-col items-center justify-center rounded-[6.5px] border border-dashed border-slate-200 text-slate-400"><Calendar className="mb-2 h-7 w-7 opacity-20" /><p className="text-sm">اختر يوماً من التقويم</p></div>
                    ) : (
                      <div className="flex min-h-[210px] flex-col">
                        {isFetchingSlots ? (
                          <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
                        ) : availableSlots.length > 0 ? (
                          <div className="grid max-h-[240px] grid-cols-2 gap-2 overflow-y-auto pl-1">
                            {availableSlots.map((slot) => {
                              const selected = (selectedSlotsByDate[activeDate] ?? []).includes(slot)
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => handleSlotToggle(slot)}
                                  className={`rounded-[6.5px] border px-2 py-2 text-xs font-medium transition-all ${
                                    selected
                                      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                      : "border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                                  }`}
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>{slot}</span>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-1 flex-col items-center justify-center rounded-[6.5px] border border-dashed border-slate-200 text-slate-400"><Lock className="mb-2 h-8 w-8 opacity-20" /><p className="text-sm">{unavailableMessage || "لا توجد فترات متاحة لهذا اليوم"}</p></div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[6.5px] border border-[#E5EAF2] bg-white p-4 shadow-sm">
                    <div className="mb-3 text-right">
                      <h4 className="text-sm font-semibold text-slate-900">
                        تفاصيل حجز قاعة {hall?.name}
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        سعر الساعة: {formatNumber(hall?.hourlyRate ?? 0)} ر.ي
                      </p>
                    </div>
                    {canShowPaymentDetails ? (
                      <div className="space-y-4">
                        <div className="hidden overflow-hidden rounded-[6.5px] border border-slate-200 md:block">
                          <table className="w-full text-right text-sm">
                            <thead className="bg-slate-50 text-slate-700">
                              <tr>
                                <th className="px-3 py-2 font-semibold">اليوم</th>
                                <th className="px-3 py-2 font-semibold">التاريخ</th>
                                <th className="px-3 py-2 font-semibold">الفترات المختارة</th>
                                <th className="px-3 py-2 font-semibold">عدد الساعات</th>
                                <th className="px-3 py-2 font-semibold">سعر اليوم</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bookingInvoiceRows.map((row) => (
                                <tr key={row.date} className="border-t border-slate-200 text-slate-600">
                                  <td className="px-3 py-3 font-medium text-slate-800">{row.dayName}</td>
                                  <td className="px-3 py-3">{row.dateLabel}</td>
                                  <td className="px-3 py-3">
                                    <div className="flex flex-wrap gap-1.5">
                                      {row.slots.map((slot) => (
                                        <span key={`${row.date}-${slot}`} className="rounded-[6.5px] border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                                          {slot}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">{row.dayHours}</td>
                                  <td className="px-3 py-3 font-semibold text-slate-900">{formatNumber(row.dayPrice)} ر.ي</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="space-y-2 md:hidden">
                          {bookingInvoiceRows.map((row) => (
                            <div key={`mobile-${row.date}`} className="rounded-[6.5px] border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="font-semibold text-slate-900">{row.dayName}</p>
                                <p>{row.dateLabel}</p>
                              </div>
                              <div className="mb-2 flex flex-wrap gap-1.5">
                                {row.slots.map((slot) => (
                                  <span key={`mobile-${row.date}-${slot}`} className="rounded-[6.5px] border border-slate-200 bg-white px-2 py-1 text-xs">
                                    {slot}
                                  </span>
                                ))}
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span>عدد الساعات: {row.dayHours}</span>
                                <span className="font-semibold text-slate-900">سعر اليوم: {formatNumber(row.dayPrice)} ر.ي</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="rounded-[6.5px] border border-slate-200 bg-slate-50 p-3 text-sm">
                          <div className="grid gap-2 text-slate-600 md:grid-cols-4">
                            <p>عدد الأيام: <span className="font-semibold text-slate-900">{selectedDateCount}</span></p>
                            <p>عدد الفترات: <span className="font-semibold text-slate-900">{totalHours}</span></p>
                            <p>إجمالي الساعات: <span className="font-semibold text-slate-900">{totalHours}</span></p>
                            <p className="font-semibold text-blue-700">الإجمالي النهائي: {formatNumber(totalPrice)} ر.ي</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[6.5px] border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">اختر تاريخًا وفترة زمنية لعرض ملخص الحجز</div>
                    )}
                  </div>

                  {canShowPaymentDetails ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[6.5px] border border-[#E5EAF2] bg-white p-4 shadow-sm">
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-[6.5px] bg-blue-50 text-blue-600"><Landmark className="h-4 w-4" /></span>الحساب البنكي للمعهد</h4>
                      <div className="grid gap-3">{(hall?.bankAccounts || []).map((bank: any) => (<div key={bank.id} className="rounded-[6.5px] border border-slate-200 bg-slate-50 p-3"><div className="mb-2 flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-[6.5px] bg-blue-50 text-blue-600"><Landmark className="h-5 w-5" /></div><div><h5 className="text-sm font-bold text-slate-900">{bank.bankName}</h5><p className="text-xs text-slate-500">المستفيد: {bank.accountName}</p></div></div><div className="space-y-2 rounded-[6.5px] border border-slate-200 bg-white p-3"><div className="flex items-center justify-between"><span className="text-[10px] uppercase font-bold text-slate-400">رقم الحساب</span><span className="font-mono font-bold text-blue-900" dir="ltr">{bank.accountNumber}</span></div>{bank.iban && (<div className="flex items-center justify-between border-t border-slate-200 pt-2"><span className="text-[10px] uppercase font-bold text-slate-400">IBAN</span><span className="font-mono text-xs text-slate-600" dir="ltr">{bank.iban}</span></div>)}</div></div>))}</div>
                    </div>

                    <div className="rounded-[6.5px] border border-[#E5EAF2] bg-white p-4 shadow-sm">
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-[6.5px] bg-blue-50 text-blue-600"><UploadCloud className="h-4 w-4" /></span>رفع إثبات الدفع</h4>
                      <div
                        onClick={() => paymentFileRef.current?.click()}
                        className={`relative cursor-pointer rounded-[6.5px] border-2 border-dashed p-4 transition-all ${
                          receiptFile ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/30"
                        }`}
                      >
                        <input ref={paymentFileRef} type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleReceiptFile(e.target.files?.[0] ?? null)} />
                        {receiptPreview ? (
                          <div className="group relative h-[170px] w-full overflow-hidden rounded-[6.5px] bg-white"><Image src={receiptPreview} alt="Receipt Preview" fill className="object-contain" /><div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"><UploadCloud className="h-6 w-6 text-white" /><span className="text-white text-xs font-bold">انقر لتغيير الملف</span></div></div>
                        ) : receiptFile ? (
                          <div className="flex items-center gap-3 rounded-[6.5px] border border-emerald-200 bg-white p-3"><div className="flex h-10 w-10 items-center justify-center rounded-[6.5px] bg-emerald-100 text-emerald-600"><Check className="h-6 w-6" /></div><div className="min-w-0 flex-1 text-right"><p className="truncate text-sm font-semibold text-emerald-900">{receiptFile.name}</p><p className="text-[11px] text-emerald-700">{(receiptFile.size / 1024 / 1024).toFixed(2)} MB</p></div></div>
                        ) : (
                          <div className="flex min-h-[130px] flex-col items-center justify-center gap-2 text-center"><div className="flex h-11 w-11 items-center justify-center rounded-[6.5px] bg-blue-50 text-blue-600"><UploadCloud className="h-6 w-6" /></div><div className="px-2"><p className="text-sm font-bold text-slate-700">ارفع صورة السند</p><p className="mt-1 text-xs text-slate-400">PNG, JPG, PDF حتى 5MB</p></div></div>
                        )}
                      </div>
                      {paymentError && (<div className="animate-in fade-in zoom-in-95 mt-3 flex items-center gap-2 rounded-[6.5px] border border-red-100 bg-red-50 p-3 text-xs text-red-600"><AlertTriangle className="h-4 w-4" />{paymentError}</div>)}
                    </div>
                  </div>
                  ) : (
                      <div className="rounded-[6.5px] border border-dashed border-[#E5EAF2] bg-white p-5 text-center text-sm text-slate-500">
                      اختر تاريخًا وفترة زمنية أولًا لعرض تفاصيل الدفع
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {!isSuccess && (
            <div className="sticky bottom-0 z-20 space-y-2 border-t border-[#E5EAF2] bg-white px-5 py-4">
              <Button onClick={handlePaymentConfirmation} disabled={!canConfirmBooking || isSubmitting} className="h-11 w-full rounded-[6.5px] text-base font-bold shadow-sm transition-all disabled:bg-slate-200 disabled:text-slate-500">
                {isSubmitting ? (<div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /><span>جاري إرسال الطلب...</span></div>) : ("تأكيد الحجز والدفع")}
              </Button>
              <p className={`flex items-center justify-center gap-2 text-xs ${canConfirmBooking ? "text-emerald-600" : "text-slate-400"}`}>
                <Lock className="h-3 w-3" />
                {footerHelperText}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {hall && (
        <div className="container mx-auto px-4 py-10">
          <div className="grid gap-6 lg:grid-cols-1">
            <Card className="w-full rounded-2xl border border-slate-100 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.08)]">
              <CardContent className="p-5">
                <div className="flex flex-col gap-5 md:flex-row md:items-center">
                  <div className="flex items-center justify-start md:justify-end">
                    <div className="relative h-28 w-28 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
                      <Image
                        src={hall.institute?.logo || "/images/logo.png"}
                        alt={`شعار ${hall.institute?.name || "المعهد"}`}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="112px"
                      />
                    </div>
                  </div>

                  <div className="flex-1 text-right">
                    <h2 className="text-lg font-bold text-slate-900">{hall.institute?.name || "المعهد غير متاح"}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {hall.institute?.description || "معهد تدريبي متخصص في القاعات التعليمية والدورات الاحترافية."}
                    </p>

                    <div className="mt-4 space-y-2 text-sm">
                      {hall.institute?.phone && (
                        <a href={`tel:${hall.institute.phone}`} className="flex items-center gap-2 text-slate-700 hover:text-blue-700">
                          <Phone className="h-4 w-4" />
                          <span className="text-slate-500">رقم التواصل:</span>
                          <span className="font-semibold">{hall.institute.phone}</span>
                        </a>
                      )}
                      {hall.institute?.email && (
                        <a href={`mailto:${hall.institute.email}`} className="flex items-center gap-2 text-slate-700 hover:text-blue-700">
                          <Mail className="h-4 w-4" />
                          <span className="text-slate-500">البريد الإلكتروني:</span>
                          <span className="font-semibold">{hall.institute.email}</span>
                        </a>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      {hall.institute?.address ? (
                        <span className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 px-3 text-sm text-slate-600 w-auto gap-2">
                          <MapPin className="h-4 w-4" />
                          {hall.institute.address}
                        </span>
                      ) : (
                        hall.locationUrl ? (
                          <a
                            href={hall.locationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700 px-3 gap-2"
                            aria-label="الموقع على الخريطة"
                          >
                            <MapPin className="h-4 w-4" />
                            عرض على الخريطة
                          </a>
                        ) : (
                          <span
                            className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 text-slate-300 cursor-not-allowed px-3 gap-2"
                            aria-label="الموقع غير متوفر"
                          >
                            <MapPin className="h-4 w-4" />
                            الموقع غير متوفر
                          </span>
                        ))}
                      {((hall as any).institute?.website) && (
                        <a
                          href={(hall as any).institute.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700"
                          aria-label="الموقع الإلكتروني"
                        >
                          <Globe className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}





