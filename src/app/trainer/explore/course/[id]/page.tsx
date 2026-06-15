"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import Image from "next/image"
import Link from "next/link"
import { isAxiosError } from "axios"
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState, type ElementType } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { studentService } from "@/lib/student-service"
import { trainerService, type CourseDetail } from "@/lib/trainer-service"
import { HallDetailsModal } from "@/components/halls/HallDetailsModal"
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Globe,
  Heart,
  Info,
  Loader2,
  Mail,
  Landmark,
  Phone,
  UserRound,
  Upload,
  Copy,
  Check,
  FileText as FileTextIcon,
  X,
  Tag,
} from "lucide-react"
import { toast } from "sonner"

function getErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const serverMessage = (error.response?.data as { message?: string } | undefined)?.message
    if (serverMessage) return serverMessage
  }
  return error instanceof Error ? error.message : undefined
}

function resolveImage(src?: string | null, fallback = "/images/course-web.png") {
  if (!src) return fallback
  if (src.startsWith("http")) return src
  const clean = src.replace(/\\/g, "/")
  const separator = clean.startsWith("/") ? "" : "/"
  return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}${separator}${clean}`
}

function cleanText(value?: string | null) {
  return (value || "").replace(/\uFFFD/g, "").trim()
}

function toWhatsAppLink(phone?: string | null) {
  const raw = cleanText(phone)
  if (!raw || raw === "غير متوفر") return null
  const digits = raw.replace(/[^\d+]/g, "")
  if (!digits) return null
  const normalized = digits.startsWith("+") ? digits.slice(1) : digits
  return `https://wa.me/${normalized}`
}

function toMailtoLink(email?: string | null) {
  const raw = cleanText(email)
  if (!raw || raw === "غير متوفر") return null
  return `mailto:${raw}`
}

function normalizeExternalUrl(url?: string | null) {
  const raw = cleanText(url)
  if (!raw || raw === "غير متوفر") return null
  if (/^https?:\/\//i.test(raw)) return raw
  return `https://${raw}`
}

function getInitials(name?: string | null) {
  const value = cleanText(name)
  if (!value) return "؟"
  const letters = value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
  return letters || "؟"
}

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0))
}

function formatArabicDate(value?: string | null) {
  if (!value) return "غير محدد"
  try {
    return new Date(value).toLocaleDateString("ar-EG-u-nu-latn", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return value
  }
}

function formatArabicTime(value?: string | null) {
  if (!value) return "غير محدد"
  try {
    return new Date(value).toLocaleTimeString("ar-EG-u-nu-latn", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return value
  }
}

function deliveryLabel(value?: string | null) {
  if (value === "flexible") return "يعتمد على المعهد لاحقاً"
  if (value === "online") return "أونلاين"
  if (value === "in_person") return "حضوري"
  if (value === "hybrid") return "هجين"
  return "غير محدد"
}

function onlinePlatformLabel(value?: string | null) {
  const raw = cleanText(value).toLowerCase()
  if (!raw) return "غير محدد"
  if (raw === "zoom") return "Zoom"
  if (raw === "teams") return "Microsoft Teams"
  if (raw === "meet") return "Google Meet"
  if (raw === "webex") return "Webex"
  if (raw === "other") return "أخرى"
  return cleanText(value)
}

function computeDurationWeeks(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  const diffMs = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1
  if (diffDays < 7) return 0
  return Math.floor(diffDays / 7)
}

function computeDurationDays(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  const diffMs = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1
  return diffDays % 7
}

function formatWeeksLabel(weeks: number) {
  if (weeks <= 0) return "غير محدد"
  if (weeks === 1) return "أسبوع واحد"
  if (weeks === 2) return "أسبوعان"
  if (weeks >= 3 && weeks <= 10) return `${weeks} أسابيع`
  return `${weeks} أسبوعًا`
}

function SectionTitle({ icon: Icon, title }: { icon: ElementType; title: string }) {
  return (
    <div className="mb-4 flex w-full items-center justify-start gap-3 text-right" dir="rtl">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
    </div>
  )
}

type RegistrationUIState = {
  buttonLabel: string
  buttonDisabled: boolean
  buttonClassName: string
  currentStep: number
  completedSteps: number[]
  statusLabel: string
  action: "register" | "pay" | "go_course" | "none"
}

function mapEnrollmentStatusToUI(status: string): RegistrationUIState {
  const normalized = (status || "NONE").toUpperCase()

  if (["ACTIVE", "ENROLLED", "COMPLETED"].includes(normalized)) {
    return {
      buttonLabel: "الانتقال إلى الدورة",
      buttonDisabled: false,
      buttonClassName: "h-12 w-full rounded-xl bg-[#2563EB] text-white hover:bg-[#1d4ed8]",
      currentStep: 2,
      completedSteps: [0, 1, 2],
      statusLabel: "تم تفعيل تسجيلك في الدورة",
      action: "go_course",
    }
  }

  if (["PAYMENT_UNDER_REVIEW", "PENDING_PAYMENT_REVIEW", "PAYMENT_CONFIRMED"].includes(normalized)) {
    return {
      buttonLabel: "سند الدفع قيد المراجعة",
      buttonDisabled: true,
      buttonClassName: "h-12 w-full rounded-xl bg-slate-500 text-white hover:bg-slate-500",
      currentStep: 1,
      completedSteps: [0, 1],
      statusLabel: "تم رفع سند الدفع وبانتظار المراجعة",
      action: "none",
    }
  }

  if (["PENDING_PAYMENT", "APPROVED", "PRELIMINARY_APPROVED"].includes(normalized)) {
    return {
      buttonLabel: "ادفع الرسوم",
      buttonDisabled: false,
      buttonClassName: "h-12 w-full rounded-xl bg-[#2563EB] text-white hover:bg-[#1d4ed8]",
      currentStep: 1,
      completedSteps: [0],
      statusLabel: "بعد الموافقة أكمل رفع سند الدفع",
      action: "pay",
    }
  }

  if (["PRELIMINARY", "PENDING_APPROVAL", "PENDING_REVIEW"].includes(normalized)) {
    return {
      buttonLabel: "طلبك قيد المراجعة",
      buttonDisabled: true,
      buttonClassName: "h-12 w-full rounded-xl bg-slate-500 text-white hover:bg-slate-500",
      currentStep: 0,
      completedSteps: [0],
      statusLabel: "تم استلام طلبك المبدئي وهو قيد المراجعة",
      action: "none",
    }
  }

  if (["REJECT_PAYMENT", "PROOF_REJECTED", "PAYMENT_REJECTED"].includes(normalized)) {
    return {
      buttonLabel: "إعادة رفع سند الدفع",
      buttonDisabled: false,
      buttonClassName: "h-12 w-full rounded-xl bg-[#2563EB] text-white hover:bg-[#1d4ed8]",
      currentStep: 1,
      completedSteps: [0],
      statusLabel: "تم رفض سند الدفع، يرجى رفع سند جديد",
      action: "pay",
    }
  }

  if (["REJECTED", "ENROLLMENT_REJECTED"].includes(normalized)) {
    return {
      buttonLabel: "إعادة إرسال طلب التسجيل",
      buttonDisabled: false,
      buttonClassName: "h-12 w-full rounded-xl bg-[#2563EB] text-white hover:bg-[#1d4ed8]",
      currentStep: 0,
      completedSteps: [],
      statusLabel: "تم رفض طلب التسجيل",
      action: "register",
    }
  }

  if (normalized === "CANCELLED") {
    return {
      buttonLabel: "تم إلغاء التسجيل",
      buttonDisabled: true,
      buttonClassName: "h-12 w-full rounded-xl bg-slate-500 text-white hover:bg-slate-500",
      currentStep: 0,
      completedSteps: [],
      statusLabel: "تم إلغاء التسجيل من قبلك",
      action: "none",
    }
  }

  return {
    buttonLabel: "التسجيل في الدورة",
    buttonDisabled: false,
    buttonClassName: "h-12 w-full rounded-xl bg-[#2563EB] text-white hover:bg-[#1d4ed8]",
    currentStep: 0,
    completedSteps: [],
    statusLabel: "ابدأ بالتسجيل المبدئي",
    action: "register",
  }
}

export default function TrainerExploreCourseDetailsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const from = searchParams.get("from")
  const tab = searchParams.get("tab")
  const params = useParams()
  const courseId = typeof params.id === "string" ? params.id : ""

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isHallModalOpen, setIsHallModalOpen] = useState(false)
  const [selectedHallId, setSelectedHallId] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [paymentFile, setPaymentFile] = useState<File | null>(null)
  const [enrollmentStatus, setEnrollmentStatus] = useState<string>("NONE")
  const [, setEnrollmentRejectionReason] = useState("")
  const paymentFileInputRef = useRef<HTMLInputElement | null>(null)
  const paymentPreviewUrl = useMemo(
    () => (paymentFile && paymentFile.type.startsWith("image/") ? URL.createObjectURL(paymentFile) : null),
    [paymentFile],
  )

  useEffect(() => {
    return () => {
      if (paymentPreviewUrl) URL.revokeObjectURL(paymentPreviewUrl)
    }
  }, [paymentPreviewUrl])

  useEffect(() => {
    if (!courseId) return
    setLoading(true)
    setError(null)
    trainerService
      .getPublicCourseById(courseId)
      .then(setCourse)
      .catch(() => setError("الدورة غير موجودة أو غير متاحة"))
      .finally(() => setLoading(false))
  }, [courseId])

  useEffect(() => {
    if (!user?.id) {
      setIsFavorite(false)
      return
    }
    studentService
      .getWishlist()
      .then((items) => setIsFavorite(items.some((item: { id?: string }) => item.id === courseId)))
      .catch(() => { })
  }, [courseId, user?.id])

  useEffect(() => {
    if (!user?.id || !courseId) {
      setEnrollmentStatus("NONE")
      return
    }

    Promise.all([studentService.getEnrollmentStatus(courseId), studentService.getMyCourses()])
      .then(([data, myCourses]) => {
        setEnrollmentStatus(data.status || "NONE")
        const found = (Array.isArray(myCourses) ? myCourses : []).find((entry) => entry?.course?.id === courseId || entry?.courseId === courseId)
        void found
      })
      .catch(() => {
        setEnrollmentStatus("NONE")
      })
  }, [courseId, user?.id])

  const handleFavorite = async () => {
    if (!user?.id) {
      toast.error("يرجى تسجيل الدخول أولًا")
      return
    }
    try {
      const result = await studentService.toggleWishlist(courseId)
      setIsFavorite(result.added)
      toast.success(result.added ? "تمت الإضافة إلى المفضلة" : "تمت الإزالة من المفضلة")
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "تعذر تحديث المفضلة")
    }
  }

  const handleRegister = async () => {
    if (!user?.id) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/courses/${courseId}`)}`)
      return
    }
    const fullName = (user.name || "").trim()
    const email = (user.email || "").trim()
    const phone = (user.phone || "").trim()

    if (!fullName || !email || !phone) {
      toast.error("يرجى تحديث بياناتك من صفحة الملف الشخصي قبل إرسال الطلب")
      return
    }

    setSubmitting(true)
    try {
      await studentService.preRegisterCourse(courseId, {
        fullName,
        email,
        phone,
      })
      setEnrollmentStatus("PENDING_APPROVAL")
      setEnrollmentRejectionReason("")
      setRegisterOpen(false)
      toast.success("تم إرسال طلب التسجيل بنجاح")
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "تعذر إرسال طلب التسجيل")
    } finally {
      setSubmitting(false)
    }
  }

  const handleMainAction = () => {
    const ui = mapEnrollmentStatusToUI(enrollmentStatus)

    if (!user?.id && (ui.action === "register" || ui.action === "pay" || ui.action === "go_course")) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/courses/${courseId}`)}`)
      return
    }

    if (ui.action === "register") {
      setRegisterOpen(true)
      return
    }

    if (ui.action === "pay") {
      setPaymentOpen(true)
      return
    }

    if (ui.action === "go_course") {
      router.push(`/student/courses/${courseId}`)
    }
  }

  const handleSubmitPaymentProof = async () => {
    setPaymentError(null)
    if (!paymentFile) {
      const msg = "يرجى اختيار ملف سند الدفع أولًا"
      setPaymentError(msg)
      toast.error(msg)
      return
    }
    if (!availableBankAccounts.length) {
      const msg = "لا توجد حسابات بنكية متاحة حاليًا"
      setPaymentError(msg)
      toast.error(msg)
      return
    }

    setSubmittingPayment(true)
    try {
      await studentService.submitPaymentProof(courseId, paymentFile)
      setPaymentOpen(false)
      setPaymentFile(null)
      setEnrollmentRejectionReason("")
      const status = await studentService.getEnrollmentStatus(courseId)
      setEnrollmentStatus(status.status || "PAYMENT_UNDER_REVIEW")
      toast.success("تم رفع سند الدفع بنجاح")
    } catch (err: unknown) {
      const msg = getErrorMessage(err) || "تعذر رفع سند الدفع"
      setPaymentError(msg)
      toast.error(msg)
    } finally {
      setSubmittingPayment(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const handleCopy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1200)
    } catch {
      toast.error("تعذر النسخ")
    }
  }

  const view = useMemo(() => {
    if (!course) return null

    const raw = course as CourseDetail & {
      trainer?: { name?: string | null }
      trainerName?: string | null
      instructor?: { name?: string | null }
      institute?: {
        name?: string | null
        address?: string | null
        location?: string | null
        phone?: string | null
        email?: string | null
        logo?: string | null
      } | null
    }
    const maxStudents = Number(course.maxStudents || 0)
    const enrolled = Number(course.enrolledCount || 0)
    const seats = maxStudents > 0 ? Math.max(0, maxStudents - enrolled) : 0
    const tags = Array.isArray(course.tags) && course.tags.length > 0 ? course.tags : []
    const objectives = Array.isArray(course.objectives) ? course.objectives.map(cleanText).filter(Boolean) : []
    const prerequisites = Array.isArray(course.prerequisites) ? course.prerequisites.map(cleanText).filter(Boolean) : []
    const sessions = Array.isArray(course.sessions) ? course.sessions : []
    const firstOnlineSession = sessions.find((session) => String(session?.type || "").toLowerCase() === "online")
    const firstInPersonSession = sessions.find((session) => String(session?.type || "").toLowerCase() === "in_person")

    const instituteRaw = (raw?.institute ?? {}) as {
      name?: string | null
      address?: string | null
      location?: string | null
      website?: string | null
      locationUrl?: string | null
      phone?: string | null
      email?: string | null
      logo?: string | null
      description?: string | null
    }
    const trainerName =
      cleanText(raw?.trainer?.name) ||
      cleanText(raw?.trainerName) ||
      cleanText(raw?.instructor?.name) ||
      cleanText(course.instructor?.name) ||
      cleanText(instituteRaw?.name) ||
      "غير متوفر"

    const instituteName = cleanText(instituteRaw?.name) || "غير متوفر"
    const instituteLocation = cleanText(instituteRaw?.address) || cleanText(instituteRaw?.location) || "غير متوفر"
    const instituteLocationUrl = normalizeExternalUrl(instituteRaw?.locationUrl || null)
    const instituteWebsiteUrl = normalizeExternalUrl(instituteRaw?.website || null)
    const institutePhone = cleanText(instituteRaw?.phone) || "غير متوفر"
    const instituteEmail = cleanText(instituteRaw?.email) || "غير متوفر"
    const instituteLogo = instituteRaw?.logo || null
    const instituteDescription = cleanText(instituteRaw?.description) || null
    const isTrainerOwnedCourse = Boolean(course.trainerId)
    const hasInstitute = Boolean(instituteName && instituteName !== "غير متوفر")
    const trainerPhone = cleanText(course.instructor?.phone) || (isTrainerOwnedCourse ? "غير متوفر" : institutePhone)
    const trainerEmail = cleanText(course.instructor?.email) || (isTrainerOwnedCourse ? "غير متوفر" : instituteEmail)
    const trainerSubtitle =
      cleanText(course.instructor?.specialties?.[0]) ||
      cleanText(course.instructor?.bio) ||
      (isTrainerOwnedCourse ? "مدرب مستقل" : "معهد تدريبي")
    const courseStatus = String(course.courseStatus || (course as any).status);
    const isPendingOrDraft = courseStatus === "PENDING_MINIMUM" || courseStatus === "DRAFT";
    const delivery = isPendingOrDraft ? "غير محدد" : deliveryLabel(course.deliveryType);
    const actualStartDate = isPendingOrDraft ? null : course.startDate;
    const actualEndDate = isPendingOrDraft ? null : course.endDate;

    const deliveryDetail =
      course.deliveryType === "online"
        ? onlinePlatformLabel(firstOnlineSession?.location || firstOnlineSession?.meetingLink || "")
        : course.deliveryType === "in_person"
          ? cleanText(firstInPersonSession?.room?.name || firstInPersonSession?.location || "")
          : ""
    return {
      title: cleanText(course.title) || "تفاصيل الدورة",
      shortDescription: cleanText(course.shortDescription),
      description: cleanText(course.description),
      category: cleanText(course.category) || "دورة تدريبية",
      price: Number(course.price || 0),
      seats,
      enrolled,
      tags,
      objectives,
      prerequisites,
      sessions,
      durationWeeks: computeDurationWeeks(actualStartDate, actualEndDate),
      startDate: actualStartDate,
      endDate: actualEndDate,
      delivery,
      deliveryDetail,
      roomId: course.deliveryType === "in_person" ? (firstInPersonSession?.room?.id || null) : null,
      instructor: course.instructor,
      staffTrainers: course.staffTrainers,
      trainerName,
      trainerPhone,
      trainerEmail,
      trainerSubtitle,
      hasInstitute,
      institute: {
        name: instituteName,
        location: instituteLocation,
        locationUrl: instituteLocationUrl,
        phone: institutePhone,
        email: instituteEmail,
        logo: instituteLogo,
        description: instituteDescription,
        features: course.institute?.features || [],
      },
      courseStatus,
      minStudents: Number(course.minStudents || 0),
    }
  }, [course])

  const availableBankAccounts = useMemo(() => {
    const accounts = view?.instructor?.bankAccounts || []
    if (!Array.isArray(accounts)) return []
    return accounts.filter((account) => account?.isActive !== false)
  }, [view?.instructor?.bankAccounts])

  useEffect(() => {
    if (!selectedBankAccountId && availableBankAccounts.length) {
      setSelectedBankAccountId(availableBankAccounts[0].id)
    }
  }, [availableBankAccounts, selectedBankAccountId])

  const registrationUI = useMemo(() => mapEnrollmentStatusToUI(enrollmentStatus), [enrollmentStatus])
  const enrollmentStatusKey = enrollmentStatus.toUpperCase()
  const isEnrollmentRejected = ["REJECTED", "ENROLLMENT_REJECTED", "REJECT_PAYMENT", "PROOF_REJECTED", "PAYMENT_REJECTED"].includes(enrollmentStatusKey)
  const isEnrollmentCancelled = enrollmentStatusKey === "CANCELLED"

  const studentName = (user?.name || "").trim() || "غير محدد"
  const studentEmail = (user?.email || "").trim() || "غير محدد"
  const studentPhone = (user?.phone || "").trim()
  const studentAvatar = resolveImage((user as { avatar?: string } | null)?.avatar, "")
  const studentInitials = studentName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "؟"
  const registrationRecipientLabel = course?.trainerId ? "للمدرب" : course?.instituteId ? "للمعهد" : "لصاحب الدورة"

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-slate-500" dir="rtl">
        <Loader2 className="h-5 w-5 animate-spin" />
        جاري تحميل تفاصيل الدورة...
      </div>
    )
  }

  if (!course || !view || error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-right text-red-700" dir="rtl">
        {error || "تعذر تحميل الدورة"}
      </div>
    )
  }

  const heroMetaItems = [
    view.category ? { icon: Tag, label: view.category } : null,
    view.delivery
      ? {
        icon: Globe,
        label: view.deliveryDetail && view.deliveryDetail !== "غير محدد" && !(view.courseStatus === "PENDING_MINIMUM" || view.courseStatus === "DRAFT")
          ? `${view.delivery}: ${view.deliveryDetail}`
          : view.delivery,
        isRoom: !!view.roomId,
        roomId: view.roomId,
      }
      : null,
    view.durationWeeks > 0 ? { icon: Clock, label: formatWeeksLabel(view.durationWeeks) } : null,
  ].filter(Boolean) as { icon: ElementType; label: string }[]

  const heroScheduleItems = [
    view.startDate || view.endDate
      ? { icon: Calendar, label: `${formatArabicDate(view.startDate)}${view.endDate ? ` - ${formatArabicDate(view.endDate)}` : ""}` }
      : { icon: Calendar, label: "سيُحدد لاحقاً" },
    computeDurationDays(view.startDate, view.endDate) > 0 ? { icon: Clock, label: `${computeDurationDays(view.startDate, view.endDate)} يوم` } : null,
  ].filter(Boolean) as { icon: ElementType; label: string }[]

  const seatSummaryParts = [view.seats || view.seats === 0 ? `${view.seats} متاح` : null, view.enrolled || view.enrolled === 0 ? `${view.enrolled} مسجل` : null].filter(Boolean) as string[]

  const sectionLinks = [
    { href: "#learn", label: "ماذا ستتعلم" },
    { href: "#about", label: "الوصف" },
    { href: "#schedule", label: "الجدول الزمني" },
    { href: "#requirements", label: "المتطلبات" },
    { href: "#instructor", label: "المدرب" },
  ]

  const registrationSteps = [
    { label: "التسجيل المبدئي" },
    { label: "رفع سند الدفع" },
    { label: "المراجعة" },
  ]
  const registrationFlowSteps = registrationSteps.map((step, index) => ({
    ...step,
    active: index === 0,
  }))

  let backLink = "/courses"
  let backText = "العودة للاستكشاف"

  if (from === "my-courses") {
    if (pathname.startsWith("/student")) {
      backLink = tab ? `/student/my-courses?tab=${tab}` : "/student/my-courses"
      backText = "العودة إلى دوراتي"
    }
    else if (pathname.startsWith("/trainer")) {
      backLink = "/trainer/courses"
      backText = "العودة لإدارة الدورات"
    }
    else if (pathname.startsWith("/institute")) {
      backLink = "/institute/courses"
      backText = "العودة لإدارة الدورات"
    }
  } else if (pathname.startsWith("/student/explore")) {
    backLink = "/student/courses" // Browse courses for students
  } else if (pathname.startsWith("/student")) {
    backLink = "/student/my-courses" // My courses
    backText = "العودة إلى دوراتي"
  } else if (pathname.startsWith("/institute/courses")) {
    backLink = "/institute/courses"
    backText = "العودة لإدارة الدورات"
  } else if (pathname.startsWith("/trainer/courses")) {
    backLink = "/trainer/courses"
    backText = "العودة لإدارة الدورات"
  } else if (pathname.startsWith("/trainer/explore")) {
    backLink = "/trainer/explore"
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-right" dir="rtl">
      <section className="w-full overflow-visible bg-gradient-to-l from-blue-600 to-sky-500 text-white">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <div className="relative grid gap-5 pb-16 pt-6 md:pb-20 md:pt-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8 lg:pb-24 lg:pt-9">
            <div className="space-y-3 text-right">
              <div className="flex flex-wrap items-center justify-start gap-2">
                <Button asChild variant="outline" className="h-10 rounded-[6.5px] border-white/20 bg-white/10 px-4 text-white hover:bg-white/15 hover:text-white">
                  <Link href={backLink}>
                    <ArrowRight className="ml-2 h-4 w-4" />
                    {backText}
                  </Link>
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-extrabold leading-tight text-white md:text-4xl">{view.title}</h1>
                  {view.courseStatus === "PENDING_MINIMUM" ? (
                    <Badge className="h-7 rounded-[6.5px] border-amber-300/30 bg-amber-500 text-white hover:bg-amber-600">
                      بانتظار اكتمال العدد
                    </Badge>
                  ) : view.courseStatus === "ACTIVE" ? (
                    <Badge className="h-7 rounded-[6.5px] border-emerald-300/30 bg-emerald-500 text-white hover:bg-emerald-600">
                      مستمرة
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-x-1 text-[13px] leading-6 text-white/90">
                  {heroMetaItems.map((item, index) => {
                    const Icon = item.icon
                    return (
                      <div key={item.label} className="inline-flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-white/80" />
                        {(item as any).isRoom ? (
                          <span 
                            className="cursor-pointer underline decoration-white/50 underline-offset-2 hover:text-white transition-colors"
                            onClick={() => {
                              setSelectedHallId((item as any).roomId);
                              setIsHallModalOpen(true);
                            }}
                          >
                            {item.label}
                          </span>
                        ) : (
                          <span>{item.label}</span>
                        )}
                        {index < heroMetaItems.length - 1 ? <span aria-hidden="true" className="mx-1 text-white/50">·</span> : null}
                      </div>
                    )
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-7 text-white/90">
                  {heroScheduleItems.map((item, index) => {
                    const Icon = item.icon
                    return (
                      <div key={item.label} className="inline-flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-white/80" />
                        <span>{item.label}</span>
                        {index < heroScheduleItems.length - 1 ? <span aria-hidden="true" className="mx-1 text-white/50">·</span> : null}
                      </div>
                    )
                  })}
                </div>
                <p
                  className="max-w-3xl text-sm leading-8 text-white/90 md:text-base"
                  style={{
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                    overflow: "hidden",
                  }}
                >
                  {view.shortDescription || "لا يوجد وصف مختصر لهذه الدورة حاليًا."}
                </p>
              </div>

              {view.tags.length > 0 ? (
                <div className="flex flex-wrap justify-start gap-2">
                  {view.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} className="rounded-[6.5px] border border-white/10 bg-white/15 text-xs text-white hover:bg-white/15">
                      {cleanText(tag)}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 space-y-1">
                <div className="overflow-x-auto pb-1">
                  <div className="mx-auto grid max-w-xl grid-cols-[auto_1fr_auto_1fr_auto] items-start px-2" dir="rtl">
                    {registrationSteps.map((step, index) => {
                      const isCompleted = !isEnrollmentRejected && !isEnrollmentCancelled && index < registrationUI.currentStep
                      const isCurrent = index === registrationUI.currentStep
                      const isCurrentRejected = (isEnrollmentRejected || isEnrollmentCancelled) && isCurrent
                      return (
                        <div key={step.label} className="contents">
                          <div className="z-10 flex flex-col items-center justify-start text-center">
                            <span
                              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-[12px] font-bold shadow-sm ${isCurrentRejected
                                ? "border-rose-200 bg-rose-500 text-white"
                                : isCurrent
                                  ? "border-white/35 bg-white text-blue-700"
                                  : isCompleted
                                    ? "border-white/20 bg-white/20 text-white"
                                    : "border-white/25 bg-white/10 text-white/80"
                                }`}
                            >
                              {index + 1}
                            </span>
                            <span
                              className={`mt-2 text-[11px] font-medium leading-5 ${isCurrentRejected
                                ? "text-rose-100"
                                : isCurrent
                                  ? "text-white"
                                  : isCompleted
                                    ? "text-white/90"
                                    : "text-white/70"
                                }`}
                            >
                              {step.label}
                            </span>
                          </div>
                          {index < registrationSteps.length - 1 ? (
                            <div
                              aria-hidden="true"
                              className={`mx-3 mt-[18px] h-px self-start ${(isEnrollmentRejected || isEnrollmentCancelled) ? "bg-rose-200/70" : index < registrationUI.currentStep ? "bg-white/80" : "bg-white/25"
                                }`}
                            />
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <p className={`text-sm leading-6 ${isEnrollmentRejected || isEnrollmentCancelled ? "text-rose-100" : "text-white/85"}`}>
                  {isEnrollmentCancelled
                    ? "تم إلغاء التسجيل."
                    : isEnrollmentRejected
                      ? "يوجد رفض في الطلب الحالي، راجع السبب إن وجد."
                      : registrationUI.statusLabel}
                </p>
              </div>
            </div>

            <div className="w-full shrink-0 lg:w-[340px]">
              <Card className="overflow-hidden rounded-[6.5px] border border-white/20 bg-gradient-to-b from-blue-900/45 via-blue-800/35 to-blue-950/30 shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-md">
                <div className="relative h-[190px] overflow-hidden rounded-t-[6.5px] bg-slate-100">
                  <Image src={resolveImage(course.image)} alt={view.title} fill className="object-cover" unoptimized />
                </div>
                <CardContent className="space-y-3 p-4 text-center">
                  <div className="space-y-1">
                    <div className="text-[1.65rem] font-extrabold leading-tight text-white">
                      {formatMoney(view.price)} <span className="text-lg font-bold text-white">ر.ي</span>
                    </div>
                  </div>
                  {seatSummaryParts.length ? (
                    <div className="rounded-[6.5px] border border-white/15 bg-white/12 px-3 py-2 text-sm text-white/90">
                      المقاعد: {seatSummaryParts[0]}
                      {seatSummaryParts[1] ? ` · ${seatSummaryParts[1]}` : ""}
                    </div>
                  ) : null}
                  {view.courseStatus === "PENDING_MINIMUM" && view.minStudents > 0 ? (
                    <div className="space-y-2 rounded-[6.5px] border border-amber-400/20 bg-amber-500/10 p-3 text-right">
                      <div className="flex justify-between text-xs font-semibold text-amber-100">
                        <span>بانتظار تأكيد الانعقاد</span>
                        <span>{view.enrolled} / {view.minStudents} مقعد كحد أدنى</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900/40">
                        <div
                          className="h-full bg-amber-400 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, (view.enrolled / view.minStudents) * 100))}%` }}
                        />
                      </div>
                      <p className="text-[11px] leading-relaxed text-amber-200/90">
                        سجل الآن لتساعد في اكتمال العدد. لن يتم مطالبتك بالدفع حتى يتم تأكيد انعقاد الدورة.
                      </p>
                    </div>
                  ) : view.courseStatus === "ACTIVE" ? (
                    <div className="rounded-[6.5px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300">
                      ✓ الدورة مستمرة
                    </div>
                  ) : null}
                  {(!user?.role || !['TRAINER', 'INSTITUTE_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) && (
                    <>
                      <Button
                        onClick={handleMainAction}
                        disabled={registrationUI.buttonDisabled}
                        className="h-12 w-full rounded-[6.5px] bg-white px-4 text-sm font-semibold text-blue-700 shadow-none hover:bg-slate-100"
                      >
                        {registrationUI.buttonLabel}
                      </Button>
                      <Button onClick={handleFavorite} variant="outline" className="h-11 w-full rounded-[6.5px] border-white/25 bg-white/10 text-white hover:bg-white/15 hover:text-white">
                        <Heart className={`ml-2 h-4 w-4 ${isFavorite ? "fill-current text-red-500" : ""}`} />
                        {isFavorite ? "في المفضلة" : "إضافة إلى المفضلة"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <nav className="w-full border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap py-3" dir="rtl">
            {sectionLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`inline-flex h-9 shrink-0 items-center border-b-2 px-3 text-sm font-semibold ${item.href === `#${(typeof window !== "undefined" ? window.location.hash.replace("#", "") : "")}` ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <section className="bg-slate-50">
        <div className="ml-auto w-full max-w-5xl space-y-8 px-6 py-10 text-right md:px-8" dir="rtl">
          <section id="learn" className="scroll-mt-24">
            <SectionTitle icon={BookOpen} title="ماذا ستتعلم" />
            {view.objectives.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {view.objectives.map((item) => (
                  <div
                    key={item}
                    className="flex items-start justify-start gap-3 text-right"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <span className="text-sm leading-7 text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-slate-600">لا توجد أهداف مضافة لهذه الدورة حاليًا.</p>
            )}
          </section>

          <section id="about" className="scroll-mt-24">
            <SectionTitle icon={Info} title="الوصف" />
            <p className="max-w-3xl text-sm leading-8 text-slate-600">
              {view.description || "لا يوجد وصف تفصيلي لهذه الدورة حاليًا."}
            </p>
          </section>

          <section id="schedule" className="scroll-mt-24">
            <SectionTitle icon={Calendar} title="الجدول الزمني" />
            {view.sessions.length ? (
              <div className="overflow-hidden rounded-[6.5px] border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-[720px] w-full text-right text-sm" dir="rtl">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr>
                        <th className="px-4 py-3 font-semibold">الجلسة</th>
                        <th className="px-4 py-3 font-semibold">التاريخ</th>
                        <th className="px-4 py-3 font-semibold">الوقت</th>
                        <th className="px-4 py-3 font-semibold">النوع</th>
                        <th className="px-4 py-3 font-semibold">المنصة/الموقع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                      {view.sessions.map((session, index) => (
                        <tr key={session.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">{cleanText(session.topic) || `جلسة ${index + 1}`}</td>
                          <td className="px-4 py-3">{formatArabicDate(session.startTime)}</td>
                          <td className="px-4 py-3">من {formatArabicTime(session.startTime)} إلى {formatArabicTime(session.endTime)}</td>
                          <td className="px-4 py-3">{deliveryLabel(session.type)}</td>
                          <td className="px-4 py-3">
                            {cleanText(session.location) ? (
                              <span>{cleanText(session.location)}</span>
                            ) : session.meetingLink ? (
                              <a href={session.meetingLink} target="_blank" rel="noreferrer" className="text-blue-700 underline-offset-2 hover:underline">
                                رابط الجلسة
                              </a>
                            ) : (
                              <span>غير متوفر</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-7 text-slate-600">لا توجد جلسات مجدولة حاليًا.</p>
            )}
          </section>

          <section id="requirements" className="scroll-mt-24">
            <SectionTitle icon={CheckCircle2} title="المتطلبات" />
            {view.prerequisites.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {view.prerequisites.map((item) => (
                  <div
                    key={item}
                    className="flex items-start justify-start gap-3 text-right"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="text-sm leading-7 text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-slate-600">لا توجد متطلبات مسبقة لهذه الدورة.</p>
            )}
          </section>

          <section id="instructor" className="scroll-mt-24">
            <SectionTitle icon={UserRound} title="تعرف على المدرب" />
            <div className="space-y-4">
              {view.staffTrainers && view.staffTrainers.length > 0 ? (
                view.staffTrainers.map((trainer: any) => (
                  <div key={trainer.id} className="w-full rounded-[6.5px] border border-slate-200 bg-white p-4">
                    <div dir="rtl" className="flex items-start justify-start gap-4 text-right">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[6.5px] bg-slate-100 md:h-20 md:w-20">
                        {trainer.avatar ? (
                          <Image
                            src={resolveImage(trainer.avatar, "/images/course-web.png")}
                            alt={trainer.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xl font-bold text-slate-700">
                            {getInitials(trainer.name)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-right">
                        <h4 className="text-xl font-bold text-slate-900">{trainer.name || "غير متوفر"}</h4>
                        {trainer.bio ? <p className="mt-1 text-sm text-slate-600">{trainer.bio}</p> : null}
                        {trainer.specialties && trainer.specialties.length > 0 && (
                          <div className="mt-3">
                            <p className="mb-2 text-[13px] font-bold text-slate-800">التخصصات:</p>
                            <div className="flex flex-wrap gap-2">
                              {trainer.specialties.map((spec: string) => (
                                <span key={spec} className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                  {spec}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700">
                          {trainer.phone ? (
                            <div className="inline-flex items-center gap-2">
                              <Phone className="h-4 w-4 text-emerald-600" />
                              {toWhatsAppLink(trainer.phone) ? (
                                <a
                                  href={toWhatsAppLink(trainer.phone)!}
                                  target="_blank"
                                  rel="noreferrer"
                                  dir="ltr"
                                  className="text-emerald-700 underline-offset-2 hover:underline"
                                >
                                  {trainer.phone}
                                </a>
                              ) : (
                                <span dir="ltr">{trainer.phone}</span>
                              )}
                            </div>
                          ) : null}
                          {trainer.email ? (
                            <div className="inline-flex items-center gap-2">
                              <Mail className="h-4 w-4 text-blue-600" />
                              {toMailtoLink(trainer.email) ? (
                                <a href={toMailtoLink(trainer.email)!} className="text-blue-700 underline-offset-2 hover:underline">
                                  {trainer.email}
                                </a>
                              ) : (
                                <span>{trainer.email}</span>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="w-full rounded-[6.5px] border border-slate-200 bg-white p-4">
                  <div dir="rtl" className="flex items-start justify-start gap-4 text-right">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[6.5px] bg-slate-100 md:h-20 md:w-20">
                      {view.instructor?.avatar ? (
                        <Image
                          src={resolveImage(view.instructor.avatar, "/images/course-web.png")}
                          alt={view.trainerName}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl font-bold text-slate-700">
                          {getInitials(view.trainerName)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 text-right">
                      <h4 className="text-xl font-bold text-slate-900">{view.trainerName || "غير متوفر"}</h4>
                      {view.trainerSubtitle ? <p className="mt-1 text-sm text-slate-600">{view.trainerSubtitle}</p> : null}
                      {view.instructor?.specialties && view.instructor.specialties.length > 0 && (
                        <div className="mt-3">
                          <p className="mb-2 text-[13px] font-bold text-slate-800">التخصصات:</p>
                          <div className="flex flex-wrap gap-2">
                            {view.instructor.specialties.map((spec: string) => (
                              <span key={spec} className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                {spec}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700">
                        {view.trainerPhone ? (
                          <div className="inline-flex items-center gap-2">
                            <Phone className="h-4 w-4 text-emerald-600" />
                            {toWhatsAppLink(view.trainerPhone) ? (
                              <a
                                href={toWhatsAppLink(view.trainerPhone)!}
                                target="_blank"
                                rel="noreferrer"
                                dir="ltr"
                                className="text-emerald-700 underline-offset-2 hover:underline"
                              >
                                {view.trainerPhone}
                              </a>
                            ) : (
                              <span dir="ltr">{view.trainerPhone}</span>
                            )}
                          </div>
                        ) : null}
                        {view.trainerEmail ? (
                          <div className="inline-flex items-center gap-2">
                            <Mail className="h-4 w-4 text-blue-600" />
                            {toMailtoLink(view.trainerEmail) ? (
                              <a href={toMailtoLink(view.trainerEmail)!} className="text-blue-700 underline-offset-2 hover:underline">
                                {view.trainerEmail}
                              </a>
                            ) : (
                              <span>{view.trainerEmail}</span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {view.hasInstitute && view.institute.name !== "غير متوفر" ? (
            <section id="institute" className="scroll-mt-24">
              <SectionTitle icon={Landmark} title="المعهد المستضيف" />
              <div className="w-full rounded-[6.5px] border border-slate-200 bg-white p-4">
                <div dir="rtl" className="flex items-start justify-start gap-4 text-right">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[6.5px] bg-slate-100 md:h-20 md:w-20">
                    {view.institute.logo ? (
                      <Image
                        src={resolveImage(view.institute.logo, "/images/course-web.png")}
                        alt={view.institute.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl font-bold text-slate-700">
                        {getInitials(view.institute.name)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 text-right">
                    <h4 className="text-xl font-bold text-slate-900">{view.institute.name}</h4>
                    {view.institute.description ? (
                      <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{view.institute.description}</p>
                    ) : null}
                    {view.institute.features && view.institute.features.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-2 text-[13px] font-bold text-slate-800">مميزات المعهد:</p>
                        <div className="flex flex-wrap gap-2">
                          {view.institute.features.map((feature: string) => (
                            <span key={feature} className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {view.institute.locationUrl ? (
                      <a
                        href={view.institute.locationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline"
                      >
                        {view.institute.location}
                      </a>
                    ) : (
                      <p className="mt-2 text-sm text-slate-600">{view.institute.location}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700">
                      {view.institute.phone && view.institute.phone !== "غير متوفر" ? (
                        <div className="inline-flex items-center gap-2">
                          <Phone className="h-4 w-4 text-emerald-600" />
                          {toWhatsAppLink(view.institute.phone) ? (
                            <a
                              href={toWhatsAppLink(view.institute.phone)!}
                              target="_blank"
                              rel="noreferrer"
                              dir="ltr"
                              className="text-emerald-700 underline-offset-2 hover:underline"
                            >
                              {view.institute.phone}
                            </a>
                          ) : (
                            <span dir="ltr">{view.institute.phone}</span>
                          )}
                        </div>
                      ) : null}
                      {view.institute.email && view.institute.email !== "غير متوفر" ? (
                        <div className="inline-flex items-center gap-2">
                          <Mail className="h-4 w-4 text-blue-600" />
                          {toMailtoLink(view.institute.email) ? (
                            <a href={toMailtoLink(view.institute.email)!} className="text-blue-700 underline-offset-2 hover:underline">
                              {view.institute.email}
                            </a>
                          ) : (
                            <span>{view.institute.email}</span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </section>

      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent
          dir="rtl"
          className="w-full max-w-[640px] rounded-[6.5px] border border-slate-200 bg-white p-0 text-right text-slate-900 shadow-xl [&>button]:hidden"
        >
          <DialogHeader className="p-0">
            <div className="flex items-start justify-between p-5 pb-3">
              <div className="flex-1 text-right">
                <DialogTitle className="text-xl font-bold text-slate-900">التسجيل المبدئي</DialogTitle>
              </div>
              <DialogClose
                className="shrink-0 rounded-[6.5px] border border-red-200 bg-white p-2 text-red-500 transition hover:bg-red-50 hover:text-red-600"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="px-5 pb-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500" dir="rtl">
              {registrationFlowSteps.map((step, index) => (
                <div key={step.label} className="inline-flex items-center gap-2">
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full border px-2 ${step.active ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                  >
                    {index + 1}
                  </span>
                  <span className={step.active ? "text-slate-900" : "text-slate-500"}>{step.label}</span>
                  {index < registrationSteps.length - 1 ? <span aria-hidden="true" className="text-slate-300">·</span> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 px-5 pb-5 pt-0">
            <div className="flex items-center gap-4 rounded-[6.5px] border border-slate-200 bg-slate-50 p-4 text-right">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-blue-50 text-blue-600">
                {studentAvatar ? (
                  <Image src={studentAvatar} alt={studentName} fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-bold text-blue-700">{studentInitials}</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-slate-900">{studentName}</p>
                <div className="mt-1 flex items-center justify-start gap-2 text-sm text-slate-500">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span className="break-all">{studentEmail}</span>
                </div>
                <div className="mt-1 flex items-center justify-start gap-2 text-sm text-slate-500">
                  <Phone className="h-4 w-4 text-blue-600" />
                  {studentPhone ? <span dir="ltr">{studentPhone}</span> : <span className="text-slate-500">غير مضاف</span>}
                </div>
              </div>
            </div>

            <div className="rounded-[6.5px] border border-blue-100 bg-blue-50 p-3 text-right text-sm text-slate-600">
              ملاحظة: سيظهر الاسم والصورة والبريد الإلكتروني ورقم الهاتف {registrationRecipientLabel} صاحب الدورة.
            </div>
          </div>

          <DialogFooter className="flex-row-reverse items-center gap-3 border-t border-slate-100 p-4 sm:justify-start sm:space-x-0">
            <Button onClick={handleRegister} disabled={submitting} className="h-10 rounded-[6.5px] bg-blue-600 px-5 text-white hover:bg-blue-700">
              {submitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
              تأكيد إرسال الطلب
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-[6.5px] border border-slate-200 bg-white px-5 text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setRegisterOpen(false)
                router.push("/student/profile")
              }}
            >
              تعديل البيانات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={paymentOpen}
        onOpenChange={(open) => {
          setPaymentOpen(open)
          if (!open) {
            setPaymentFile(null)
            setPaymentError(null)
          }
        }}
      >
        <DialogContent
          dir="rtl"
          overlayClassName="bg-slate-950/45 backdrop-blur-0"
          className="w-full max-w-[820px] overflow-hidden rounded-[6.5px] border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl [&>button]:hidden"
        >
          <DialogHeader className="space-y-0 border-b border-slate-100 p-6">
            <div className="flex items-start justify-between gap-4">
              <DialogClose
                className="shrink-0 rounded-[6.5px] border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </DialogClose>
              <div className="flex-1 text-right">
                <DialogTitle className="text-xl font-bold text-slate-900">رفع سند الدفع</DialogTitle>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  أكمل التحويل البنكي إلى أحد الحسابات التالية، ثم ارفع صورة أو ملف السند للمراجعة.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 pt-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500" dir="rtl">
              {registrationSteps.map((step, index) => (
                <div
                  key={step.label}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${index === 1 ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-blue-700">
                    {index + 1}
                  </span>
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
            <div className="space-y-3 text-right md:order-1">
              <h3 className="mb-3 text-base font-bold text-slate-900">الحسابات البنكية</h3>
              {availableBankAccounts.length ? (
                <div className="space-y-3">
                  {availableBankAccounts.map((account) => {
                    const isSelected = selectedBankAccountId === account.id
                    return (
                      <div
                        key={account.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedBankAccountId(account.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            setSelectedBankAccountId(account.id)
                          }
                        }}
                        className={`w-full cursor-pointer rounded-[6.5px] border p-4 text-right transition ${isSelected
                          ? "border-blue-500 ring-2 ring-blue-100 bg-blue-50/30"
                          : "border-slate-200 bg-slate-50 hover:border-blue-300"
                          }`}
                      >
                        <div className="grid gap-2 text-sm">
                          <div className="flex items-center justify-start gap-2" dir="rtl">
                            <Landmark className="h-4 w-4 text-blue-600" />
                            <p className="font-bold text-slate-900">{account.bankName}</p>
                          </div>
                          <p className="text-slate-600">اسم المستفيد: <span className="text-slate-900">{account.accountName}</span></p>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-slate-600">
                              رقم الحساب: <span className="text-slate-900" dir="ltr">{account.accountNumber}</span>
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 rounded-[6.5px] border border-slate-200 bg-white px-3 text-xs text-slate-700 hover:bg-slate-100"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleCopy(account.accountNumber, `acc-${account.id}`)
                              }}
                            >
                              {copiedKey === `acc-${account.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              <span className="mr-1">{copiedKey === `acc-${account.id}` ? "تم النسخ" : "نسخ"}</span>
                            </Button>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-slate-600">
                              IBAN: <span className="text-slate-900" dir="ltr">{account.iban || "غير متوفر"}</span>
                            </p>
                            {account.iban ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 rounded-[6.5px] border border-slate-200 bg-white px-3 text-xs text-slate-700 hover:bg-slate-100"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleCopy(account.iban!, `iban-${account.id}`)
                                }}
                              >
                                {copiedKey === `iban-${account.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                <span className="mr-1">{copiedKey === `iban-${account.id}` ? "تم النسخ" : "نسخ"}</span>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-[6.5px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  لا توجد حسابات بنكية متاحة حاليًا، يرجى التواصل مع المدرب أو المعهد.
                </div>
              )}
            </div>

            <div className="space-y-3 text-right md:order-2">
              <h3 className="text-base font-bold text-slate-900">إرفاق سند الدفع</h3>
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    paymentFileInputRef.current?.click()
                  }
                }}
                onClick={() => paymentFileInputRef.current?.click()}
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[6.5px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-blue-500 hover:bg-blue-50/40"
              >
                {!paymentFile ? (
                  <>
                    <Upload className="h-7 w-7 text-blue-600" />
                    <p className="text-sm font-semibold text-slate-800">اسحب صورة السند هنا</p>
                    <p className="text-xs text-slate-500">أو اضغط للاختيار</p>
                    <p className="text-xs text-slate-500">JPG, PNG, WebP, PDF</p>
                  </>
                ) : (
                  <div className="relative w-full rounded-[6.5px] border border-slate-200 bg-white p-3 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setPaymentFile(null)
                      }}
                      className="absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-[6.5px] border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                      aria-label="إزالة الملف"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex items-start gap-3" dir="rtl">
                      {paymentFile.type.startsWith("image/") ? (
                        <div className="relative h-14 w-14 overflow-hidden rounded-[6.5px]">
                          <Image src={paymentPreviewUrl || ""} alt="معاينة السند" fill className="object-cover" unoptimized />
                        </div>
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-[6.5px] border border-slate-200 bg-slate-50">
                          <FileTextIcon className="h-6 w-6 text-slate-500" />
                        </div>
                      )}
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{paymentFile.name}</p>
                        <p className="text-xs text-slate-500">
                          {(paymentFile.type || "unknown").replace("application/", "")} · {formatFileSize(paymentFile.size)}
                        </p>
                        <p className="text-xs text-slate-500">اضغط لتغيير الملف</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <Input
                ref={paymentFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null
                  setPaymentError(null)
                  setPaymentFile(file)
                }}
              />

              <div className="mt-2 rounded-[6.5px] border border-blue-100 bg-blue-50/40 p-3 text-right">
                <p className="mb-1 text-slate-500">المبلغ المطلوب</p>
                <p className="text-xl font-bold text-blue-700">
                  {formatMoney(view.price)} ر.ي
                </p>
              </div>

              {paymentError ? (
                <div className="rounded-[6.5px] border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
                  {paymentError}
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="flex-row-reverse items-center gap-3 border-t border-slate-100 p-4 sm:justify-start sm:space-x-0">
            <Button
              onClick={handleSubmitPaymentProof}
              disabled={submittingPayment || !paymentFile || !availableBankAccounts.length}
              className="h-10 rounded-[6.5px] bg-blue-600 px-5 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              {submittingPayment ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
              {submittingPayment ? "جاري الرفع..." : "تأكيد رفع السند"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPaymentOpen(false)}
              className="h-10 rounded-[6.5px] border border-slate-200 bg-white px-5 text-slate-700 hover:bg-slate-50"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <HallDetailsModal 
        isOpen={isHallModalOpen} 
        onClose={setIsHallModalOpen} 
        hallId={selectedHallId} 
      />
    </div>
  )
}

