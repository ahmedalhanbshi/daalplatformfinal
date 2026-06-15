"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, Trash2, Loader2, Users, CalendarDays, Clock3 } from "lucide-react"
import { useState, useEffect } from "react"
import { studentService } from "@/lib/student-service"
import { getFileUrl } from "@/lib/utils"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0)
}

function creatorName(course: any) {
  return course.trainer?.name || course.instructor?.name || course.institute?.name || course.providerName || "غير محدد"
}

function creatorAvatar(course: any) {
  return (
    getFileUrl(course.trainer?.avatar || course.trainerAvatar || course.instructor?.avatar || course.institute?.logo || course.instituteAvatar) ||
    ""
  )
}

function fallbackAvatarDataUri(name: string) {
  const letter = (name || "؟").trim().charAt(0) || "؟"
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='100%' height='100%' rx='32' fill='#DBEAFE'/><text x='50%' y='55%' text-anchor='middle' dominant-baseline='middle' font-family='Thmanyah Sans' font-size='28' font-weight='700' fill='#1D4ED8'>${letter}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchWishlist = async () => {
    try {
      setLoading(true)
      const data = await studentService.getWishlist()
      setWishlist(data)
    } catch (error: any) {
      console.error("Error fetching wishlist:", error)
      toast.error("حدث خطأ أثناء جلب قائمة الرغبات")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWishlist()
  }, [])

  const confirmDelete = async () => {
    if (!courseToDelete) return
    try {
      setIsDeleting(true)
      await studentService.removeFromWishlist(courseToDelete)
      setWishlist((prev) => prev.filter((course) => course.id !== courseToDelete))
      toast.success("تم إزالة الدورة من قائمة الرغبات")
      setCourseToDelete(null)
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error("Error removing from wishlist:", error)
      toast.error("حدث خطأ أثناء إزالة الدورة")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteClick = (id: string) => {
    setCourseToDelete(id)
    setIsDialogOpen(true)
  }

  if (loading) {
    return (
      <div dir="rtl" className="mx-auto max-w-7xl pb-10 pt-4 text-right">
        <div className="mb-6 flex items-start justify-between gap-4 rounded-[6.5px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="space-y-1">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-5 w-80" />
          </div>
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden rounded-[6.5px] border border-slate-200/90">
              <Skeleton className="h-[188px] w-full md:h-[196px]" />
              <CardContent className="space-y-3 p-3.5">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="mx-auto max-w-7xl pb-10 pt-4 text-right">
      <header className="mb-6 flex flex-col gap-3 rounded-[6.5px] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-slate-900">قائمة الرغبات</h1>
          <p className="text-slate-600">الدورات التي قمت بحفظها للرجوع إليها لاحقًا</p>
        </div>
        <div className="inline-flex h-9 items-center gap-2 self-start rounded-full bg-blue-50 px-3 text-sm font-semibold text-blue-700">
          <Heart className="h-4 w-4" />
          <span>{wishlist.length} دورة محفوظة</span>
        </div>
      </header>

      {wishlist.length > 0 ? (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {wishlist.map((course) => (
            <article
              key={course.id}
              className="group flex h-full min-h-[390px] flex-col overflow-hidden rounded-[6.5px] border border-slate-200/90 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-slate-200/90 hover:shadow-[0_18px_36px_rgba(37,99,235,0.16)]"
            >
              <div className="relative h-[188px] overflow-hidden bg-slate-100 md:h-[196px]">
                <Image
                  src={getFileUrl(course.image) || "/images/course-abstract.svg"}
                  alt={course.title}
                  fill
                  className="object-cover object-center"
                  unoptimized={true}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/25 via-slate-900/10 to-transparent transition-opacity duration-300 group-hover:opacity-90" />

                <div className="absolute left-14 top-3 z-10 flex flex-col gap-2">
                  {course.courseStatus === "PENDING_MINIMUM" || (course as any).status === "PENDING_MINIMUM" ? (
                    <span className="rounded-full border border-amber-200/50 bg-amber-500/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur-[2px]">
                      بانتظار اكتمال العدد
                    </span>
                  ) : course.courseStatus === "ACTIVE" || (course as any).status === "ACTIVE" ? (
                    <span className="rounded-full border border-emerald-200/50 bg-emerald-500/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur-[2px]">
                      مستمرة
                    </span>
                  ) : null}
                </div>

                <span className="absolute bottom-3 right-3 rounded-full bg-white/86 px-2.5 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-[2px]">
                  {course.category || "الفئة"}
                </span>

                <button
                  onClick={() => handleDeleteClick(course.id)}
                  className="absolute left-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-[6.5px] border border-slate-200 bg-white text-red-500 shadow-sm transition-colors hover:bg-red-50"
                  title="إزالة من الرغبات"
                  aria-label="إزالة من الرغبات"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-1 flex-col p-3.5 text-right">
                <div className="space-y-1">
                  <h3 className="line-clamp-2 text-[17px] font-extrabold leading-6 text-slate-900">{course.title}</h3>
                  <p className="line-clamp-2 text-[12px] leading-5 text-slate-600">{course.shortDescription || course.description}</p>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[12px] font-medium text-slate-600">
                  <div className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-slate-500" />
                    <span>{course.studentsCount || 0} طالب</span>
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
                    <span>{course.sessionsCount || 0} جلسات</span>
                  </div>
                  {course.deliveryType !== "in_person" && (
                    <div className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5 text-slate-500" />
                      <span>{typeof course.duration === "number" ? course.duration : String(course.duration || "").replace(/[^\d]/g, "") || 0} ساعة</span>
                    </div>
                  )}
                </div>

                <div className="mt-2 inline-flex items-center gap-2 text-[12px] text-slate-600">
                  <div className="relative h-6 w-6 overflow-hidden rounded-full border border-slate-200 bg-blue-100">
                    <img
                      src={creatorAvatar(course) || fallbackAvatarDataUri(creatorName(course))}
                      alt={creatorName(course)}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = fallbackAvatarDataUri(creatorName(course))
                      }}
                    />
                  </div>
                  <span className="line-clamp-1">{creatorName(course)}</span>
                </div>

                <div className="mt-auto pt-2.5">
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-1 pt-3">
                    <Link
                      href={`/student/courses/${course.id}`}
                      className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md bg-[#2563EB] px-4 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                    >
                      عرض الدورة
                    </Link>
                    <p className="whitespace-nowrap text-[20px] font-extrabold leading-none tracking-tight text-[#2563EB]">
                      {formatPrice(course.price)} <span className="text-xs font-bold text-blue-500">ر.ي</span>
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <Card className="rounded-[6.5px] border border-[#E2E8F0] bg-white shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
              <Heart className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="mb-2 text-2xl font-bold text-slate-900">لا توجد دورات في قائمة الرغبات</h3>
            <p className="mx-auto mb-6 max-w-md text-slate-500">احفظ الدورات التي تهمك لتعود إليها لاحقًا</p>
            <Button asChild className="h-10 rounded-[6.5px] bg-blue-600 px-6 font-semibold hover:bg-blue-700">
              <Link href="/student/courses">استعراض الدورات</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle>إزالة من قائمة الرغبات</DialogTitle>
            <DialogDescription className="pt-2">
              هل أنت متأكد من رغبتك في إزالة هذه الدورة من قائمة الرغبات؟ لن يتم حذف الدورة من المنصة، فقط من قائمتك الخاصة.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse gap-3 sm:justify-start">
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting} className="flex-1 rounded-xl sm:flex-none">
              {isDeleting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                "نعم، إزالة"
              )}
            </Button>
            <DialogClose asChild>
              <Button variant="outline" className="flex-1 rounded-xl sm:flex-none">
                إلغاء
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

