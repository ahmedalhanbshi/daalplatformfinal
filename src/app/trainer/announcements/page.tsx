"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Send, MessageSquare, Clock, Pencil, Trash2, Loader2, MegaphoneOff, CalendarDays, X } from "lucide-react"
import { Announcement } from "@/types"
import { formatDate } from "@/lib/utils"
import { trainerService } from "@/lib/trainer-service"
import { toast } from "sonner"

const radiusClass = "rounded-[6.5px]"

export default function TrainerAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    courseId: "",
    scheduledAt: "",
    selectedStudents: [] as string[],
  })
  const [validationErrors, setValidationErrors] = useState<{ title?: string; message?: string }>({})

  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true)
      const [annsRes, coursesRes, studentsRes] = await Promise.all([
        trainerService.getAnnouncements().catch(() => []),
        trainerService.getCourses().catch(() => []),
        trainerService.getAllStudents(),
      ])
      setAnnouncements(annsRes || [])
      setCourses(coursesRes || [])
      setStudents(studentsRes?.students || [])
    } catch (error) {
      if (!isSilent) {
        console.error("Fetch error:", error)
        toast.error("حدث خطأ أثناء جلب البيانات")
      }
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(true), 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  const resetForm = () => {
    setFormData({
      title: "",
      message: "",
      courseId: "",
      scheduledAt: "",
      selectedStudents: [],
    })
    setEditingId(null)
    setValidationErrors({})
  }

  const getCourseStudents = (courseId: string) => {
    if (!courseId || courseId === "all") return []
    return students.filter((s) => s.enrollments?.some((e: any) => e.courseId === courseId))
  }

  const handleCreateAnnouncement = async () => {
    const errors: { title?: string; message?: string } = {}
    if (!formData.title.trim()) errors.title = "عنوان الإعلان مطلوب"
    if (!formData.message.trim()) errors.message = "نص الإعلان مطلوب"
    setValidationErrors(errors)

    if (Object.keys(errors).length > 0) {
      toast.error("يرجى إكمال الحقول المطلوبة")
      return
    }

    try {
      setSubmitting(true)

      const payload: any = {
        title: formData.title,
        message: formData.message,
        courseId: formData.courseId === "all" ? undefined : formData.courseId,
        status: formData.scheduledAt ? "SCHEDULED" : "SENT",
        scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : undefined,
      }

      const courseStudents = getCourseStudents(formData.courseId)
      const isAllSelected = formData.selectedStudents.length > 0 && formData.selectedStudents.length === courseStudents.length
      const finalSelectedStudents = isAllSelected ? [] : formData.selectedStudents

      if (editingId) {
        await trainerService.updateAnnouncement(editingId, {
          title: formData.title,
          message: formData.message,
        })
        toast.success("تم تحديث الإعلان")
      } else {
        if (finalSelectedStudents.length > 0) {
          await trainerService.sendStudentAnnouncement({ ...payload, recipientIds: finalSelectedStudents })
          const isScheduled = !!formData.scheduledAt
          const count = finalSelectedStudents.length
          toast.success(isScheduled ? `تمت جدولة إعلان لـ ${count} طلاب بنجاح` : `تم إرسال إعلان لـ ${count} طلاب بنجاح`)
        } else {
          await trainerService.sendStudentAnnouncement(payload)
          const isScheduled = !!formData.scheduledAt
          toast.success(isScheduled ? "تمت جدولة الإعلان بنجاح" : "تم إرسال الإعلان بنجاح")
        }
      }

      resetForm()
      setIsCreateDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.message || "فشل في حفظ الإعلان")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditClick = (announcement: Announcement) => {
    setEditingId(announcement.id)
    setFormData({
      title: announcement.title,
      message: announcement.message,
      courseId: announcement.courseId || "all",
      scheduledAt: announcement.scheduledAt ? new Date(announcement.scheduledAt).toISOString().slice(0, 16) : "",
      selectedStudents: announcement.recipientId ? [announcement.recipientId] : [],
    })
    setIsCreateDialogOpen(true)
  }

  const handleDeleteClick = (id: string) => {
    setAnnouncementToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (announcementToDelete) {
      try {
        setSubmitting(true)
        await trainerService.deleteAnnouncement(announcementToDelete)
        toast.success("تم الحذف بنجاح")
        setIsDeleteDialogOpen(false)
        setAnnouncementToDelete(null)
        fetchData()
      } catch (error: any) {
        toast.error(error.response?.data?.message || error.message || "فشل حذف الإعلان")
      } finally {
        setSubmitting(false)
      }
    }
  }

  const getCourseTitle = (courseId: string) => {
    return courses.find((c) => c.id === courseId)?.title || "جميع طلابي"
  }

  const toggleStudentSelection = (studentId: string) => {
    setFormData((prev) => {
      const isSelected = prev.selectedStudents.includes(studentId)
      return {
        ...prev,
        selectedStudents: isSelected ? prev.selectedStudents.filter((id) => id !== studentId) : [...prev.selectedStudents, studentId],
      }
    })
  }

  const toggleAllStudents = () => {
    const courseStudents = getCourseStudents(formData.courseId)
    const studentIds = courseStudents.map((s) => s.id)

    if (formData.selectedStudents.length === studentIds.length && studentIds.length > 0) {
      setFormData((prev) => ({ ...prev, selectedStudents: [] }))
    } else {
      setFormData((prev) => ({ ...prev, selectedStudents: studentIds }))
    }
  }

  return (
    <div className="space-y-4 text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">الإعلانات والتواصل</h1>
          <p className="mt-1 text-gray-600">إرسال إعلانات وتواصل مع طلاب دوراتك</p>
        </div>

        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button className={`h-10 gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] ${radiusClass}`}>
              <Plus className="h-4 w-4" />
              إعلان جديد
            </Button>
          </DialogTrigger>

          <DialogContent dir="rtl" className={`sm:max-w-[640px] border-[#E5EAF2] bg-white p-6 ${radiusClass} [&>button]:hidden`}>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`absolute left-4 top-4 h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-600 ${radiusClass}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>

            <DialogHeader className="space-y-1">
              <DialogTitle className="w-full text-right text-xl font-bold text-slate-900">{editingId ? "تعديل الإعلان" : "إنشاء إعلان جديد"}</DialogTitle>
              <DialogDescription className="w-full text-right text-sm text-slate-500">أرسل إعلانًا لطلاب دورة محددة أو جدوله لاحقًا.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-right">
              <div className="space-y-1.5">
                <Label htmlFor="title" className={`text-sm font-medium ${validationErrors.title ? "text-red-600" : "text-slate-700"}`}>عنوان الإعلان</Label>
                <Input
                  id="title"
                  className={`h-11 text-right placeholder:text-[#94A3B8] focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:border-blue-500 ${validationErrors.title ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-100" : "border-[#E5EAF2]"} ${radiusClass}`}
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value })
                    if (validationErrors.title) {
                      setValidationErrors((prev) => ({ ...prev, title: e.target.value.trim() ? undefined : "عنوان الإعلان مطلوب" }))
                    }
                  }}
                  placeholder="عنوان الإعلان"
                />
                {validationErrors.title ? <p className="text-xs text-red-600">{validationErrors.title}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="course" className="text-sm font-medium text-slate-700">الدورة المستهدفة</Label>
                <Select value={formData.courseId} onValueChange={(value) => setFormData({ ...formData, courseId: value, selectedStudents: [] })}>
                  <SelectTrigger className={`h-11 border-[#E5EAF2] text-right focus:ring-2 focus:ring-blue-100 focus:ring-offset-0 ${radiusClass}`}>
                    <SelectValue placeholder="اختر الدورة" className="text-[#94A3B8]" />
                  </SelectTrigger>
                  <SelectContent className={`max-h-[300px] border-[#E5EAF2] text-right ${radiusClass}`}>
                    <SelectItem value="all">جميع طلابي</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.courseId && formData.courseId !== "all" && (
                <div className={`space-y-3 border border-[#E5EAF2] bg-slate-50 p-4 ${radiusClass}`}>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-blue-700">تحديد طلاب من الدورة (اختياري)</Label>
                    <Button type="button" variant="ghost" size="sm" className={`h-8 px-2 text-xs text-blue-700 hover:text-blue-800 ${radiusClass}`} onClick={toggleAllStudents}>
                      {formData.selectedStudents.length === getCourseStudents(formData.courseId).length && getCourseStudents(formData.courseId).length > 0 ? "إلغاء الكل" : "تحديد الكل"}
                    </Button>
                  </div>

                  <div className="custom-scrollbar max-h-[220px] space-y-2 overflow-y-auto pr-1">
                    {getCourseStudents(formData.courseId).length > 0 ? (
                      getCourseStudents(formData.courseId).map((student) => (
                        <div key={student.id} className={`flex items-center gap-2 border border-transparent bg-white p-2 transition-colors hover:border-[#E5EAF2] ${radiusClass}`}>
                          <Checkbox id={`student-${student.id}`} checked={formData.selectedStudents.includes(student.id)} onCheckedChange={() => toggleStudentSelection(student.id)} />
                          <Label htmlFor={`student-${student.id}`} className="flex-1 cursor-pointer text-right text-sm font-normal">{student.name}</Label>
                        </div>
                      ))
                    ) : (
                      <p className="py-2 text-center text-sm text-gray-500">لا يوجد طلاب مسجلين في هذه الدورة حاليًا</p>
                    )}
                  </div>
                  <p className="text-right text-[10px] italic text-muted-foreground">* اتركه فارغًا للإرسال لجميع طلاب الدورة تلقائيًا.</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="message" className={`text-sm font-medium ${validationErrors.message ? "text-red-600" : "text-slate-700"}`}>نص الإعلان</Label>
                <Textarea
                  id="message"
                  className={`min-h-[110px] text-right placeholder:text-[#94A3B8] focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:border-blue-500 ${validationErrors.message ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-100" : "border-[#E5EAF2]"} ${radiusClass}`}
                  value={formData.message}
                  onChange={(e) => {
                    setFormData({ ...formData, message: e.target.value })
                    if (validationErrors.message) {
                      setValidationErrors((prev) => ({ ...prev, message: e.target.value.trim() ? undefined : "نص الإعلان مطلوب" }))
                    }
                  }}
                  placeholder="اكتب نص الإعلان..."
                />
                {validationErrors.message ? <p className="text-xs text-red-600">{validationErrors.message}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="scheduledAt" className="text-sm font-medium text-slate-700">جدولة الإرسال (اختياري)</Label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    className={`h-11 border-[#E5EAF2] pr-10 text-right focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:border-blue-500 ${radiusClass}`}
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-2 flex-row justify-start gap-2 border-t border-[#E5EAF2] pt-4">
              <Button type="button" className={`h-10 bg-[#2563eb] hover:bg-[#1d4ed8] ${radiusClass}`} onClick={handleCreateAnnouncement} disabled={submitting}>
                {submitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Send className="ml-2 h-4 w-4" />}
                {editingId ? "تحديث الإعلان" : "إرسال الإعلان"}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline" className={`h-10 border-[#E5EAF2] ${radiusClass}`}>إلغاء</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className={`border-[#E5EAF2] bg-white shadow-sm ${radiusClass}`}>
          <CardHeader className="flex h-[72px] flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">إجمالي الإعلانات</CardTitle>
            <div className={`flex h-8 w-8 items-center justify-center bg-blue-50 text-blue-600 ${radiusClass}`}>
              <MessageSquare className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{announcements.length}</div>
            <p className="text-xs text-slate-500">إعلانات مرسلة</p>
          </CardContent>
        </Card>

        <Card className={`border-[#E5EAF2] bg-white shadow-sm ${radiusClass}`}>
          <CardHeader className="flex h-[72px] flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">الإعلانات المرسلة</CardTitle>
            <div className={`flex h-8 w-8 items-center justify-center bg-emerald-50 text-emerald-600 ${radiusClass}`}>
              <Send className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{announcements.filter((a) => a.status?.toUpperCase() === "SENT").length}</div>
            <p className="text-xs text-slate-500">تم الإرسال</p>
          </CardContent>
        </Card>

        <Card className={`border-[#E5EAF2] bg-white shadow-sm ${radiusClass}`}>
          <CardHeader className="flex h-[72px] flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">مجدولة</CardTitle>
            <div className={`flex h-8 w-8 items-center justify-center bg-amber-50 text-amber-600 ${radiusClass}`}>
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{announcements.filter((a) => a.status?.toUpperCase() === "SCHEDULED").length}</div>
            <p className="text-xs text-slate-500">في انتظار الإرسال</p>
          </CardContent>
        </Card>
      </div>

      <Card className={`border-[#E5EAF2] bg-white shadow-sm ${radiusClass}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-right text-lg">قائمة الإعلانات</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="h-11 text-right font-semibold text-slate-700">الإعلان</TableHead>
                  <TableHead className="h-11 text-right font-semibold text-slate-700">الدورة</TableHead>
                  <TableHead className="h-11 text-right font-semibold text-slate-700">تاريخ الإنشاء</TableHead>
                  <TableHead className="h-11 text-right font-semibold text-slate-700">حالة الإرسال</TableHead>
                  <TableHead className="h-11 text-left font-semibold text-slate-700">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.length > 0 ? (
                  announcements.map((announcement) => {
                    const isSelective = announcement.title && announcement.title.includes("\u200B")
                    const displayTitle = announcement.title ? announcement.title.replace(/\u200B/g, "") : ""

                    return (
                      <TableRow key={announcement.id} className="hover:bg-slate-50/60">
                        <TableCell className="text-right align-top">
                          <div>
                            <div className="flex items-center gap-2 font-medium text-slate-900">
                              {displayTitle}
                              {isSelective && (
                                <Badge variant="secondary" className={`h-5 px-2 py-0 text-[10px] font-normal ${radiusClass}`}>
                                  مختارون
                                </Badge>
                              )}
                            </div>
                            <div className="line-clamp-1 text-sm text-gray-500">{announcement.message}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={`border-[#E5EAF2] ${radiusClass}`}>
                            {announcement.recipient?.name ? `خاص: ${announcement.recipient.name}` : getCourseTitle(announcement.courseId || "")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatDate(announcement.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          {announcement.status?.toUpperCase() === "SENT" ? (
                            <Badge className={`border-none bg-green-100 text-green-800 ${radiusClass}`}>مرسل</Badge>
                          ) : announcement.status?.toUpperCase() === "SCHEDULED" ? (
                            <Badge className={`border-none bg-blue-100 text-blue-800 ${radiusClass}`}>مجدول</Badge>
                          ) : (
                            <Badge className={`border-none bg-yellow-100 text-yellow-800 ${radiusClass}`}>مسودة</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-start gap-2">
                            <Button variant="ghost" size="sm" className={radiusClass} onClick={() => handleEditClick(announcement)}>
                              <Pencil className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" className={radiusClass} onClick={() => handleDeleteClick(announcement.id)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-14">
                      <div className="flex flex-col items-center justify-center gap-2 text-center">
                        <div className={`flex h-10 w-10 items-center justify-center border border-[#E5EAF2] bg-slate-50 text-slate-500 ${radiusClass}`}>
                          <MegaphoneOff className="h-5 w-5" />
                        </div>
                        <p className="text-base font-semibold text-slate-800">لا توجد إعلانات حتى الآن</p>
                        <p className="text-sm text-slate-500">ابدأ بإنشاء إعلان جديد للتواصل مع طلاب دوراتك</p>
                        <Button
                          type="button"
                          size="sm"
                          className={`mt-1 h-9 bg-[#2563eb] hover:bg-[#1d4ed8] ${radiusClass}`}
                          onClick={() => {
                            resetForm()
                            setIsCreateDialogOpen(true)
                          }}
                        >
                          إنشاء إعلان
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent dir="rtl" className={`${radiusClass} border-[#E5EAF2] bg-white p-6`}>
          <DialogHeader>
            <DialogTitle className="text-right">تأكيد الحذف</DialogTitle>
            <DialogDescription className="text-right">هل أنت متأكد من رغبتك في حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse justify-start gap-2">
            <DialogClose asChild>
              <Button variant="outline" className={`${radiusClass} border-[#E5EAF2]`}>إلغاء</Button>
            </DialogClose>
            <Button variant="destructive" className={radiusClass} onClick={confirmDelete} disabled={submitting}>
              {submitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

