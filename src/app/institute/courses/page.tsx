"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ChevronDown,
  Users,
  CalendarDays,
  Clock3,
  Eye,
  Edit,
  Trash2,
  Plus,
  MoreVertical,
  UserCheck,
  ListFilter,
  ArrowUpDown,
  CircleDollarSign,
  BookCopy,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { formatDate, getFileUrl } from "@/lib/utils"
import { instituteService } from "@/lib/institute-service"

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0)
}

function normalizeText(value: string) {
  return value || ""
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: { label: string; value: string }[] }) {
  return (
    <div className="relative">
      <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 min-w-[150px] appearance-none rounded-[6.5px] border border-slate-200 bg-white px-3 pl-8 text-sm text-slate-700 outline-none hover:border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}

function CourseImage({ src, alt }: { src: string; alt: string }) {
  return <Image src={src || "/images/course-web.png"} alt={alt} fill unoptimized className="object-cover object-center" />
}

export default function InstituteCourses() {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("latest")
  const [searchQuery, setSearchQuery] = useState("")
  const [courseToDelete, setCourseToDelete] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchCourses = async () => {
    try {
      setLoading(true)
      setError("")
      const data = await instituteService.getCourses()
      setCourses(data)
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل في جلب الدورات")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  const filteredCourses = useMemo(() => {
    const rows = courses.filter((course) => {
      const normalizedTitle = normalizeText(course.title)
      const trainerNames =
        (course.trainers as any[] | undefined)?.map((t: any) => normalizeText(t.name ?? "")).join(" ") ||
        normalizeText(course.trainer?.name ?? "")

      const matchesStatus = statusFilter === "all" || String(course.status || "").toLowerCase() === statusFilter
      const matchesSearch =
        normalizedTitle.toLowerCase().includes(searchQuery.toLowerCase()) || trainerNames.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesStatus && matchesSearch
    })

    return [...rows].sort((a, b) => {
      if (sortBy === "price_asc") return Number(a.price || 0) - Number(b.price || 0)
      if (sortBy === "price_desc") return Number(b.price || 0) - Number(a.price || 0)
      if (sortBy === "students_desc") return Number(b.enrolledStudents || 0) - Number(a.enrolledStudents || 0)
      if (sortBy === "name_asc") return normalizeText(a.title).localeCompare(normalizeText(b.title), "ar")
      const aDate = new Date(a.createdAt || 0).getTime()
      const bDate = new Date(b.createdAt || 0).getTime()
      return bDate - aDate
    })
  }, [courses, searchQuery, statusFilter, sortBy])

  const stats = useMemo(() => {
    const totalCourses = courses.length
    const totalStudents = courses.reduce((sum, c) => sum + Number(c.enrolledStudents || 0), 0)
    const activeCourses = courses.filter((c) => String(c.status || "").toLowerCase() === "active").length
    const pendingApproval = courses.filter((c) => {
      const s = String(c.status || "").toLowerCase()
      return s.includes("pending") || s.includes("approval") || s.includes("review")
    }).length
    return { totalCourses, totalStudents, activeCourses, pendingApproval }
  }, [courses])

  const confirmDeleteCourse = async () => {
    if (!courseToDelete) return
    try {
      setIsDeleting(true)
      await instituteService.deleteCourse(courseToDelete.id)
      setCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id))
      toast.success("تم حذف الدورة بنجاح")
      setCourseToDelete(null)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل حذف الدورة")
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (String(status || "").toLowerCase()) {
      case "active":
        return <Badge className="rounded-[6.5px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">مستمر</Badge>
      case "completed":
        return <Badge className="rounded-[6.5px] bg-blue-100 text-blue-700 hover:bg-blue-100">مكتمل</Badge>
      case "pending_minimum":
        return <Badge className="rounded-[6.5px] bg-amber-100 text-amber-700 hover:bg-amber-100">بانتظار اكتمال الحد الأدنى</Badge>
      case "pending_payment":
      case "pending_approval":
      case "pending_review":
        return <Badge className="rounded-[6.5px] bg-amber-100 text-amber-700 hover:bg-amber-100">بانتظار الموافقة على الدفع</Badge>
      case "draft":
        return <Badge className="rounded-[6.5px] bg-slate-100 text-slate-700 hover:bg-slate-100">مسودة</Badge>
      case "cancelled":
        return <Badge className="rounded-[6.5px] bg-rose-100 text-rose-700 hover:bg-rose-100">ملغي</Badge>
      default:
        return <Badge className="rounded-[6.5px] bg-slate-100 text-slate-700 hover:bg-slate-100">{status || "غير محدد"}</Badge>
    }
  }

  if (loading) return <div className="py-10 text-center">جارٍ التحميل...</div>
  if (error) return <div className="rounded-[6.5px] border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>

  return (
    <section dir="rtl" className="min-h-full bg-transparent">
      <div className="mx-auto max-w-[1500px] space-y-4 bg-transparent">
        <div className="flex items-center justify-between">
          <div className="space-y-1 text-right">
            <h1 className="text-2xl font-bold text-slate-900">إدارة الدورات</h1>
            <p className="text-sm text-slate-500">إدارة ومتابعة دوراتك التدريبية</p>
          </div>
          <Button className="h-10 rounded-[6.5px] bg-[#2563EB] px-4 text-sm font-semibold hover:bg-blue-700" asChild>
            <Link href="/institute/courses/create"><Plus className="ml-1 h-4 w-4" />إنشاء دورة جديدة</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-[6.5px] border border-[#E5EAF2] bg-white px-3 py-2.5"><div className="mb-1 inline-flex h-7 w-7 items-center justify-center rounded-[6.5px] bg-blue-50 text-blue-600"><BookCopy className="h-4 w-4" /></div><p className="text-[12px] text-slate-500">إجمالي الدورات</p><p className="text-xl font-bold text-slate-900">{stats.totalCourses}</p></div>
          <div className="rounded-[6.5px] border border-[#E5EAF2] bg-white px-3 py-2.5"><div className="mb-1 inline-flex h-7 w-7 items-center justify-center rounded-[6.5px] bg-cyan-50 text-cyan-600"><Users className="h-4 w-4" /></div><p className="text-[12px] text-slate-500">إجمالي الطلاب</p><p className="text-xl font-bold text-slate-900">{stats.totalStudents}</p></div>
          <div className="rounded-[6.5px] border border-[#E5EAF2] bg-white px-3 py-2.5"><div className="mb-1 inline-flex h-7 w-7 items-center justify-center rounded-[6.5px] bg-emerald-50 text-emerald-600"><Clock3 className="h-4 w-4" /></div><p className="text-[12px] text-slate-500">الدورات النشطة</p><p className="text-xl font-bold text-slate-900">{stats.activeCourses}</p></div>
          <div className="rounded-[6.5px] border border-[#E5EAF2] bg-white px-3 py-2.5"><div className="mb-1 inline-flex h-7 w-7 items-center justify-center rounded-[6.5px] bg-amber-50 text-amber-600"><CircleDollarSign className="h-4 w-4" /></div><p className="text-[12px] text-slate-500">بانتظار الموافقة</p><p className="text-xl font-bold text-slate-900">{stats.pendingApproval}</p></div>
        </div>

        <div className="rounded-[6.5px] border border-[#E5EAF2] bg-white p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ابحث باسم الدورة أو المدرب..." className="h-10 rounded-[6.5px] border-slate-200 pr-3 text-right" />
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-[6.5px] border border-slate-200 bg-white px-2 text-slate-400"><ListFilter className="h-4 w-4" /></div>
              <FilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: "كل الحالات", value: "all" },
                  { label: "مستمر", value: "active" },
                  { label: "بانتظار اكتمال الحد الأدنى", value: "pending_minimum" },
                  { label: "مسودة", value: "draft" },
                  { label: "مكتمل", value: "completed" },
                ]}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-[6.5px] border border-slate-200 bg-white px-2 text-slate-400"><ArrowUpDown className="h-4 w-4" /></div>
              <FilterSelect
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { label: "الأحدث", value: "latest" },
                  { label: "الأقل سعرًا", value: "price_asc" },
                  { label: "الأعلى سعرًا", value: "price_desc" },
                  { label: "الأكثر طلابًا", value: "students_desc" },
                  { label: "الاسم (أ-ي)", value: "name_asc" },
                ]}
              />
            </div>
            <p className="text-sm font-semibold text-slate-500 lg:mr-auto">النتائج: {filteredCourses.length}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="hidden rounded-[6.5px] border border-[#E5EAF2] bg-slate-50 px-3 py-2.5 text-[13px] font-semibold text-slate-700 lg:grid lg:grid-cols-[1.8fr_0.9fr_0.7fr_0.8fr_0.7fr_40px] lg:items-center lg:gap-3">
            <div className="text-right">الدورة</div>
            <div className="text-center">الطلاب</div>
            <div className="text-center">السعر</div>
            <div className="text-center">تاريخ البداية</div>
            <div className="text-center">الحالة</div>
            <div />
          </div>

          {filteredCourses.map((course) => (
            <article key={course.id} className="rounded-[6.5px] border border-[#E5EAF2] bg-white px-3 py-3">
              <div className="hidden lg:grid lg:grid-cols-[1.8fr_0.9fr_0.7fr_0.8fr_0.7fr_40px] lg:items-center lg:gap-3">
                <section className="flex items-center gap-3">
                  <div className="relative h-[86px] w-[128px] shrink-0 overflow-hidden rounded-[6px] border border-slate-200 bg-slate-100">
                    <CourseImage src={getFileUrl(course.image) || "/images/course-web.png"} alt={normalizeText(course.title)} />
                  </div>
                  <div className="min-w-0 text-right">
                    <h3 className="truncate text-sm font-bold text-slate-900">{normalizeText(course.title)}</h3>
                    <div className="mt-1">
                      <Badge className="rounded-[6.5px] bg-slate-100 text-slate-700 hover:bg-slate-100">{normalizeText(course.category) || "الفئة"}</Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{normalizeText(course.shortDescription || course.description || "")}</p>
                  </div>
                </section>
                <section className="text-center text-sm font-semibold text-slate-700">{course.enrolledStudents || 0}/{course.maxStudents || 0}</section>
                <section className="text-center text-sm font-semibold text-[#2563EB]">{formatPrice(course.price)} ر.ي</section>
                <section className="text-center text-sm text-slate-700">{course.startDate ? formatDate(course.startDate) : <span className="text-xs text-amber-600 font-medium">سيُحدد لاحقًا</span>}</section>
                <section className="text-center">{getStatusBadge(course.status)}</section>
                <section className="flex justify-center">
                  <DropdownMenu dir="rtl">
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-[6.5px] text-slate-600 hover:bg-slate-100">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="rounded-[6.5px]">
                      <DropdownMenuItem asChild><Link href={`/institute/courses/${course.id}`}><Eye className="ml-2 h-4 w-4" />عرض التفاصيل</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href={`/institute/courses/create?editId=${course.id}`}><Edit className="ml-2 h-4 w-4" />تعديل الدورة</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href={`/institute/students?courseId=${course.id}`}><UserCheck className="ml-2 h-4 w-4" />إدارة الطلاب</Link></DropdownMenuItem>
                      <DropdownMenuItem className="text-rose-700 focus:text-rose-700 cursor-pointer" onClick={() => setCourseToDelete(course)}><Trash2 className="ml-2 h-4 w-4" />حذف الدورة</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </section>
              </div>

              <div className="space-y-3 lg:hidden">
                <div className="relative h-[170px] w-full overflow-hidden rounded-[6px] border border-slate-200 bg-slate-100">
                  <CourseImage src={getFileUrl(course.image) || "/images/course-web.png"} alt={normalizeText(course.title)} />
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-bold text-slate-900">{normalizeText(course.title)}</h3>
                  <div className="mt-1">
                    <Badge className="rounded-[6.5px] bg-slate-100 text-slate-700 hover:bg-slate-100">{normalizeText(course.category) || "الفئة"}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-[6.5px] border border-slate-200 p-2 text-right"><p className="text-xs text-slate-500">الطلاب</p><p className="font-semibold text-slate-800">{course.enrolledStudents || 0}/{course.maxStudents || 0}</p></div>
                  <div className="rounded-[6.5px] border border-slate-200 p-2 text-right"><p className="text-xs text-slate-500">السعر</p><p className="font-semibold text-[#2563EB]">{formatPrice(course.price)} ر.ي</p></div>
                  <div className="rounded-[6.5px] border border-slate-200 p-2 text-right"><p className="text-xs text-slate-500">تاريخ البداية</p><p className="font-semibold text-slate-800">{course.startDate ? formatDate(course.startDate) : <span className="text-xs text-amber-600">سيُحدد لاحقًا</span>}</p></div>
                  <div className="rounded-[6.5px] border border-slate-200 p-2 text-right"><p className="text-xs text-slate-500">الحالة</p>{getStatusBadge(course.status)}</div>
                </div>
                <div className="flex justify-start">
                  <DropdownMenu dir="rtl">
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-9 rounded-[6.5px] px-4 text-sm font-semibold">الإجراءات</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="rounded-[6.5px]">
                      <DropdownMenuItem asChild><Link href={`/institute/courses/${course.id}`}><Eye className="ml-2 h-4 w-4" />عرض التفاصيل</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href={`/institute/courses/create?editId=${course.id}`}><Edit className="ml-2 h-4 w-4" />تعديل الدورة</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href={`/institute/students?courseId=${course.id}`}><UserCheck className="ml-2 h-4 w-4" />إدارة الطلاب</Link></DropdownMenuItem>
                      <DropdownMenuItem className="text-rose-700 focus:text-rose-700 cursor-pointer" onClick={() => setCourseToDelete(course)}><Trash2 className="ml-2 h-4 w-4" />حذف الدورة</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <Dialog
        open={!!courseToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setCourseToDelete(null)
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
                  <DialogTitle className="text-lg font-bold text-slate-900">حذف الدورة</DialogTitle>
                  <DialogDescription className="text-sm leading-6 text-slate-600">
                    هل أنت متأكد من حذف دورة ({normalizeText(courseToDelete?.title || "دورة غير معروفة")})؟ لا يمكن التراجع عن هذا الإجراء بعد الحذف.
                  </DialogDescription>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6.5px] bg-red-50 text-red-600">
                  <Trash2 className="h-4 w-4" />
                </div>
              </div>
            </DialogHeader>

            <div className="mt-5 flex items-center justify-start gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-[6.5px] px-4"
                onClick={() => setCourseToDelete(null)}
                disabled={isDeleting}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                className="h-9 rounded-[6.5px] bg-red-600 px-4 text-white hover:bg-red-700"
                onClick={confirmDeleteCourse}
                disabled={isDeleting}
              >
                {isDeleting ? "جاري الحذف..." : "حذف الدورة"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

