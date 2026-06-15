"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { ChevronDown, Users, CalendarDays, Eye, BookOpen, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Course } from "@/types"
import { AdminPageHeader } from "@/components/admin/page-header"
import { adminService } from "@/lib/admin-service"
import { getFileUrl, formatDate } from "@/lib/utils"
import { toast } from "sonner"

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0)
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <div className="relative">
      <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 min-w-[140px] appearance-none rounded-md border border-input bg-background px-4 pl-8 text-sm text-slate-700 outline-none hover:border-blue-200 focus:border-blue-400"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active": return <Badge className="bg-green-100 text-green-800">نشط</Badge>
    case "draft": return <Badge className="bg-yellow-100 text-yellow-800">مسودة</Badge>
    case "completed": return <Badge className="bg-purple-100 text-purple-800">مكتمل</Badge>
    case "pending_review": return <Badge className="bg-blue-100 text-blue-800">قيد المراجعة</Badge>
    case "pending_minimum": return <Badge className="bg-orange-100 text-orange-800">في انتظار الحد الأدنى</Badge>
    default: return <Badge variant="secondary">{status}</Badge>
  }
}

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const data = await adminService.getAllCourses()
      setCourses(data as Course[])
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل في جلب الدورات")
    } finally {
      setLoading(false)
    }
  }

  const filteredCourses = useMemo(() =>
    courses.filter((course) => {
      const matchesStatus = statusFilter === "all" || course.status === statusFilter
      const matchesCategory = categoryFilter === "all" || course.category === categoryFilter
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        course.title.toLowerCase().includes(q) ||
        (course.trainer?.name || "").toLowerCase().includes(q) ||
        (course.institute?.name || "").toLowerCase().includes(q)
      return matchesStatus && matchesCategory && matchesSearch
    }),
    [courses, statusFilter, categoryFilter, searchQuery]
  )

  const uniqueCategories = Array.from(new Set(courses.map((c) => c.category).filter(Boolean)))

  const totalCourses = courses.length
  const activeCourses = courses.filter(c => c.status === 'active').length
  const totalStudents = courses.reduce((acc, c) => acc + (c.enrolledStudents || 0), 0)

  if (loading) return <div className="py-10 text-center">جارِ التحميل...</div>

  return (
    <section dir="rtl" className="min-h-full bg-transparent space-y-6">
      <AdminPageHeader title="إدارة الدورات" description="مراجعة جميع الدورات المسجلة في المنصة (عرض فقط)" />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الدورات</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCourses}</div>
            <p className="text-xs text-muted-foreground">دورة مسجلة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الدورات النشطة</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCourses}</div>
            <p className="text-xs text-muted-foreground">دورة نشطة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلاب</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">طالب مسجل في دورات</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن دورة أو مدرب أو معهد..."
              className="h-10 w-64 rounded-md"
            />
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: "كل الحالات", value: "all" },
                { label: "نشطة", value: "active" },
                { label: "مسودة", value: "draft" },
                { label: "مكتملة", value: "completed" },
                { label: "قيد المراجعة", value: "pending_review" },
                { label: "في انتظار الحد الأدنى", value: "pending_minimum" },
              ]}
            />
            <FilterSelect
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { label: "كل الفئات", value: "all" },
                ...uniqueCategories.map((c) => ({ label: c as string, value: c as string })),
              ]}
            />
          </div>
          <p className="text-sm font-medium text-slate-500">
            {filteredCourses.length} دورة
          </p>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الدورات</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الدورة</TableHead>
                <TableHead>الفئة</TableHead>
                <TableHead>المالك</TableHead>
                <TableHead>الطلاب</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ البداية</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    لا توجد دورات مطابقة للبحث
                  </TableCell>
                </TableRow>
              ) : (
                filteredCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-9 rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
                          {course.image ? (
                            <img
                              src={getFileUrl(course.image) || "/images/course-web.png"}
                              alt={course.title}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = "/images/course-web.png" }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-200">
                              <BookOpen className="h-4 w-4 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-sm line-clamp-2 max-w-[200px]">{course.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{course.category || "-"}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {course.trainer?.name && <div className="font-medium">{course.trainer.name}</div>}
                        {course.institute?.name && <div className="text-gray-500">{course.institute.name}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {course.enrolledStudents || 0}/{course.maxStudents}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(course.status)}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(course.startDate).toLocaleDateString("en-CA")}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold text-blue-600 text-sm">
                      {formatPrice(course.price)} <span className="text-xs font-normal text-blue-400">ر.ي</span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => { setSelectedCourse(course); setDetailOpen(true) }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Course Details Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[680px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الدورة</DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-6">
              {/* Course image */}
              <div className="relative w-full h-48 rounded-xl overflow-hidden bg-slate-100">
                <img
                  src={getFileUrl(selectedCourse.image) || "/images/course-web.png"}
                  alt={selectedCourse.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/images/course-web.png" }}
                />
              </div>

              {/* Title & status */}
              <div>
                <h3 className="text-xl font-bold">{selectedCourse.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusBadge(selectedCourse.status)}
                  {selectedCourse.category && <Badge variant="outline">{selectedCourse.category}</Badge>}
                </div>
              </div>

              {/* Description */}
              {selectedCourse.description && (
                <div>
                  <h4 className="font-semibold mb-1 text-sm text-gray-500">الوصف</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm leading-relaxed">
                    {selectedCourse.description}
                  </p>
                </div>
              )}

              {/* Short Description */}
              {selectedCourse.shortDescription && (
                <div>
                  <h4 className="font-semibold mb-1 text-sm text-gray-500">وصف قصير</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm leading-relaxed">
                    {selectedCourse.shortDescription}
                  </p>
                </div>
              )}

              {/* Prerequisites & Objectives */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedCourse.prerequisites && (
                  <div>
                    <h4 className="font-semibold mb-1 text-sm text-gray-500">المتطلبات الأساسية</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm leading-relaxed">
                      {selectedCourse.prerequisites}
                    </p>
                  </div>
                )}
                {selectedCourse.objectives && selectedCourse.objectives.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-1 text-sm text-gray-500">الأهداف</h4>
                    <ul className="list-disc list-inside text-gray-700 bg-gray-50 p-3 rounded-lg text-sm leading-relaxed">
                      {selectedCourse.objectives.map((obj: string, i: number) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Tags */}
              {selectedCourse.tags && selectedCourse.tags.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-1 text-sm text-gray-500">العلامات (Tags)</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCourse.tags.map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl text-sm">
                <div>
                  <p className="text-gray-500 font-medium mb-1">السعر</p>
                  <p className="font-bold text-blue-600">{formatPrice(selectedCourse.price)} ر.ي</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium mb-1">المدة</p>
                  <p className="font-medium">{selectedCourse.duration} ساعة</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium mb-1">تاريخ البداية</p>
                  <p className="font-medium">{new Date(selectedCourse.startDate).toLocaleDateString("ar-YE")}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium mb-1">تاريخ النهاية</p>
                  <p className="font-medium">{new Date(selectedCourse.endDate).toLocaleDateString("ar-YE")}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium mb-1">عدد الطلاب</p>
                  <p className="font-medium">{selectedCourse.enrolledStudents || 0} / {selectedCourse.maxStudents}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium mb-1">تاريخ الإنشاء</p>
                  <p className="font-medium">{formatDate(selectedCourse.createdAt)}</p>
                </div>
              </div>

              {/* Trainer & Institute */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedCourse.trainer && (
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-xs text-gray-500 font-medium mb-2">المدرب</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                        {(selectedCourse.trainer as any).avatar ? (
                          <img
                            src={getFileUrl((selectedCourse.trainer as any).avatar)}
                            alt={selectedCourse.trainer.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm">
                            {selectedCourse.trainer.name?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{selectedCourse.trainer.name}</p>
                        <p className="text-xs text-gray-500">{selectedCourse.trainer.email}</p>
                      </div>
                    </div>
                  </div>
                )}
                {selectedCourse.institute && (
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-xs text-gray-500 font-medium mb-2">المعهد</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                        {selectedCourse.institute.logo ? (
                          <img
                            src={getFileUrl(selectedCourse.institute.logo)}
                            alt={selectedCourse.institute.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <p className="font-medium text-sm">{selectedCourse.institute.name}</p>
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={() => setDetailOpen(false)} className="w-full">إغلاق</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}

