"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { CourseCard } from "@/components/course-card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BookOpen, Calendar, Clock, Award, X, Users, MapPin, ImageIcon, Loader2, AlertTriangle } from "lucide-react"
import { MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Course } from "@/types"
import { studentService } from "@/lib/student-service"
import { formatDate, formatTime, getFileUrl } from "@/lib/utils"
import { toast } from "sonner"
import { HallDetailsModal } from "@/components/halls/HallDetailsModal"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

function resolveImage(src: string | null | undefined): string {
  if (!src) return "/images/course-web.png"
  if (src.startsWith("http")) return src
  const cleanSrc = src.replace(/\\/g, "/")
  const separator = cleanSrc.startsWith("/") ? "" : "/"
  return `${API_BASE}${separator}${cleanSrc}`
}

type EnrollmentWithCourse = {
  id: string
  status: string
  rejectionReason?: string | null
  payments?: { rejectionReason?: string | null; status?: string }[]
  progress: number
  enrolledAt: Date
  course: Course & {
    image: string
    trainers?: { id: string; name: string; avatar: string | null }[]
    roomId?: string | null
    roomName?: string | null
  }
  nextSession?: {
    startTime: string
    endTime: string
    topic: string | null
    type: string
  }
}

type StatusKey = "active" | "pending" | "completed" | "cancelled"

const statusMeta: Record<StatusKey, { label: string }> = {
  active: { label: "سارية" },
  pending: { label: "معلقة" },
  completed: { label: "مكتملة" },
  cancelled: { label: "ملغاة" },
}

function StatusTab({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string
  count: number
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={`inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-[6.5px] px-3 text-sm font-semibold whitespace-nowrap transition-colors ${
        isActive ? "bg-white text-blue-600 shadow-sm" : "bg-transparent text-slate-600 hover:bg-white/70"
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 py-0.5 text-xs ${
          isActive ? "bg-blue-50 text-blue-600" : "bg-slate-200 text-slate-700"
        }`}
      >
        {count}
      </span>
    </button>
  )
}

function MyCoursesPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState<StatusKey>((searchParams.get("tab") as StatusKey) || "active")
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [selectedEnrollment, setSelectedEnrollment] = useState<string | null>(null)
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  const [isHallModalOpen, setIsHallModalOpen] = useState(false)
  const [selectedHallId, setSelectedHallId] = useState<string | null>(null)

  const fetchCourses = async () => {
    try {
      setIsLoading(true)
      const data = await studentService.getMyCourses()
      const mapped = data.map((e: any) => ({ ...e, enrolledAt: new Date(e.enrolledAt), status: (e.status || "").toLowerCase() }))
      setEnrollments(mapped)
    } catch (error) {
      console.error("Failed to fetch courses", error)
      toast.error("فشل في تحميل الدورات")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    const tab = searchParams.get("tab") as StatusKey
    if (tab && statusMeta[tab]) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleTabChange = (v: string) => {
    const newTab = v as StatusKey
    setActiveTab(newTab)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", newTab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const getEnrollmentsByStatus = (status: StatusKey) => {
    if (status === "active") return enrollments.filter((e) => e.status === "active")
    if (status === "pending") return enrollments.filter((e) => ["pending_payment", "preliminary", "preliminary_approved", "reject_payment", "rejected", "enrollment_rejected"].includes(e.status))
    return enrollments.filter((e) => e.status === status)
  }

  const handleCancelEnrollment = (enrollmentId: string) => {
    setSelectedEnrollment(enrollmentId)
    setShowCancelDialog(true)
  }

  const confirmCancellation = async () => {
    if (!selectedEnrollment) return
    try {
      setIsUpdating(true)
      await studentService.cancelEnrollment(selectedEnrollment)
      toast.success("تم إلغاء التسجيل بنجاح")
      fetchCourses()
      setShowCancelDialog(false)
      setSelectedEnrollment(null)
    } catch (error: any) {
      console.error("Failed to cancel enrollment", error)
      toast.error(error.message || "حدث خطأ أثناء إلغاء التسجيل")
    } finally {
      setIsUpdating(false)
    }
  }

  const renderCourseCard = (enrollment: EnrollmentWithCourse) => {
    const nextDate = enrollment.nextSession ? new Date(enrollment.nextSession.startTime) : null
    const isPendingEnrollment = ["pending_payment", "preliminary", "preliminary_approved", "reject_payment", "rejected", "enrollment_rejected"].includes(enrollment.status)
    const courseDetailsPath = isPendingEnrollment ? "/student/explore/course" : "/student/courses"
    const rejectionReason = enrollment.rejectionReason || enrollment.payments?.[0]?.rejectionReason || ""

    const statusInfo: Record<string, { message: string; badge: string }> = {
      active: { badge: "سارية", message: "الدورة فعالة" },
      preliminary: { badge: "قيد المراجعة", message: "طلب التسجيل قيد المراجعة من الإدارة." },
      preliminary_approved: { badge: "مقبول مبدئيًا", message: "تم قبول طلبك المبدئي، بانتظار اكتمال الحد الأدنى." },
      pending_payment: { badge: "قيد الدفع", message: "تمت الموافقة، يرجى رفع سند التحويل لإكمال التسجيل." },
      reject_payment: { badge: "سند مرفوض", message: rejectionReason ? `تم رفض سند الدفع: ${rejectionReason}` : "تم رفض سند الدفع. يرجى إعادة رفع سند واضح وصحيح." },
      rejected: { badge: "طلب مرفوض", message: rejectionReason ? `تم رفض طلب التسجيل: ${rejectionReason}` : "تم رفض طلب التسجيل. يمكنك تعديل بياناتك ثم إرسال طلب جديد." },
      enrollment_rejected: { badge: "طلب مرفوض", message: rejectionReason ? `تم رفض طلب التسجيل: ${rejectionReason}` : "تم رفض طلب التسجيل. يمكنك تعديل بياناتك ثم إرسال طلب جديد." },
      completed: { badge: "مكتملة", message: "أنهيت هذه الدورة بنجاح." },
      cancelled: { badge: "ملغاة", message: "تم إلغاء هذا الالتحاق." },
    }

    const details = statusInfo[enrollment.status] || { badge: enrollment.status, message: "" }

    return (
      <CourseCard
        key={enrollment.id}
        id={enrollment.course.id}
        title={enrollment.course.title}
        description={enrollment.course.shortDescription || enrollment.course.description || ""}
        price={Number(enrollment.course.price || 0)}
        studentsCount={Number(enrollment.course.enrolledStudents || 0)}
        duration={`${Number((enrollment.course as any).sessionsCount || enrollment.course.duration || 0)} جلسات`}
        image={getFileUrl(enrollment.course.image) || "/images/course-placeholder.png"}
        category={enrollment.course.category || "دورة"}
        instructor={{
          name: enrollment.course.trainer?.name || "غير محدد",
          avatar: getFileUrl(enrollment.course.trainer?.avatar) || "/images/avatar-placeholder.png",
        }}
        instructors={(enrollment.course.trainers || []).map((t) => ({ name: t.name, avatar: getFileUrl(t.avatar) || undefined }))}
        basePath={courseDetailsPath}
        primaryHref={`${courseDetailsPath}/${enrollment.course.id}?from=my-courses&tab=${activeTab}`}
        imageVariant="browse"
        fullWidthButton
        hideFavoriteButton
        hideButtonArrow
        hideStats
        hidePrice
        disableImageZoom
        disableHoverEffects
        hideInstructorSection
        categoryPlacement="image"
        categoryImagePosition="bottom-right"
        cardClassName="max-w-none"
        primaryLabel="تفاصيل الدورة"
        roomId={enrollment.course.roomId}
        roomName={enrollment.course.roomName}
        onRoomClick={() => {
          if (enrollment.course.roomId) {
            setSelectedHallId(enrollment.course.roomId)
            setIsHallModalOpen(true)
          }
        }}
        imageLeftBadge={
          ["active", "preliminary", "preliminary_approved", "pending_payment"].includes(enrollment.status) ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 w-9 rounded-[10px] border-slate-200 bg-white/90 p-0 backdrop-blur-sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 text-right">
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 focus:text-red-600"
                  onClick={() => handleCancelEnrollment(enrollment.id)}
                  disabled={isUpdating}
                >
                  <X className="ml-2 h-4 w-4" />
                  إلغاء التسجيل
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null
        }
        extraContent={
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-sm text-slate-600" dir="rtl">
              <div className="relative h-6 w-6 overflow-hidden rounded-full border border-slate-200 bg-blue-100">
                <Image
                  src={getFileUrl(enrollment.course.trainer?.avatar) || "/images/avatar-placeholder.png"}
                  alt={enrollment.course.trainer?.name || "المنشئ"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <span className="line-clamp-1">{enrollment.course.trainer?.name || "غير محدد"}</span>
            </div>
            {enrollment.status === "active" ? (
              <div className="flex w-full items-center justify-between gap-3 rounded-[10px] border border-blue-100 bg-blue-50 px-3 py-2" dir="rtl">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 text-blue-600">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold text-blue-700">الدرس القادم</span>
                </div>
                {nextDate ? (
                  <div className="flex flex-col text-left leading-5 text-slate-600">
                    <span className="text-sm">{formatDate(nextDate)}</span>
                    <span className="text-xs">{formatTime(nextDate)}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">لا توجد جلسات قادمة</span>
                )}
              </div>
            ) : (
              details.message && (
                <div className="space-y-2">
                  <div className="rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">{details.message}</div>
                  {enrollment.status === "reject_payment" ? (
                    <Button asChild className="h-9 rounded-[6.5px] bg-blue-600 text-white hover:bg-blue-700">
                      <Link href={`/student/explore/course/${enrollment.course.id}`}>إعادة رفع سند الدفع</Link>
                    </Button>
                  ) : null}
                  {["rejected", "enrollment_rejected"].includes(enrollment.status) ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild variant="outline" className="h-9 rounded-[6.5px] border-slate-300">
                        <Link href="/student/profile">تعديل الملف الشخصي</Link>
                      </Button>
                      <Button asChild className="h-9 rounded-[6.5px] bg-blue-600 text-white hover:bg-blue-700">
                        <Link href={`/student/explore/course/${enrollment.course.id}`}>إعادة إرسال طلب التسجيل</Link>
                      </Button>
                    </div>
                  ) : null}
                </div>
              )
            )}
          </div>
        }
      />
    )
  }

  const activeCourses = getEnrollmentsByStatus("active")
  const pendingCourses = getEnrollmentsByStatus("pending")
  const completedCourses = getEnrollmentsByStatus("completed")
  const cancelledCourses = getEnrollmentsByStatus("cancelled")

  const statusCounts: Record<StatusKey, number> = {
    active: activeCourses.length,
    pending: pendingCourses.length,
    completed: completedCourses.length,
    cancelled: cancelledCourses.length,
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-8 pt-0 sm:px-6" dir="rtl">
      <div>
        <div className="mb-5 text-right">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">دوراتي التعليمية</h1>
          <p className="mt-1 text-sm text-slate-500">تابع تقدمك في الدورات وقم بإدارة رحلتك التعليمية</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} dir="rtl">
          <div
            role="tablist"
            aria-label="حالات الدورات"
            className="mb-4 grid w-full grid-cols-2 gap-1 rounded-[6.5px] border border-slate-200 bg-slate-100 p-1 shadow-sm md:grid-cols-4"
          >
            <StatusTab label={statusMeta.active.label} count={statusCounts.active} isActive={activeTab === "active"} onClick={() => handleTabChange("active")} />
            <StatusTab label={statusMeta.pending.label} count={statusCounts.pending} isActive={activeTab === "pending"} onClick={() => handleTabChange("pending")} />
            <StatusTab label={statusMeta.completed.label} count={statusCounts.completed} isActive={activeTab === "completed"} onClick={() => handleTabChange("completed")} />
            <StatusTab label={statusMeta.cancelled.label} count={statusCounts.cancelled} isActive={activeTab === "cancelled"} onClick={() => handleTabChange("cancelled")} />
          </div>

          <TabsContent value="active" className="mt-0">
            {isLoading ? <LoadingState /> : activeCourses.length === 0 ? <EmptyState icon={BookOpen} title="لا توجد دورات في هذه الحالة حالياً" description="ستظهر الدورات السارية هنا عند توفرها." /> : <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{activeCourses.map(renderCourseCard)}</div>}
          </TabsContent>

          <TabsContent value="pending" className="mt-0">
            {isLoading ? <LoadingState /> : pendingCourses.length === 0 ? <EmptyState icon={Clock} title="لا توجد دورات في هذه الحالة حالياً" description="لا توجد طلبات معلقة حالياً." /> : <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{pendingCourses.map(renderCourseCard)}</div>}
          </TabsContent>

          <TabsContent value="completed" className="mt-0">
            {isLoading ? <LoadingState /> : completedCourses.length === 0 ? <EmptyState icon={Award} title="لا توجد دورات في هذه الحالة حالياً" description="أكمل دوراتك لتظهر هنا." /> : <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{completedCourses.map(renderCourseCard)}</div>}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-0">
            {isLoading ? <LoadingState /> : cancelledCourses.length === 0 ? <EmptyState icon={X} title="لا توجد دورات في هذه الحالة حالياً" description="الدورات الملغاة ستظهر هنا." /> : <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{cancelledCourses.map(renderCourseCard)}</div>}
          </TabsContent>
        </Tabs>
      </div>

      <HallDetailsModal 
        isOpen={isHallModalOpen} 
        onClose={setIsHallModalOpen} 
        hallId={selectedHallId} 
      />

      <Dialog
        open={showCancelDialog}
        onOpenChange={(open) => {
          setShowCancelDialog(open)
          if (!open) setSelectedEnrollment(null)
        }}
      >
        <DialogContent
          dir="rtl"
          overlayClassName="bg-slate-900/45 backdrop-blur-[1px]"
          className="w-full max-w-[460px] rounded-[6.5px] p-6 text-right shadow-sm [&>button[data-dialog-close='default']]:hidden"
        >
          <DialogHeader className="space-y-3 text-right">
            <div className="flex items-start justify-between" dir="rtl">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-[6.5px] bg-red-50 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <DialogTitle className="text-lg font-bold text-slate-900">تأكيد إلغاء التسجيل</DialogTitle>
              </div>
              <DialogClose
                className="inline-flex h-8 w-8 items-center justify-center rounded-[6.5px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </DialogClose>
            </div>
            <DialogDescription className="text-sm text-slate-600">
              هل أنت متأكد من رغبتك في إلغاء تسجيلك في هذه الدورة؟
            </DialogDescription>
            <p className="text-xs text-slate-500">
              سيتم حذف تسجيلك من الدورة ولن تتمكن من الوصول إلى محتواها.
            </p>
          </DialogHeader>
          <div className="mt-5 flex items-center justify-start gap-2" dir="rtl">
            <Button
              onClick={confirmCancellation}
              disabled={isUpdating}
              className="h-10 rounded-[6.5px] bg-[#DC2626] px-[18px] text-white hover:bg-[#B91C1C]"
            >
              {isUpdating ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={isUpdating}
              className="h-10 rounded-[6.5px] border border-[#2563EB] bg-white px-[18px] text-[#2563EB] hover:bg-[#EFF6FF]"
            >
              تراجع
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function MyCoursesPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <MyCoursesPageContent />
    </Suspense>
  )
}

function LoadingState() {
  return (
    <Card className="rounded-[12px] border-slate-200">
      <CardContent className="flex justify-center py-10">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </CardContent>
    </Card>
  )
}

function EmptyState({ icon: Icon, title, description, actionLabel, actionLink }: any) {
  return (
    <Card className="rounded-[12px] border border-dashed border-slate-300 bg-white">
      <CardContent className="py-10 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Icon className="h-7 w-7" /></div>
        <h3 className="mb-1 text-lg font-bold text-slate-900">{title}</h3>
        <p className="mx-auto mb-5 max-w-md text-sm text-slate-500">{description}</p>
        {actionLabel && <Button asChild><Link href={actionLink}>{actionLabel}</Link></Button>}
      </CardContent>
    </Card>
  )
}

