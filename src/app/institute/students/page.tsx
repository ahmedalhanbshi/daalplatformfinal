"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
export const dynamic = "force-dynamic"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Loader2, Search, BookOpen, MoreHorizontal, ChevronDown, Download, Eye, Filter, Users, Clock3, UserCheck, ReceiptText } from "lucide-react"
import { instituteService } from "@/lib/institute-service"
import { formatDate, formatNumber } from "@/lib/utils"
import { toast } from "sonner"
import { RejectionActionModal } from "@/components/institute/rejection-action-modal"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

type Enrollment = {
  id: string
  status?: string
  enrolledAt?: string
  rejectionReason?: string
  cancellationReason?: string
  student?: { id?: string; name?: string; email?: string; phone?: string; avatar?: string }
  course?: { id?: string; title?: string }
  payments?: Array<{ status?: string; amount?: number; createdAt?: string; depositSlipImage?: string; rejectionReason?: string }>
}

type StepState = "done" | "current" | "future" | "failed"
type ActionItem = { key: string; label: string; variant?: "primary" | "secondary" | "danger"; onClick: () => void }
type StudentActionMode = "stop" | "cancel"
type StudentSummary = {
  studentId: string
  student: { id?: string; name?: string; email?: string; phone?: string; avatar?: string }
  enrollments: Enrollment[]
  latestEnrollment: Enrollment
  latestDate?: string
}
type StudentsApiResponse = { students?: Array<Enrollment["student"]> }

function extractErrorMessage(err: unknown, fallback: string) {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as { response?: unknown }).response === "object"
  ) {
    const response = (err as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) return response.data.message
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}

function resolveImage(src?: string | null) {
  if (!src) return ""
  if (src.startsWith("http")) return src
  const c = src.replace(/\\/g, "/")
  return `${API_BASE_URL}${c.startsWith("/") ? "" : "/"}${c}`
}

function initials(name?: string) {
  return name?.split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]).join("") || "؟"
}
function getEnrollmentStudentKey(e: Enrollment) {
  return e.student?.id || e.student?.email || e.student?.phone || e.id
}

function getStatus(enrollment?: Enrollment) {
  return String(enrollment?.status || "").toUpperCase()
}

function getPaymentStatus(enrollment?: Enrollment) {
  return String(enrollment?.payments?.[0]?.status || "").toUpperCase()
}

function getStatusBadge(enrollment: Enrollment) {
  const s = getStatus(enrollment)
  const p = getPaymentStatus(enrollment)

  if (["ACTIVE", "COMPLETED"].includes(s)) return <Badge className="cursor-default rounded-[6.5px] bg-emerald-100 text-emerald-700 transition-none hover:bg-emerald-100">نشط</Badge>
  if (s === "PRELIMINARY") return <Badge className="cursor-default rounded-[6.5px] bg-amber-100 text-amber-700 transition-none hover:bg-amber-100">تسجيل مبدئي</Badge>
  if (s === "PRELIMINARY_APPROVED") return <Badge className="cursor-default rounded-[6.5px] bg-blue-100 text-blue-700 transition-none hover:bg-blue-100">بانتظار الدفع</Badge>
  if (s === "PENDING_PAYMENT" && p === "PENDING_REVIEW") return <Badge className="cursor-default rounded-[6.5px] bg-orange-100 text-orange-700 transition-none hover:bg-orange-100">بانتظار مراجعة الدفع</Badge>
  if (s === "PENDING_PAYMENT") return <Badge className="cursor-default rounded-[6.5px] bg-blue-100 text-blue-700 transition-none hover:bg-blue-100">بانتظار الدفع</Badge>
  if (s === "REJECT_PAYMENT" || p === "REJECTED" || s === "REJECTED" || s === "REJECT_ENROLLMENT") return <Badge className="cursor-default rounded-[6.5px] bg-rose-100 text-rose-700 transition-none hover:bg-rose-100">مرفوض</Badge>
  if (s === "CANCELLED") return <Badge className="cursor-default rounded-[6.5px] bg-slate-200 text-slate-700 transition-none hover:bg-slate-200">ملغي</Badge>
  return <Badge className="cursor-default rounded-[6.5px] bg-slate-100 text-slate-700 transition-none hover:bg-slate-100">غير محدد</Badge>
}

function getStatusLabel(status?: string, paymentStatus?: string) {
  const s = String(status || "").toUpperCase()
  const p = String(paymentStatus || "").toUpperCase()
  if (["ACTIVE", "COMPLETED"].includes(s)) return "نشط"
  if (s === "PRELIMINARY") return "تسجيل مبدئي"
  if (s === "PRELIMINARY_APPROVED") return "قبول مبدئي"
  if (s === "PENDING_PAYMENT" && p === "PENDING_REVIEW") return "بانتظار مراجعة الدفع"
  if (s === "PENDING_PAYMENT") return "بانتظار الدفع"
  if (s === "REJECT_PAYMENT" || p === "REJECTED" || s === "REJECTED" || s === "REJECT_ENROLLMENT") return "مرفوض"
  if (s === "CANCELLED") return "ملغي"
  return "غير محدد"
}

function getPaymentStatusLabel(paymentStatus?: string) {
  const p = String(paymentStatus || "").toUpperCase()
  if (p === "APPROVED") return "مؤكد"
  if (p === "PENDING_REVIEW") return "بانتظار المراجعة"
  if (p === "REJECTED") return "مرفوض"
  return "لا يوجد"
}

function getPaymentStatusBadgeClass(paymentStatus?: string) {
  const p = String(paymentStatus || "").toUpperCase()
  if (p === "APPROVED") return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
  if (p === "PENDING_REVIEW") return "bg-orange-100 text-orange-700 hover:bg-orange-100"
  if (p === "REJECTED") return "bg-rose-100 text-rose-700 hover:bg-rose-100"
  return "bg-slate-100 text-slate-700 hover:bg-slate-100"
}

function getTimelineState(enrollment: Enrollment): [StepState, StepState] {
  const s = getStatus(enrollment)
  const p = getPaymentStatus(enrollment)

  if (s === "PRELIMINARY") return ["current", "future"]
  if (s === "PRELIMINARY_APPROVED") return ["done", "future"]
  if (s === "PENDING_PAYMENT" && p === "PENDING_REVIEW") return ["done", "current"]
  if (s === "PENDING_PAYMENT") return ["done", "future"]
  if (p === "APPROVED" || s === "ACTIVE" || s === "COMPLETED") return ["done", "done"]
  if (s === "REJECT_PAYMENT" || p === "REJECTED") return ["done", "failed"]
  if (s === "REJECTED" || s === "REJECT_ENROLLMENT" || s === "CANCELLED") return ["failed", "future"]
  return ["future", "future"]
}

function dotClass(state: StepState) {
  if (state === "done") return "bg-emerald-500"
  if (state === "current") return "bg-orange-500"
  if (state === "failed") return "bg-rose-500"
  return "bg-slate-300"
}

function lineClass(a: StepState, b: StepState) {
  if (a === "failed" || b === "failed") return "bg-rose-300"
  if (a === "done" && (b === "done" || b === "current")) return "bg-emerald-500"
  return "bg-slate-300"
}

function RequestTimeline({ enrollment }: { enrollment: Enrollment }) {
  const [approvalStep, paymentStep] = getTimelineState(enrollment)
  return (
    <div className="flex w-[180px] flex-col gap-1.5" dir="rtl">
      <div className="grid grid-cols-2 text-center text-[11px] leading-none text-slate-600">
        <span className="whitespace-nowrap">قبول مبدئي</span>
        <span className="whitespace-nowrap">تأكيد الدفع</span>
      </div>
      <div className="flex h-2.5 w-full items-center justify-center" dir="rtl">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass(approvalStep)}`} />
        <span className={`mx-1.5 h-0.5 max-w-[90px] flex-1 ${lineClass(approvalStep, paymentStep)}`} />
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass(paymentStep)}`} />
      </div>
    </div>
  )
}

function InstituteStudentsRegistrationsPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlCourseId = searchParams.get("courseId") || ""
  const [activeTab, setActiveTab] = useState("students")
  const [loading, setLoading] = useState(true)
  const [studentsSearch, setStudentsSearch] = useState("")
  const [requestsSearch, setRequestsSearch] = useState("")
  const [students, setStudents] = useState<Array<Enrollment["student"]>>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [actionId, setActionId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Enrollment | null>(null)
  const [selectedStudentEnrollment, setSelectedStudentEnrollment] = useState<Enrollment | null>(null)
  const [messageOpen, setMessageOpen] = useState(false)
  const [reasonOpen, setReasonOpen] = useState(false)
  const [reasonMode, setReasonMode] = useState<StudentActionMode>("stop")
  const [reasonText, setReasonText] = useState("")
  const [selectedCourseEnrollmentId, setSelectedCourseEnrollmentId] = useState("")
  const [coursesOpen, setCoursesOpen] = useState(false)
  const [selectedStudentSummary, setSelectedStudentSummary] = useState<StudentSummary | null>(null)
  const [requestStudentFilter, setRequestStudentFilter] = useState<{ id: string; name: string } | null>(null)
  const [requestCourseFilter, setRequestCourseFilter] = useState<{ id?: string; title?: string } | null>(null)
  const [messageText, setMessageText] = useState("")
  const [messageTitle, setMessageTitle] = useState("رسالة للطالب")
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectType, setRejectType] = useState<"payment" | "enrollment">("enrollment")
  const [rejectTarget, setRejectTarget] = useState<Enrollment | null>(null)
  const [studentsFiltersOpen, setStudentsFiltersOpen] = useState(false)
  const [requestsFiltersOpen, setRequestsFiltersOpen] = useState(false)

  const [studentsCourseFilter, setStudentsCourseFilter] = useState("all")
  const [studentStatusFilter, setStudentStatusFilter] = useState("all")
  const [studentsDateFilter, setStudentsDateFilter] = useState("all")
  const [studentsSort, setStudentsSort] = useState("latest")

  const [requestsCourseFilter, setRequestsCourseFilter] = useState("all")
  const [requestStatusFilter, setRequestStatusFilter] = useState("all")
  const [requestPaymentFilter, setRequestPaymentFilter] = useState("all")
  const [requestsDateFilter, setRequestsDateFilter] = useState("all")
  const [requestsNeedsActionOnly, setRequestsNeedsActionOnly] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [s, e] = await Promise.all([instituteService.getStudents(), instituteService.getEnrollments()])
      const studentsRes = s as StudentsApiResponse
      setStudents(Array.isArray(studentsRes?.students) ? studentsRes.students : [])
      setEnrollments(Array.isArray(e) ? e : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل تحميل البيانات")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "requests") setActiveTab("requests")
    else if (tab === "students") setActiveTab("students")
  }, [searchParams])

  useEffect(() => {
    if (!urlCourseId) return
    setStudentsCourseFilter(urlCourseId)
    setRequestsCourseFilter(urlCourseId)
  }, [urlCourseId])

  const coursesOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of enrollments) {
      if (!e.course?.id) continue
      map.set(e.course.id, e.course.title || "دورة بدون عنوان")
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }))
  }, [enrollments])

  const selectedStudentsCourseName = useMemo(() => {
    if (studentsCourseFilter === "all") return ""
    if (loading) return "جاري تحميل اسم الدورة..."
    return coursesOptions.find((c) => c.id === studentsCourseFilter)?.title || "دورة غير معروفة"
  }, [studentsCourseFilter, loading, coursesOptions])

  const studentsCourseFilterOptions = useMemo(() => {
    const hasSelected = studentsCourseFilter !== "all" && coursesOptions.some((c) => c.id === studentsCourseFilter)
    if (studentsCourseFilter !== "all" && !hasSelected) {
      return [...coursesOptions, { id: studentsCourseFilter, title: loading ? "جاري تحميل اسم الدورة..." : "دورة غير معروفة" }]
    }
    return coursesOptions
  }, [coursesOptions, studentsCourseFilter, loading])

  const clearStudentsCourseFromUrl = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("courseId")
    const next = params.toString()
    setStudentsCourseFilter("all")
    router.replace(next ? `${pathname}?${next}` : pathname)
  }


  const stats = useMemo(() => {
    const totalStudents = students.length
    const pending = enrollments.filter((x) => ["PRELIMINARY", "PRELIMINARY_APPROVED", "PENDING_PAYMENT"].includes(getStatus(x))).length
    const active = enrollments.filter((x) => ["ACTIVE", "COMPLETED"].includes(getStatus(x))).length
    const paymentReview = enrollments.filter((x) => getPaymentStatus(x) === "PENDING_REVIEW").length
    return { totalStudents, pending, active, paymentReview }
  }, [students.length, enrollments])
  const pendingRegistrationsCount = useMemo(() => {
    return enrollments.filter((x) => {
      const s = getStatus(x)
      const p = getPaymentStatus(x)
      return s === "PRELIMINARY" || p === "PENDING_REVIEW"
    }).length
  }, [enrollments])

  const activeStudentsRows = useMemo(() => enrollments.filter((e) => ["ACTIVE", "COMPLETED"].includes(getStatus(e))), [enrollments])
  const requestRows = useMemo(() => enrollments, [enrollments])

  const matchesDateFilter = (rawDate?: string, filter?: string) => {
    if (!rawDate || !filter || filter === "all") return true
    const date = new Date(rawDate)
    if (Number.isNaN(date.getTime())) return false
    const now = new Date()
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    if (filter === "today") return date >= startToday
    if (filter === "last7") return date.getTime() >= now.getTime() - 7 * 24 * 60 * 60 * 1000
    if (filter === "last30") return date.getTime() >= now.getTime() - 30 * 24 * 60 * 60 * 1000
    if (filter === "thisMonth") return date >= startMonth
    return true
  }

  const getStudentOverallStatusKey = useCallback((row: StudentSummary) => {
    const hasPending = enrollments.some((x) => {
      const sameStudent = (x.student?.id || x.student?.email || x.student?.phone) === row.studentId
      if (!sameStudent) return false
      const s = getStatus(x)
      const p = getPaymentStatus(x)
      return ["PRELIMINARY", "PRELIMINARY_APPROVED", "PENDING_PAYMENT"].includes(s) || p === "PENDING_REVIEW"
    })
    if (hasPending) return "pending_review"
    const hasActive = row.enrollments.some((x) => ["ACTIVE", "COMPLETED"].includes(getStatus(x)))
    if (hasActive) return "active"
    const hasCancelled = row.enrollments.some((x) => getStatus(x) === "CANCELLED")
    if (hasCancelled) return "cancelled"
    return "stopped"
  }, [enrollments])

  const filteredStudentsRows = useMemo<StudentSummary[]>(() => {
    const grouped = new Map<string, StudentSummary>()
    for (const e of activeStudentsRows) {
      const studentId = getEnrollmentStudentKey(e)
      if (!grouped.has(studentId)) {
        grouped.set(studentId, {
          studentId,
          student: e.student || {},
          enrollments: [e],
          latestEnrollment: e,
          latestDate: e.enrolledAt,
        })
        continue
      }
      const item = grouped.get(studentId)!
      item.enrollments.push(e)
      const prev = item.latestDate ? new Date(item.latestDate).getTime() : 0
      const curr = e.enrolledAt ? new Date(e.enrolledAt).getTime() : 0
      if (curr >= prev) {
        item.latestDate = e.enrolledAt
        item.latestEnrollment = e
      }
    }
    let rows = Array.from(grouped.values())

    if (studentsCourseFilter !== "all") {
      rows = rows.filter((row) => row.enrollments.some((x) => x.course?.id === studentsCourseFilter))
    }
    if (studentStatusFilter !== "all") {
      rows = rows.filter((row) => getStudentOverallStatusKey(row) === studentStatusFilter)
    }
    if (studentsDateFilter !== "all") {
      rows = rows.filter((row) => matchesDateFilter(row.latestDate, studentsDateFilter))
    }

    rows = rows.sort((a, b) => {
      if (studentsSort === "name_asc") return String(a.student?.name || "").localeCompare(String(b.student?.name || ""), "ar")
      if (studentsSort === "name_desc") return String(b.student?.name || "").localeCompare(String(a.student?.name || ""), "ar")
      const ad = a.latestDate ? new Date(a.latestDate).getTime() : 0
      const bd = b.latestDate ? new Date(b.latestDate).getTime() : 0
      if (studentsSort === "oldest") return ad - bd
      return bd - ad
    })

    const q = studentsSearch.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      [
        row.student?.name,
        row.student?.email,
        row.student?.phone,
        ...row.enrollments.map((x) => x.course?.title),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
  }, [activeStudentsRows, studentsSearch, studentsCourseFilter, studentStatusFilter, studentsDateFilter, studentsSort, getStudentOverallStatusKey])

  const filteredRequestRows = useMemo(() => {
    const q = requestsSearch.trim().toLowerCase()
    const bySearch = !q
      ? requestRows
      : requestRows.filter((e) => [e.student?.name, e.student?.email, e.student?.phone, e.course?.title].filter(Boolean).join(" ").toLowerCase().includes(q))

    return bySearch.filter((e) => {
      if (requestStudentFilter && getEnrollmentStudentKey(e) !== requestStudentFilter.id) return false
      if (requestsCourseFilter !== "all" && e.course?.id !== requestsCourseFilter) return false
      if (requestCourseFilter?.id && e.course?.id !== requestCourseFilter.id) return false
      if (!requestCourseFilter?.id && requestCourseFilter?.title && e.course?.title !== requestCourseFilter.title) return false
      if (requestStatusFilter !== "all") {
        const s = getStatus(e)
        const p = getPaymentStatus(e)
        const statusKey =
          s === "PRELIMINARY"
            ? "preliminary"
            : s === "PRELIMINARY_APPROVED"
              ? "awaiting_payment"
              : s === "PENDING_PAYMENT" && p === "PENDING_REVIEW"
                ? "payment_review"
                : p === "APPROVED" || s === "ACTIVE" || s === "COMPLETED"
                  ? "payment_confirmed"
                  : s === "REJECT_PAYMENT" || s === "REJECTED" || s === "REJECT_ENROLLMENT" || p === "REJECTED"
                    ? "rejected"
                    : "other"
        if (statusKey !== requestStatusFilter) return false
      }
      if (requestPaymentFilter !== "all") {
        const s = getStatus(e)
        const p = getPaymentStatus(e)
        const paymentKey =
          !e.payments?.length
            ? "none"
            : s === "PRELIMINARY_APPROVED" || s === "PENDING_PAYMENT"
              ? "awaiting_slip"
              : p === "PENDING_REVIEW"
                ? "slip_review"
                : p === "APPROVED"
                  ? "approved"
                  : p === "REJECTED"
                    ? "rejected"
                    : "none"
        if (paymentKey !== requestPaymentFilter) return false
      }
      if (requestsDateFilter !== "all" && !matchesDateFilter(e.enrolledAt, requestsDateFilter)) return false
      if (requestsNeedsActionOnly) {
        const s = getStatus(e)
        const p = getPaymentStatus(e)
        const needsAction = s === "PRELIMINARY" || p === "PENDING_REVIEW" || s === "REJECT_PAYMENT" || s === "REJECT_ENROLLMENT" || s === "REJECTED"
        if (!needsAction) return false
      }
      return true
    }).sort((a, b) => {
      const ad = a.enrolledAt ? new Date(a.enrolledAt).getTime() : 0
      const bd = b.enrolledAt ? new Date(b.enrolledAt).getTime() : 0
      return bd - ad
    })
  }, [requestRows, requestsSearch, requestStudentFilter, requestCourseFilter, requestsCourseFilter, requestStatusFilter, requestPaymentFilter, requestsDateFilter, requestsNeedsActionOnly])

  const studentsActiveFiltersCount = useMemo(() => {
    let c = 0
    if (studentsCourseFilter !== "all") c += 1
    if (studentStatusFilter !== "all") c += 1
    if (studentsDateFilter !== "all") c += 1
    if (studentsSort !== "latest") c += 1
    if (studentsSearch.trim()) c += 1
    return c
  }, [studentsCourseFilter, studentStatusFilter, studentsDateFilter, studentsSort, studentsSearch])

  const requestsActiveFiltersCount = useMemo(() => {
    let c = 0
    if (requestsCourseFilter !== "all") c += 1
    if (requestStatusFilter !== "all") c += 1
    if (requestPaymentFilter !== "all") c += 1
    if (requestsDateFilter !== "all") c += 1
    if (requestsNeedsActionOnly) c += 1
    if (requestsSearch.trim()) c += 1
    return c
  }, [requestsCourseFilter, requestStatusFilter, requestPaymentFilter, requestsDateFilter, requestsNeedsActionOnly, requestsSearch])

  const resetStudentsFilters = () => {
    setStudentsCourseFilter("all")
    setStudentStatusFilter("all")
    setStudentsDateFilter("all")
    setStudentsSort("latest")
    setStudentsSearch("")
  }

  const resetRequestsFilters = () => {
    setRequestsCourseFilter("all")
    setRequestStatusFilter("all")
    setRequestPaymentFilter("all")
    setRequestsDateFilter("all")
    setRequestsNeedsActionOnly(false)
    setRequestsSearch("")
    setRequestStudentFilter(null)
    setRequestCourseFilter(null)
  }

  const withAction = async (id: string, fn: () => Promise<void>) => {
    try {
      setActionId(id)
      await fn()
      await load()
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "فشل تنفيذ الإجراء"))
      throw err
    } finally {
      setActionId(null)
    }
  }

  const approvePreliminary = async (e: Enrollment) => withAction(e.id, async () => {
    await instituteService.updateEnrollmentStatus(e.id, "ACTIVE")
    toast.success("تم قبول الطلب")
  })

  const confirmPayment = async (e: Enrollment) => withAction(e.id, async () => {
    await instituteService.updateEnrollmentStatus(e.id, "ACTIVE")
    toast.success("تم تأكيد الدفع")
  })

  const openReject = (e: Enrollment, type: "payment" | "enrollment") => { setRejectTarget(e); setRejectType(type); setRejectOpen(true) }
  const getSlipBaseName = (e: Enrollment) => `سند دفع - ${(e.student?.name || "طالب").trim()}`
  const getExtFromBlob = (blob: Blob) => {
    const type = (blob.type || "").toLowerCase()
    if (type.includes("jpeg")) return "jpg"
    if (type.includes("png")) return "png"
    if (type.includes("webp")) return "webp"
    if (type.includes("gif")) return "gif"
    if (type.includes("pdf")) return "pdf"
    return "pdf"
  }
  const openSlip = async (e: Enrollment) => {
    const url = resolveImage(e.payments?.[0]?.depositSlipImage)
    if (!url) return toast.error("لا يوجد سند دفع")
    const previewWindow = window.open("", "_blank")
    if (!previewWindow) return toast.error("يرجى السماح بفتح النوافذ المنبثقة")
    previewWindow.document.title = getSlipBaseName(e)
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error("تعذر فتح السند")
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const isPdf = (blob.type || "").toLowerCase().includes("pdf")
      const safeTitle = getSlipBaseName(e).replace(/"/g, "&quot;")
      const fileName = `${getSlipBaseName(e)}.${getExtFromBlob(blob)}`
      previewWindow.document.write(`
        <!doctype html>
        <html lang="ar" dir="rtl">
        <head><meta charset="utf-8" /><title>${safeTitle}</title></head>
        <body style="margin:0;background:#111;display:flex;flex-direction:column;height:100vh;">
          <div style="padding:8px 12px;background:#fff;display:flex;justify-content:space-between;align-items:center;">
            <strong style="font-family:Arial,sans-serif;">${safeTitle}</strong>
            <a href="${objectUrl}" download="${fileName}" style="font-family:Arial,sans-serif;text-decoration:none;">تحميل السند</a>
          </div>
          ${isPdf
            ? `<iframe src="${objectUrl}" style="border:0;flex:1;width:100%;"></iframe>`
            : `<img src="${objectUrl}" alt="${safeTitle}" style="max-width:100%;max-height:calc(100vh - 46px);margin:auto;object-fit:contain;" />`}
        </body>
        </html>
      `)
      previewWindow.document.close()
      previewWindow.addEventListener("beforeunload", () => URL.revokeObjectURL(objectUrl), { once: true })
    } catch (err) {
      previewWindow.close()
      toast.error(err instanceof Error ? err.message : "فشل فتح السند")
    }
  }
  const downloadSlip = async (e: Enrollment) => {
    const url = resolveImage(e.payments?.[0]?.depositSlipImage)
    if (!url) return toast.error("لا يوجد سند دفع")
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error("تعذر تنزيل السند")
      const blob = await response.blob()
      const fileName = `${getSlipBaseName(e)}.${getExtFromBlob(blob)}`
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل تنزيل السند")
    }
  }
  const remindPayment = () => toast.success("تم إرسال تذكير بالدفع")
  const openStudentRequests = (row: StudentSummary, course?: Enrollment["course"]) => {
    setActiveTab("requests")
    setRequestStudentFilter({ id: row.studentId, name: row.student?.name || "طالب" })
    if (course) setRequestCourseFilter({ id: course.id, title: course.title })
    else setRequestCourseFilter(null)
  }
  const openStudentCourses = (row: StudentSummary) => {
    setSelectedStudentSummary(row)
    setCoursesOpen(true)
  }
  const openCourseInExplore = (en: Enrollment) => {
    if (!en.course?.id) return toast.error("تعذر تحديد الدورة")
    setCoursesOpen(false)
    router.push(`/trainer/explore/course/${en.course.id}`)
  }
  const openMessageModal = (e: Enrollment) => {
    setSelectedStudentEnrollment(e)
    setMessageText("")
    setMessageTitle("")
    setMessageOpen(true)
  }
  const openReasonModal = (e: Enrollment, mode: StudentActionMode) => {
    setSelectedStudentEnrollment(e)
    setReasonMode(mode)
    setReasonText("")
    setSelectedCourseEnrollmentId(e.id)
    setReasonOpen(true)
  }
  const openReasonByStudent = (row: StudentSummary, mode: StudentActionMode) => {
    setSelectedStudentSummary(row)
    setReasonMode(mode)
    setReasonText("")
    setSelectedCourseEnrollmentId(row.latestEnrollment.id)
    setReasonOpen(true)
  }
  const submitReasonAction = async () => {
    const targetId = selectedCourseEnrollmentId || selectedStudentEnrollment?.id
    if (!targetId) return
    if (!reasonText.trim()) return toast.error("يرجى كتابة السبب")
    const reason = reasonText.trim()
    await withAction(targetId, async () => {
      await instituteService.updateEnrollmentStatus(targetId, "CANCELLED", reasonMode === "stop" ? `إيقاف: ${reason}` : `إلغاء: ${reason}`)
    })
    toast.success(reasonMode === "stop" ? "تم إيقاف التسجيل" : "تم إلغاء التسجيل")
    setReasonOpen(false)
  }
  const submitStudentMessage = async () => {
    if (!selectedStudentEnrollment?.student?.id) return
    if (!messageTitle.trim()) return toast.error("يرجى كتابة عنوان الرسالة")
    if (!messageText.trim()) return toast.error("يرجى كتابة الرسالة")
    await instituteService.sendStudentAnnouncement({
      title: messageTitle.trim(),
      message: messageText.trim(),
      recipientIds: [selectedStudentEnrollment.student.id],
    })
    toast.success("تم إرسال الرسالة")
    setMessageOpen(false)
  }

  const actionButtonClass = (variant: ActionItem["variant"]) => {
    if (variant === "primary") return "bg-blue-600 text-white hover:bg-blue-700"
    if (variant === "danger") return "border-rose-200 text-rose-700 hover:bg-rose-50"
    return "border-slate-200 text-slate-700 hover:bg-slate-50"
  }
  const getStudentOverallBadge = (row: StudentSummary) => {
    const hasPending = enrollments.some((x) => {
      const sameStudent = (x.student?.id || x.student?.email || x.student?.phone) === row.studentId
      if (!sameStudent) return false
      const s = getStatus(x)
      const p = getPaymentStatus(x)
      return ["PRELIMINARY", "PRELIMINARY_APPROVED", "PENDING_PAYMENT"].includes(s) || p === "PENDING_REVIEW"
    })
    if (hasPending) return <Badge className="cursor-default rounded-[6.5px] bg-blue-100 text-blue-700 transition-none hover:bg-blue-100">لديه طلبات قيد المراجعة</Badge>

    const hasActive = row.enrollments.some((x) => ["ACTIVE", "COMPLETED"].includes(getStatus(x)))
    if (hasActive) return <Badge className="cursor-default rounded-[6.5px] bg-emerald-100 text-emerald-700 transition-none hover:bg-emerald-100">نشط</Badge>

    const hasCancelled = row.enrollments.some((x) => getStatus(x) === "CANCELLED")
    if (hasCancelled) return <Badge className="cursor-default rounded-[6.5px] bg-slate-200 text-slate-700 transition-none hover:bg-slate-200">ملغي</Badge>

    return <Badge className="cursor-default rounded-[6.5px] bg-amber-100 text-amber-700 transition-none hover:bg-amber-100">موقوف</Badge>
  }

  if (loading) return <div className="flex min-h-[300px] items-center justify-center" dir="rtl"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>

  return (
    <div className="mx-auto max-w-7xl space-y-3" dir="rtl">
      <Card className="rounded-[6.5px] border border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-3 p-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900">إدارة الطلاب والتسجيلات</h1>
            <p className="text-sm text-slate-600">تابع الطلاب وطلبات التسجيل والدفع من مكان واحد.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <div className="rounded-[6.5px] border border-slate-200 bg-white p-4">
              <div className="flex flex-row-reverse items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[6.5px] bg-blue-50 text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">إجمالي الطلاب</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalStudents}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[6.5px] border border-slate-200 bg-white p-4">
              <div className="flex flex-row-reverse items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[6.5px] bg-orange-50 text-orange-600">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">طلبات قيد المتابعة</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[6.5px] border border-slate-200 bg-white p-4">
              <div className="flex flex-row-reverse items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[6.5px] bg-emerald-50 text-emerald-600">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">طلاب نشطون</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[6.5px] border border-slate-200 bg-white p-4">
              <div className="flex flex-row-reverse items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[6.5px] bg-amber-50 text-amber-600">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">مدفوعات للمراجعة</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.paymentReview}</p>
                </div>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="space-y-3">
            <TabsList className="grid h-11 w-full grid-cols-2 rounded-[6.5px] bg-slate-100 p-1">
              <TabsTrigger value="students" className="h-full rounded-[6.5px] text-sm text-slate-700 data-[state=active]:border data-[state=active]:border-blue-200 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                الطلاب
              </TabsTrigger>
              <TabsTrigger value="requests" className="h-full rounded-[6.5px] text-sm text-slate-700 data-[state=active]:border data-[state=active]:border-blue-200 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                <span className="inline-flex items-center gap-2">
                  طلبات التسجيل والدفع
                  {pendingRegistrationsCount > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-5 text-white">
                      {pendingRegistrationsCount > 99 ? "99+" : pendingRegistrationsCount}
                    </span>
                  ) : null}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="students" className="space-y-3">
              <div className="flex w-full items-center gap-2 lg:hidden">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={studentsSearch} onChange={(e) => setStudentsSearch(e.target.value)} className="h-10 rounded-[6.5px] border-slate-200 pr-9" placeholder="ابحث باسم الطالب، الدورة، البريد، أو رقم الجوال..." />
                </div>

                <Button type="button" variant="outline" className="h-10 rounded-[6.5px] px-3 text-xs md:hidden" onClick={() => setStudentsFiltersOpen(true)}>
                  <Filter className="ml-1 h-3.5 w-3.5" />
                  الفلاتر{studentsActiveFiltersCount > 0 ? ` (${studentsActiveFiltersCount})` : ""}
                </Button>

              </div>

              <div className="hidden w-full items-center gap-2 [direction:rtl] lg:grid lg:grid-cols-[minmax(300px,1fr)_140px_140px_140px_140px_105px]">
                <div className="relative min-w-0">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={studentsSearch} onChange={(e) => setStudentsSearch(e.target.value)} className="h-10 w-full min-w-0 rounded-[6.5px] border-slate-200 pr-9" placeholder="ابحث باسم الطالب، الدورة، البريد، أو رقم الجوال..." />
                </div>

                <select value={studentsCourseFilter} onChange={(e) => setStudentsCourseFilter(e.target.value)} className="h-10 w-full min-w-0 rounded-[6.5px] border border-slate-200 bg-white px-2 text-sm text-right outline-none focus:border-blue-400">
                  <option value="all">الدورة: الكل</option>
                  {studentsCourseFilterOptions.map((c) => <option key={`student-course-filter-${c.id}`} value={c.id}>{c.title}</option>)}
                </select>
                <select value={studentStatusFilter} onChange={(e) => setStudentStatusFilter(e.target.value)} className="h-10 w-full min-w-0 rounded-[6.5px] border border-slate-200 bg-white px-2 text-sm text-right outline-none focus:border-blue-400">
                  <option value="all">حالة الطالب: الكل</option>
                  <option value="active">نشط</option>
                  <option value="stopped">موقوف</option>
                  <option value="cancelled">ملغي</option>
                  <option value="pending_review">لديه طلبات قيد المراجعة</option>
                </select>
                <select value={studentsDateFilter} onChange={(e) => setStudentsDateFilter(e.target.value)} className="h-10 w-full min-w-0 rounded-[6.5px] border border-slate-200 bg-white px-2 text-sm text-right outline-none focus:border-blue-400">
                  <option value="all">تاريخ الانضمام: الكل</option>
                  <option value="today">اليوم</option>
                  <option value="last7">آخر 7 أيام</option>
                  <option value="last30">آخر 30 يوم</option>
                  <option value="thisMonth">هذا الشهر</option>
                </select>
                <select value={studentsSort} onChange={(e) => setStudentsSort(e.target.value)} className="h-10 w-full min-w-0 rounded-[6.5px] border border-slate-200 bg-white px-2 text-sm text-right outline-none focus:border-blue-400">
                  <option value="latest">الترتيب: الأحدث أولًا</option>
                  <option value="oldest">الأقدم أولًا</option>
                  <option value="name_asc">الاسم أ-ي</option>
                  <option value="name_desc">الاسم ي-أ</option>
                </select>

                <Button type="button" variant="outline" className="h-10 w-full rounded-[6.5px] px-2 text-sm font-semibold whitespace-nowrap" onClick={resetStudentsFilters}>
                  إعادة ضبط
                  {studentsActiveFiltersCount > 0 ? <span className="mr-1 rounded-full bg-slate-100 px-1.5 text-[11px]">{studentsActiveFiltersCount}</span> : null}
                </Button>
              </div>
              {studentsCourseFilter !== "all" ? (
                <div className="flex items-center justify-between gap-2 rounded-[6.5px] border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
                  <p className="text-right text-blue-800">
                    يتم عرض طلاب دورة: <span className="font-semibold">{selectedStudentsCourseName}</span>
                  </p>
                  <Button type="button" variant="outline" className="h-8 rounded-[6.5px] border-blue-200 px-3 text-xs font-semibold text-blue-700 hover:bg-white" onClick={clearStudentsCourseFromUrl}>
                    عرض كل الطلاب
                  </Button>
                </div>
              ) : null}
              <div className="hidden overflow-x-auto rounded-[6.5px] border border-slate-200 lg:block">
                <div className="grid grid-cols-[minmax(280px,1.45fr)_minmax(260px,1.25fr)_minmax(160px,0.85fr)_minmax(150px,0.85fr)_minmax(230px,1fr)] items-center gap-3 bg-slate-50 px-3.5 py-3 text-[13px] font-semibold text-slate-700 [direction:rtl]">
                  <div className="w-full text-right">الطالب</div>
                  <div className="text-center">الدورات المسجل بها</div>
                  <div className="text-center">حالة الطالب</div>
                  <div className="text-center">آخر انضمام</div>
                  <div className="text-center">الإجراءات</div>
                </div>
                <div className="space-y-2 p-2">
                  {filteredStudentsRows.map((row) => (
                    <div key={`active-${row.studentId}`} className="grid grid-cols-[minmax(280px,1.45fr)_minmax(260px,1.25fr)_minmax(160px,0.85fr)_minmax(150px,0.85fr)_minmax(230px,1fr)] items-center gap-3 rounded-[6.5px] border border-slate-100 bg-white px-3.5 py-3 text-sm [direction:rtl]">
                      <section className="w-full justify-self-stretch">
                        <div dir="rtl" className="flex w-full items-center justify-start gap-3 text-right">
                          <Avatar className="h-10 w-10 shrink-0 rounded-[6.5px] border border-slate-200">
                            <AvatarImage src={resolveImage(row.student?.avatar)} />
                            <AvatarFallback>{initials(row.student?.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex min-w-0 flex-col items-start text-right">
                            <p className="truncate text-sm font-semibold leading-5 text-slate-900">{row.student?.name || "-"}</p>
                            <p className="truncate text-sm leading-5 text-slate-500">{row.student?.email || "-"}</p>
                            <p className="truncate text-sm leading-5 text-slate-500">{row.student?.phone || "-"}</p>
                          </div>
                        </div>
                      </section>
                      <section className="justify-self-center text-center text-sm text-slate-700">
                        <Badge variant="outline" className="mb-1 rounded-[6.5px] border-blue-200 text-blue-700">
                          {row.enrollments.length} {row.enrollments.length === 1 ? "دورة" : "دورات"}
                        </Badge>
                        <div className="space-y-0.5 text-xs text-slate-600">
                          {row.enrollments.slice(0, 2).map((en) => (
                            <p key={`course-${en.id}`} className="truncate">
                              <BookOpen className="ml-1 inline h-3.5 w-3.5 text-blue-500" />
                              {en.course?.title || "-"}
                            </p>
                          ))}
                          {row.enrollments.length > 2 ? (
                            <button type="button" className="text-xs font-semibold text-blue-600 hover:underline" onClick={() => openStudentCourses(row)}>
                              عرض الكل
                            </button>
                          ) : null}
                        </div>
                      </section>
                      <section className="justify-self-center">{getStudentOverallBadge(row)}</section>
                      <section className="justify-self-center text-center text-xs text-slate-700">{row.latestDate ? formatDate(row.latestDate) : "-"}</section>
                      <section className="flex w-full items-center justify-center gap-2">
                        <DropdownMenu dir="rtl">
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-9 rounded-[6.5px] border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
                              <ChevronDown className="ml-1 h-4 w-4 text-slate-500" />
                              الإجراءات
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="rounded-[6.5px]">
                            <DropdownMenuItem onClick={() => openStudentCourses(row)}>عرض الدورات</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openStudentRequests(row)}>عرض الدفع</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openMessageModal(row.latestEnrollment)}>إرسال رسالة</DropdownMenuItem>

                            <DropdownMenuItem onClick={() => openReasonByStudent(row, "cancel")} className="text-rose-700">إلغاء تسجيل من دورة</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </section>
                    </div>
                  ))}
                  {filteredStudentsRows.length === 0 && <div className="rounded-[6.5px] border border-slate-100 bg-white px-3 py-10 text-center text-slate-500">لا يوجد طلاب نشطون</div>}
                </div>
              </div>

              <div className="space-y-2 lg:hidden">
                {filteredStudentsRows.map((row) => (
                  <div key={`m-active-${row.studentId}`} className="rounded-[6.5px] border border-slate-200 bg-white px-3.5 py-3 text-sm">
                    <div className="flex w-full flex-row items-center justify-end gap-3 text-right">
                      <Avatar className="h-10 w-10 shrink-0 rounded-[6.5px] border border-slate-200">
                        <AvatarImage src={resolveImage(row.student?.avatar)} />
                        <AvatarFallback>{initials(row.student?.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col items-start text-right">
                        <p className="truncate leading-5 font-semibold">{row.student?.name || "-"}</p>
                        <p className="truncate text-sm leading-5 text-slate-500">{row.student?.email || "-"}</p>
                        <p className="truncate text-sm leading-5 text-slate-500">{row.student?.phone || "-"}</p>
                      </div>
                    </div>
                    <div className="mt-2 rounded-[6.5px] bg-slate-50 p-2 text-right">
                      <p className="text-xs font-semibold text-blue-700">{row.enrollments.length} {row.enrollments.length === 1 ? "دورة" : "دورات"}</p>
                      {row.enrollments.slice(0, 2).map((en) => (
                        <p key={`m-course-${en.id}`} className="text-xs text-slate-700"><BookOpen className="ml-1 inline h-3.5 w-3.5 text-blue-500" />{en.course?.title || "-"}</p>
                      ))}
                      {row.enrollments.length > 2 ? <button type="button" className="mt-1 text-xs font-semibold text-blue-600" onClick={() => openStudentCourses(row)}>عرض الكل</button> : null}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                      <span>{getStudentOverallBadge(row)}</span>
                      <span>{row.latestDate ? formatDate(row.latestDate) : "-"}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <DropdownMenu dir="rtl">
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="h-9 rounded-[6.5px] border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
                            <ChevronDown className="ml-1 h-4 w-4 text-slate-500" />
                            الإجراءات
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-[6.5px]">
                          <DropdownMenuItem onClick={() => openStudentCourses(row)}>عرض الدورات</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openStudentRequests(row)}>عرض الدفع</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openMessageModal(row.latestEnrollment)}>إرسال رسالة</DropdownMenuItem>

                          <DropdownMenuItem onClick={() => openReasonByStudent(row, "cancel")} className="text-rose-700">إلغاء تسجيل من دورة</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
                {filteredStudentsRows.length === 0 && <div className="rounded-[6.5px] border border-slate-100 bg-white px-3 py-10 text-center text-slate-500">لا يوجد طلاب نشطون</div>}
              </div>
            </TabsContent>

            <TabsContent value="requests" className="space-y-3">
              {requestStudentFilter ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-[6.5px] border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
                  <p className="text-blue-800">عرض نتائج الطالب: <span className="font-semibold">{requestStudentFilter.name}</span>{requestCourseFilter?.title ? ` - ${requestCourseFilter.title}` : ""}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-[6.5px] border-blue-200 px-3 text-xs font-semibold text-blue-700 hover:bg-white"
                    onClick={() => { setRequestStudentFilter(null); setRequestCourseFilter(null) }}
                  >
                    إزالة الفلتر
                  </Button>
                </div>
              ) : null}
              <div className="flex w-full items-center gap-2 lg:hidden">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={requestsSearch} onChange={(e) => setRequestsSearch(e.target.value)} className="h-10 rounded-[6.5px] border-slate-200 pr-9" placeholder="ابحث باسم الطالب، الدورة، البريد، أو رقم الجوال..." />
                </div>

                <Button type="button" variant="outline" className="h-10 rounded-[6.5px] px-3 text-xs md:hidden" onClick={() => setRequestsFiltersOpen(true)}>
                  <Filter className="ml-1 h-3.5 w-3.5" />
                  الفلاتر{requestsActiveFiltersCount > 0 ? ` (${requestsActiveFiltersCount})` : ""}
                </Button>

              </div>

              <div className="hidden w-full items-center gap-2 [direction:rtl] lg:grid lg:grid-cols-[minmax(260px,1fr)_130px_140px_140px_130px_115px_105px]">
                <div className="relative min-w-0">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={requestsSearch} onChange={(e) => setRequestsSearch(e.target.value)} className="h-10 w-full min-w-0 rounded-[6.5px] border-slate-200 pr-9" placeholder="ابحث باسم الطالب، الدورة، البريد، أو رقم الجوال..." />
                </div>

                <select value={requestsCourseFilter} onChange={(e) => setRequestsCourseFilter(e.target.value)} className="h-10 w-full min-w-0 rounded-[6.5px] border border-slate-200 bg-white px-2 text-sm text-right outline-none focus:border-blue-400">
                  <option value="all">الدورة: الكل</option>
                  {coursesOptions.map((c) => <option key={`request-course-filter-${c.id}`} value={c.id}>{c.title}</option>)}
                </select>
                <select value={requestStatusFilter} onChange={(e) => setRequestStatusFilter(e.target.value)} className="h-10 w-full min-w-0 rounded-[6.5px] border border-slate-200 bg-white px-2 text-sm text-right outline-none focus:border-blue-400">
                  <option value="all">حالة الطلب: الكل</option>
                  <option value="preliminary">تسجيل مبدئي</option>
                  <option value="awaiting_payment">بانتظار الدفع</option>
                  <option value="payment_review">بانتظار مراجعة الدفع</option>
                  <option value="payment_confirmed">الدفع مؤكد</option>
                  <option value="rejected">مرفوض</option>
                </select>
                <select value={requestPaymentFilter} onChange={(e) => setRequestPaymentFilter(e.target.value)} className="h-10 w-full min-w-0 rounded-[6.5px] border border-slate-200 bg-white px-2 text-sm text-right outline-none focus:border-blue-400">
                  <option value="all">حالة الدفع: الكل</option>
                  <option value="none">لا يوجد دفع</option>
                  <option value="awaiting_slip">بانتظار السند</option>
                  <option value="slip_review">سند بانتظار المراجعة</option>
                  <option value="approved">مؤكد</option>
                  <option value="rejected">مرفوض</option>
                </select>
                <select value={requestsDateFilter} onChange={(e) => setRequestsDateFilter(e.target.value)} className="h-10 w-full min-w-0 rounded-[6.5px] border border-slate-200 bg-white px-2 text-sm text-right outline-none focus:border-blue-400">
                  <option value="all">تاريخ الطلب: الكل</option>
                  <option value="today">اليوم</option>
                  <option value="last7">آخر 7 أيام</option>
                  <option value="last30">آخر 30 يوم</option>
                  <option value="thisMonth">هذا الشهر</option>
                </select>
                <label className="flex h-10 w-full items-center justify-center gap-2 rounded-[6.5px] border border-slate-200 px-2 text-sm text-slate-700">
                  <span className="whitespace-nowrap">يحتاج إجراء</span>
                  <input type="checkbox" checked={requestsNeedsActionOnly} onChange={(e) => setRequestsNeedsActionOnly(e.target.checked)} className="h-4 w-4 accent-blue-600" />
                </label>

                <Button type="button" variant="outline" className="h-10 w-full rounded-[6.5px] px-2 text-sm font-semibold whitespace-nowrap" onClick={resetRequestsFilters}>
                  إعادة ضبط
                  {requestsActiveFiltersCount > 0 ? <span className="mr-1 rounded-full bg-slate-100 px-1.5 text-[11px]">{requestsActiveFiltersCount}</span> : null}
                </Button>
              </div>

              <div className="space-y-2.5 overflow-x-hidden">
                <div className="hidden w-full rounded-[6.5px] border border-slate-200 bg-slate-50/80 lg:block">
                  <div className="grid grid-cols-[minmax(260px,1.35fr)_minmax(170px,1fr)_minmax(130px,0.85fr)_minmax(190px,0.95fr)_minmax(140px,0.8fr)_minmax(190px,1fr)] items-center gap-3 px-3.5 py-3 text-[13px] font-semibold text-slate-600 [direction:rtl]">
                    <div className="text-center">الطالب</div>
                    <div className="text-center">الدورة</div>
                    <div className="text-center">تاريخ الطلب</div>
                    <div className="text-center">مسار الطلب</div>
                    <div className="-translate-x-2 text-center">الحالة</div>
                    <div className="w-full justify-self-center text-center">الإجراءات</div>
                  </div>
                </div>

                {filteredRequestRows.map((e) => {
                  const s = getStatus(e)
                  const p = getPaymentStatus(e)
                  const hasProof = !!e.payments?.[0]?.depositSlipImage
                  const rejectionReason = e.rejectionReason || e.cancellationReason || e.payments?.[0]?.rejectionReason
                  const isPreliminary = s === "PRELIMINARY"
                  const isAcceptedPreliminary = s === "PRELIMINARY_APPROVED" || (s === "PENDING_PAYMENT" && p !== "PENDING_REVIEW")
                  const isPendingReview = s === "PENDING_PAYMENT" && p === "PENDING_REVIEW"
                  const isConfirmedPayment = (p === "APPROVED" || ["ACTIVE", "COMPLETED"].includes(s)) && hasProof
                  const isRejected = ["REJECTED", "REJECT_ENROLLMENT", "REJECT_PAYMENT", "CANCELLED"].includes(s) || p === "REJECTED"

                  const actions: ActionItem[] = []
                  if (isPreliminary) {
                    actions.push({ key: "approve", label: "قبول", variant: "primary", onClick: () => approvePreliminary(e) })
                    actions.push({ key: "reject", label: "رفض", variant: "danger", onClick: () => openReject(e, "enrollment") })
                  } else if (isAcceptedPreliminary) {
                    actions.push({ key: "remind", label: "تذكير بالدفع", variant: "secondary", onClick: remindPayment })
                  } else if (isPendingReview) {
                    actions.push({ key: "confirm", label: "تأكيد الدفع", variant: "primary", onClick: () => confirmPayment(e) })
                    actions.push({ key: "slip", label: "عرض السند", variant: "secondary", onClick: () => openSlip(e) })
                    actions.push({ key: "reject-payment", label: "رفض الدفع", variant: "danger", onClick: () => openReject(e, "payment") })
                  } else if (isConfirmedPayment) {
                    actions.push({ key: "slip", label: "عرض السند", variant: "secondary", onClick: () => openSlip(e) })
                    actions.push({ key: "download-slip", label: "تحميل السند", variant: "secondary", onClick: () => { void downloadSlip(e) } })
                  } else if (isRejected) {
                    actions.push({ key: "reason", label: "عرض سبب الرفض", variant: "danger", onClick: () => setSelected(e) })
                  }

                  const inlineActions = actions.length > 2 ? actions.slice(0, 2) : actions
                  const moreActions = actions.length > 2 ? actions.slice(2) : []

                  return (
                    <article key={e.id} className="w-full rounded-[6.5px] border border-slate-200 bg-white px-3.5 py-3 shadow-[0_1px_6px_rgba(15,23,42,0.05)] hover:bg-slate-50/50">
                      <div className="hidden w-full lg:grid lg:grid-cols-[minmax(260px,1.35fr)_minmax(170px,1fr)_minmax(130px,0.85fr)_minmax(190px,0.95fr)_minmax(140px,0.8fr)_minmax(190px,1fr)] lg:items-center lg:gap-3 lg:[direction:rtl]">
                        <section className="flex items-center justify-start gap-2">
                          <Avatar className="h-9 w-9 shrink-0 rounded-[6.5px] border border-slate-200">
                            <AvatarImage src={resolveImage(e.student?.avatar)} />
                            <AvatarFallback>{initials(e.student?.name)}</AvatarFallback>
                          </Avatar>
                          <div className="text-right">
                            <p className="truncate text-sm font-bold text-slate-900">{e.student?.name || "-"}</p>
                            <p className="text-xs text-slate-500">{e.student?.email || "-"}</p>
                            <p className="text-xs text-slate-500">{e.student?.phone || "-"}</p>
                          </div>
                        </section>
                        <section className="justify-self-center text-center text-sm text-slate-700"><p className="inline-flex items-center gap-1 truncate"><BookOpen className="h-3.5 w-3.5 text-blue-500" />{e.course?.title || "-"}</p></section>
                        <section className="justify-self-center text-center text-xs text-slate-700">{e.enrolledAt ? formatDate(e.enrolledAt) : "-"}</section>
                        <section className="justify-self-center"><RequestTimeline enrollment={e} /></section>
                        <section className="-translate-x-2 justify-self-center text-center"><div className="inline-flex">{getStatusBadge(e)}</div>{isRejected && rejectionReason && <p className="mt-1 text-[11px] text-rose-600">{rejectionReason}</p>}</section>
                        <section className="w-full justify-self-center [direction:ltr] flex flex-wrap items-center justify-center gap-2 overflow-hidden">
                          {isPendingReview ? (
                            <div className="mx-auto grid w-full max-w-[260px] grid-cols-2 gap-2">
                              <Button size="sm" className="h-8 rounded-[6.5px] px-3 text-[12px] font-semibold" onClick={() => confirmPayment(e)} disabled={actionId === e.id}>
                                {actionId === e.id ? <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" /> : null}
                                تأكيد الدفع
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 rounded-[6.5px] border-rose-200 px-3 text-[12px] font-semibold text-rose-700 hover:bg-rose-50" onClick={() => openReject(e, "payment")}>
                                رفض الدفع
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 rounded-[6.5px] px-3 text-[12px] font-semibold whitespace-nowrap" onClick={() => openSlip(e)}>
                                <Eye className="ml-1 h-3.5 w-3.5" />
                                عرض السند
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 rounded-[6.5px] px-3 text-[12px] font-semibold whitespace-nowrap" onClick={() => downloadSlip(e)}>
                                <Download className="ml-1 h-3 w-3" />
                                تحميل السند
                              </Button>
                            </div>
                          ) : (
                            <>
                              {inlineActions.map((a) => <Button key={a.key} size="sm" variant={a.variant === "primary" ? "default" : "outline"} className={`h-9 rounded-[6.5px] px-4 text-[13px] font-semibold ${actionButtonClass(a.variant)}`} onClick={a.onClick} disabled={actionId === e.id}>{actionId === e.id && a.variant === "primary" ? <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" /> : null}{a.label}</Button>)}
                              {moreActions.length > 0 && (
                                <DropdownMenu dir="rtl">
                                  <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="outline" className="h-9 w-9 rounded-[6.5px] border-slate-200">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="rounded-[6.5px]">
                                    {moreActions.map((a) => (
                                      <DropdownMenuItem key={a.key} onClick={a.onClick} className={a.variant === "danger" ? "text-rose-700" : ""}>
                                        {a.label}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </>
                          )}
                        </section>
                      </div>

                      <div className="grid grid-cols-1 gap-2 lg:hidden" dir="rtl">
                        <div className="flex items-center justify-end gap-2"><Avatar className="h-9 w-9 rounded-[6.5px] border border-slate-200"><AvatarImage src={resolveImage(e.student?.avatar)} /><AvatarFallback>{initials(e.student?.name)}</AvatarFallback></Avatar><p className="text-sm font-bold text-slate-900">{e.student?.name || "-"}</p></div>
                        <div className="text-right text-xs text-slate-600"><p>{e.student?.email || "-"}</p><p>{e.student?.phone || "-"}</p></div>
                        <p className="text-right text-xs text-slate-700"><BookOpen className="ml-1 inline h-3.5 w-3.5 text-blue-500" />{e.course?.title || "-"}</p>
                        <p className="text-right text-xs text-slate-500">تاريخ الطلب: {e.enrolledAt ? formatDate(e.enrolledAt) : "-"}</p>
                        <div className="flex justify-end"><RequestTimeline enrollment={e} /></div>
                        <div className="text-right">{getStatusBadge(e)}</div>
                        <div className="flex flex-wrap justify-center [direction:ltr] gap-2">
                          {isPendingReview ? (
                            <div className="mx-auto grid w-full max-w-[260px] grid-cols-2 gap-2">
                              <Button size="sm" className="h-8 rounded-[6.5px] px-3 text-[12px] font-semibold" onClick={() => confirmPayment(e)}>
                                تأكيد الدفع
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 rounded-[6.5px] border-rose-200 px-3 text-[12px] font-semibold text-rose-700 hover:bg-rose-50" onClick={() => openReject(e, "payment")}>
                                رفض الدفع
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 rounded-[6.5px] px-3 text-[12px] font-semibold whitespace-nowrap" onClick={() => openSlip(e)}>
                                <Eye className="ml-1 h-3.5 w-3.5" />
                                عرض السند
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 rounded-[6.5px] px-3 text-[12px] font-semibold whitespace-nowrap" onClick={() => downloadSlip(e)}>
                                <Download className="ml-1 h-3 w-3" />
                                تحميل السند
                              </Button>
                            </div>
                          ) : (
                            <>
                              {inlineActions.map((a) => <Button key={`m-${a.key}`} size="sm" variant={a.variant === "primary" ? "default" : "outline"} className={`h-9 rounded-[6.5px] px-4 text-[13px] font-semibold ${actionButtonClass(a.variant)}`} onClick={a.onClick}>{a.label}</Button>)}
                              {moreActions.length > 0 && (
                                <DropdownMenu dir="rtl">
                                  <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="outline" className="h-9 w-9 rounded-[6.5px] border-slate-200">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-[6.5px]">
                                    {moreActions.map((a) => (
                                      <DropdownMenuItem key={`m-${a.key}`} onClick={a.onClick} className={a.variant === "danger" ? "text-rose-700" : ""}>
                                        {a.label}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
                {filteredRequestRows.length === 0 && <div className="rounded-[6.5px] border border-slate-200 bg-white px-4 py-10 text-center text-slate-500">لا توجد طلبات تسجيل أو مدفوعات مطابقة</div>}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent dir="rtl" className="rounded-[6.5px] border-slate-200 sm:max-w-[560px]"><DialogHeader className="text-right"><DialogTitle>تفاصيل التسجيل</DialogTitle><DialogDescription>عرض معلومات الطالب والدورة والحالة الحالية.</DialogDescription></DialogHeader>{selected ? <div className="space-y-2 text-sm"><p><span className="text-slate-500">الطالب:</span> {selected.student?.name || "-"}</p><p><span className="text-slate-500">الدورة:</span> {selected.course?.title || "-"}</p><p><span className="text-slate-500">حالة التسجيل:</span> {getStatusLabel(selected.status, selected.payments?.[0]?.status)}</p><p><span className="text-slate-500">حالة الدفع:</span> {getPaymentStatusLabel(selected.payments?.[0]?.status)}</p><p><span className="text-slate-500">سبب الرفض:</span> {selected.rejectionReason || selected.cancellationReason || selected.payments?.[0]?.rejectionReason || "-"}</p></div> : null}</DialogContent>
      </Dialog>

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent dir="rtl" className="rounded-[6.5px] border-slate-200 sm:max-w-[560px] [&>[data-dialog-close='default']]:hidden">
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle>إرسال رسالة للطالب</DialogTitle>
            <DialogDescription>أدخل عنوانًا ورسالة قصيرة ليتم إرسالها للطالب.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="block text-right text-xs font-semibold text-slate-600">عنوان الرسالة</label>
            <Input value={messageTitle} onChange={(e) => setMessageTitle(e.target.value)} className="h-10 rounded-[6.5px]" placeholder="عنوان الرسالة" />
            <label className="block text-right text-xs font-semibold text-slate-600">نص الرسالة</label>
            <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} className="min-h-[110px] w-full rounded-[6.5px] border border-slate-200 p-3 text-sm outline-none focus:border-blue-400" placeholder="اكتب الرسالة..." />
            <div className="flex justify-start">
              <Button variant="outline" className="ml-2 h-9 rounded-[6.5px] px-4 text-[13px] font-semibold" onClick={() => setMessageOpen(false)}>إلغاء</Button>
              <Button onClick={submitStudentMessage} className="h-9 rounded-[6.5px] px-4 text-[13px] font-semibold">إرسال</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reasonOpen} onOpenChange={setReasonOpen}>
        <DialogContent dir="rtl" className="rounded-[6.5px] border-slate-200 sm:max-w-[560px] [&>[data-dialog-close='default']]:hidden">
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle>{reasonMode === "stop" ? "إيقاف من دورة" : "إلغاء تسجيل من دورة"}</DialogTitle>
            <DialogDescription>{reasonMode === "stop" ? "سيتم إشعار الطالب بسبب الإيقاف." : "هذا الإجراء سيؤثر على تسجيل الطالب في الدورة المحددة."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {selectedStudentSummary && selectedStudentSummary.enrollments.length > 1 ? (
              <div className="space-y-1">
                <label className="block text-right text-xs font-semibold text-slate-600">اختر الدورة</label>
                <select
                  value={selectedCourseEnrollmentId}
                  onChange={(e) => setSelectedCourseEnrollmentId(e.target.value)}
                  className="h-10 w-full rounded-[6.5px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400"
                >
                  {selectedStudentSummary.enrollments.map((en) => (
                    <option key={`reason-course-${en.id}`} value={en.id}>
                      {en.course?.title || "-"}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <label className="block text-right text-xs font-semibold text-slate-600">{reasonMode === "stop" ? "سبب الإيقاف" : "سبب الإلغاء"}</label>
            <textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} className="min-h-[110px] w-full rounded-[6.5px] border border-slate-200 p-3 text-sm outline-none focus:border-blue-400" placeholder={reasonMode === "stop" ? "اكتب سبب الإيقاف..." : "اكتب سبب الإلغاء..."} />
            <div className="flex justify-start gap-2">
              <Button variant="outline" className="h-9 rounded-[6.5px] px-4 text-[13px] font-semibold" onClick={() => setReasonOpen(false)}>{reasonMode === "stop" ? "إلغاء" : "تراجع"}</Button>
              <Button onClick={submitReasonAction} className={`h-9 rounded-[6.5px] px-4 text-[13px] font-semibold ${reasonMode === "cancel" ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-600 hover:bg-amber-700"}`}>
                {reasonMode === "stop" ? "تأكيد الإيقاف" : "إلغاء التسجيل"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RejectionActionModal
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        actionType={rejectType}
        studentName={rejectTarget?.student?.name || ""}
        courseName={rejectTarget?.course?.title || ""}
        amount={Number(rejectTarget?.payments?.[0]?.amount || 0)}
        paymentStatus={rejectTarget?.payments?.[0]?.status || ""}
        requestDate={rejectTarget?.enrolledAt ? formatDate(rejectTarget.enrolledAt) : "-"}
        currentStatusLabel={getStatusLabel(rejectTarget?.status, rejectTarget?.payments?.[0]?.status)}
        requireReason
        onConfirm={async (reason) => {
          if (!rejectTarget?.id) throw new Error("تعذر تحديد الطلب")
          await withAction(rejectTarget.id, async () => {
            await instituteService.updateEnrollmentStatus(rejectTarget.id, rejectType === "payment" ? "REJECT_PAYMENT" : "REJECT_ENROLLMENT", reason)
          })
          toast.success("تم حفظ سبب الرفض")
          setRejectOpen(false)
        }}
      />

      <Dialog open={coursesOpen} onOpenChange={setCoursesOpen}>
        <DialogContent dir="rtl" className="w-[95vw] rounded-[6.5px] border-slate-200 p-6 sm:max-w-[760px] [&>[data-dialog-close='default']]:left-4 [&>[data-dialog-close='default']]:right-auto">
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle>دورات الطالب</DialogTitle>
            <DialogDescription>قائمة الدورات المسجل بها الطالب مع حالة التسجيل والدفع.</DialogDescription>
          </DialogHeader>
          <div className="rounded-[6.5px] border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm">
            <p><span className="text-slate-500">الطالب:</span> <span className="font-semibold text-slate-900">{selectedStudentSummary?.student?.name || "-"}</span></p>
            <p><span className="text-slate-500">عدد الدورات:</span> <span className="font-semibold text-slate-900">{selectedStudentSummary?.enrollments?.length || 0}</span></p>
          </div>
          <div className="space-y-3">
            {selectedStudentSummary?.enrollments?.map((en) => (
              <div key={`student-course-${en.id}`} className="space-y-3 rounded-[6.5px] border border-slate-200 bg-white p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-right text-base font-semibold text-slate-900">{en.course?.title || "-"}</p>
                  <div className="shrink-0">{getStatusBadge(en)}</div>
                </div>
                <div className="grid grid-cols-1 gap-2 text-right sm:grid-cols-2">
                  <div className="rounded-[6.5px] bg-slate-50 px-3 py-2"><span className="text-slate-500">تاريخ الانضمام:</span> <span className="font-medium text-slate-800">{en.enrolledAt ? formatDate(en.enrolledAt) : "-"}</span></div>
                  <div className="rounded-[6.5px] bg-slate-50 px-3 py-2"><span className="text-slate-500">حالة التسجيل:</span> <span className="font-medium text-slate-800">{getStatusLabel(en.status, en.payments?.[0]?.status)}</span></div>
                  <div className="rounded-[6.5px] bg-slate-50 px-3 py-2 inline-flex items-center gap-2">
                    <span className="text-slate-500">حالة الدفع:</span>
                    <Badge className={`cursor-default rounded-[6.5px] transition-none ${getPaymentStatusBadgeClass(en.payments?.[0]?.status)}`}>
                      {String(en.status || "").toUpperCase() === "PRELIMINARY_APPROVED" || (String(en.status || "").toUpperCase() === "PENDING_PAYMENT" && String(en.payments?.[0]?.status || "").toUpperCase() !== "PENDING_REVIEW")
                        ? "بانتظار السند"
                        : getPaymentStatusLabel(en.payments?.[0]?.status)}
                    </Badge>
                  </div>
                  <div className="rounded-[6.5px] bg-slate-50 px-3 py-2">
                    <span className="text-slate-500">المبلغ:</span>{" "}
                    <span className="font-medium text-slate-800">{en.payments?.[0]?.amount ? `${formatNumber(Number(en.payments[0].amount))} ر.ي` : "-"}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-[6.5px] border-blue-200 px-4 text-[13px] font-semibold text-blue-700 hover:bg-blue-50"
                    onClick={() => {
                      setCoursesOpen(false)
                      openStudentRequests(selectedStudentSummary!, en.course)
                    }}
                  >
                    عرض الدفع
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 rounded-[6.5px] px-4 text-[13px] font-semibold text-slate-700" onClick={() => openCourseInExplore(en)}>عرض الدورة</Button>
                  <Button size="sm" variant="outline" className="h-9 rounded-[6.5px] border-amber-200 px-4 text-[13px] font-semibold text-amber-700 hover:bg-amber-50" onClick={() => openReasonModal(en, "stop")}>إيقاف من هذه الدورة</Button>
                </div>
              </div>
            ))}
            {!selectedStudentSummary?.enrollments?.length ? <div className="rounded-[6.5px] border border-slate-200 bg-white px-3 py-8 text-center text-sm text-slate-500">لا توجد دورات مسجل بها هذا الطالب حاليًا.</div> : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={studentsFiltersOpen} onOpenChange={setStudentsFiltersOpen}>
        <DialogContent dir="rtl" className="rounded-[6.5px] border-slate-200 sm:max-w-[520px]">
          <DialogHeader className="text-right">
            <DialogTitle>فلاتر الطلاب</DialogTitle>
            <DialogDescription>حدد الفلاتر ثم اضغط تطبيق.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <select value={studentsCourseFilter} onChange={(e) => setStudentsCourseFilter(e.target.value)} className="h-10 w-full rounded-[6.5px] border border-slate-200 bg-white px-3 text-sm text-right outline-none focus:border-blue-400">
              <option value="all">الدورة: الكل</option>
              {coursesOptions.map((c) => <option key={`m-student-course-filter-${c.id}`} value={c.id}>{c.title}</option>)}
            </select>
            <select value={studentStatusFilter} onChange={(e) => setStudentStatusFilter(e.target.value)} className="h-10 w-full rounded-[6.5px] border border-slate-200 bg-white px-3 text-sm text-right outline-none focus:border-blue-400">
              <option value="all">حالة الطالب: الكل</option>
              <option value="active">نشط</option>
              <option value="stopped">موقوف</option>
              <option value="cancelled">ملغي</option>
              <option value="pending_review">لديه طلبات قيد المراجعة</option>
            </select>
            <select value={studentsDateFilter} onChange={(e) => setStudentsDateFilter(e.target.value)} className="h-10 w-full rounded-[6.5px] border border-slate-200 bg-white px-3 text-sm text-right outline-none focus:border-blue-400">
              <option value="all">تاريخ الانضمام: الكل</option>
              <option value="today">اليوم</option>
              <option value="last7">آخر 7 أيام</option>
              <option value="last30">آخر 30 يوم</option>
              <option value="thisMonth">هذا الشهر</option>
            </select>
            <select value={studentsSort} onChange={(e) => setStudentsSort(e.target.value)} className="h-10 w-full rounded-[6.5px] border border-slate-200 bg-white px-3 text-sm text-right outline-none focus:border-blue-400">
              <option value="latest">الترتيب: الأحدث أولًا</option>
              <option value="oldest">الأقدم أولًا</option>
              <option value="name_asc">الاسم أ-ي</option>
              <option value="name_desc">الاسم ي-أ</option>
            </select>
            <div className="flex justify-between pt-1">
              <Button type="button" variant="outline" className="h-9 rounded-[6.5px]" onClick={resetStudentsFilters}>إعادة ضبط</Button>
              <Button type="button" className="h-9 rounded-[6.5px]" onClick={() => setStudentsFiltersOpen(false)}>تطبيق</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={requestsFiltersOpen} onOpenChange={setRequestsFiltersOpen}>
        <DialogContent dir="rtl" className="rounded-[6.5px] border-slate-200 sm:max-w-[520px]">
          <DialogHeader className="text-right">
            <DialogTitle>فلاتر طلبات التسجيل والدفع</DialogTitle>
            <DialogDescription>حدد الفلاتر ثم اضغط تطبيق.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <select value={requestsCourseFilter} onChange={(e) => setRequestsCourseFilter(e.target.value)} className="h-10 w-full rounded-[6.5px] border border-slate-200 bg-white px-3 text-sm text-right outline-none focus:border-blue-400">
              <option value="all">الدورة: الكل</option>
              {coursesOptions.map((c) => <option key={`m-request-course-filter-${c.id}`} value={c.id}>{c.title}</option>)}
            </select>
            <select value={requestStatusFilter} onChange={(e) => setRequestStatusFilter(e.target.value)} className="h-10 w-full rounded-[6.5px] border border-slate-200 bg-white px-3 text-sm text-right outline-none focus:border-blue-400">
              <option value="all">حالة الطلب: الكل</option>
              <option value="preliminary">تسجيل مبدئي</option>
              <option value="awaiting_payment">بانتظار الدفع</option>
              <option value="payment_review">بانتظار مراجعة الدفع</option>
              <option value="payment_confirmed">الدفع مؤكد</option>
              <option value="rejected">مرفوض</option>
            </select>
            <select value={requestPaymentFilter} onChange={(e) => setRequestPaymentFilter(e.target.value)} className="h-10 w-full rounded-[6.5px] border border-slate-200 bg-white px-3 text-sm text-right outline-none focus:border-blue-400">
              <option value="all">حالة الدفع: الكل</option>
              <option value="none">لا يوجد دفع</option>
              <option value="awaiting_slip">بانتظار السند</option>
              <option value="slip_review">سند بانتظار المراجعة</option>
              <option value="approved">مؤكد</option>
              <option value="rejected">مرفوض</option>
            </select>
            <select value={requestsDateFilter} onChange={(e) => setRequestsDateFilter(e.target.value)} className="h-10 w-full rounded-[6.5px] border border-slate-200 bg-white px-3 text-sm text-right outline-none focus:border-blue-400">
              <option value="all">تاريخ الطلب: الكل</option>
              <option value="today">اليوم</option>
              <option value="last7">آخر 7 أيام</option>
              <option value="last30">آخر 30 يوم</option>
              <option value="thisMonth">هذا الشهر</option>
            </select>
            <label className="inline-flex h-10 w-full items-center justify-between rounded-[6.5px] border border-slate-200 px-3 text-sm text-slate-700">
              <span>يحتاج إجراء</span>
              <input type="checkbox" checked={requestsNeedsActionOnly} onChange={(e) => setRequestsNeedsActionOnly(e.target.checked)} className="h-4 w-4 accent-blue-600" />
            </label>
            <div className="flex justify-between pt-1">
              <Button type="button" variant="outline" className="h-9 rounded-[6.5px]" onClick={resetRequestsFilters}>إعادة ضبط</Button>
              <Button type="button" className="h-9 rounded-[6.5px]" onClick={() => setRequestsFiltersOpen(false)}>تطبيق</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function InstituteStudentsRegistrationsPage() {
  return (
    <Suspense fallback={null}>
      <InstituteStudentsRegistrationsPageContent />
    </Suspense>
  )
}

