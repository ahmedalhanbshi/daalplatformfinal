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
import { Plus, Send, MessageSquare, Clock, Pencil, Trash2, Loader2, Users, User, GraduationCap, Building } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { instituteService } from "@/lib/institute-service"
import { toast } from "sonner"

export default function InstituteAnnouncements() {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [trainers, setTrainers] = useState<any[]>([])
  const [directBookers, setDirectBookers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    targetAudience: "STUDENTS", // "STUDENTS" | "TRAINERS"
    courseId: "",
    scheduledAt: "",
    selectedRecipients: [] as string[]
  })

  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true)
      const [annsRes, coursesRes, studentsRes, trainersRes, directBookersRes] = await Promise.all([
        instituteService.getAnnouncements().catch(() => []),
        instituteService.getCourses().catch(() => []),
        instituteService.getStudents().then(res => res.students).catch(() => []),
        instituteService.getTrainers().catch(() => []),
        instituteService.getDirectBookers().catch(() => [])
      ])
      setAnnouncements(annsRes || [])
      setCourses(coursesRes || [])
      setStudents(studentsRes || [])
      setTrainers(trainersRes || [])
      setDirectBookers(directBookersRes || [])
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
    // Silent background poll every 60 seconds
    const interval = setInterval(() => fetchData(true), 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  const resetForm = () => {
    setFormData({
      title: "",
      message: "",
      targetAudience: "STUDENTS",
      courseId: "",
      scheduledAt: "",
      selectedRecipients: []
    })
    setEditingId(null)
  }

  const getCourseStudents = (courseId: string) => {
    if (!courseId || courseId === 'all') return students
    // Assuming students have enrollment info or we filter by the list we have
    // If not directly available in basic student list, we might need a better filter
    return students
  }

  const handleCreateAnnouncement = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error("يرجى إكمال الحقول المطلوبة")
      return
    }

    try {
      setSubmitting(true)
      
      const currentListForCheck = getRecipientList();
      const isAllSelected = formData.selectedRecipients.length > 0 && formData.selectedRecipients.length === currentListForCheck.length;

      const payload: any = {
        title: formData.title,
        message: formData.message,
        targetAudience: formData.targetAudience === 'DIRECT_BOOKERS' ? 'STUDENTS' : formData.targetAudience, // Always use the explicitly chosen audience (map DIRECT_BOOKERS to STUDENTS)
        courseId: ((formData.targetAudience === 'STUDENTS' || formData.targetAudience === 'ALL') && formData.courseId !== 'all') ? formData.courseId : undefined,
        status: formData.scheduledAt ? 'SCHEDULED' : 'SENT',
        scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : undefined,
        recipientIds: formData.selectedRecipients.length > 0 ? formData.selectedRecipients : (formData.targetAudience === 'DIRECT_BOOKERS' ? directBookers.map(b => b.id) : undefined),
      }

      if (editingId) {
        await instituteService.updateAnnouncement(editingId, {
          title: formData.title,
          message: formData.message,
        })
        toast.success("تم تحديث الإعلان")
      } else {
        await instituteService.sendStudentAnnouncement(payload)
        const isScheduled = !!formData.scheduledAt;
        const count = formData.selectedRecipients.length;
        toast.success(
          isScheduled 
            ? (count > 0 ? `تمت جدولة الإعلانات لـ ${count} مستلم` : "تمت جدولة الإعلان بنجاح")
            : (count > 0 ? `تم إرسال الإعلانات لـ ${count} مستلم` : "تم إرسال الإعلان بنجاح")
        )
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

  const handleEditClick = (announcement: any) => {
    setEditingId(announcement.id)
    setFormData({
      title: announcement.title,
      message: announcement.message,
      targetAudience: announcement.targetAudience?.toUpperCase() || "STUDENTS",
      courseId: announcement.courseId || "all",
      scheduledAt: announcement.scheduledAt ? new Date(announcement.scheduledAt).toISOString().slice(0, 16) : "",
      selectedRecipients: announcement.recipientId ? [announcement.recipientId] : []
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
        await instituteService.deleteAnnouncement(announcementToDelete)
        toast.success("تم الحذف بنجاح")
        setIsDeleteDialogOpen(false)
        setAnnouncementToDelete(null)
        fetchData()
      } catch (error: any) {
        toast.error(error.message || "فشل حذف الإعلان")
      } finally {
        setSubmitting(false)
      }
    }
  }

  const getRecipientList = () => {
    const trainersList = trainers.map(t => ({ ...t, type: 'trainer' }));
    const studentsList = (formData.courseId && formData.courseId !== 'all')
      ? students.filter(s => s.enrolledCourses?.some((c: any) => c.courseId === formData.courseId)).map(s => ({ ...s, type: 'student' }))
      : students.map(s => ({ ...s, type: 'student' }));

    if (formData.targetAudience === 'TRAINERS') {
      return trainersList;
    }
    
    if (formData.targetAudience === 'DIRECT_BOOKERS') {
      return directBookers.map(b => ({ ...b, type: 'direct_booker' }));
    }
    
    if (formData.targetAudience === 'ALL') {
      return [...trainersList, ...studentsList];
    }
    
    // Explicitly check for STUDENTS or default to studentsList ONLY if that's the audience
    if (formData.targetAudience === 'STUDENTS') {
      return studentsList;
    }

    // Default to an empty list or studentsList depending on safest assumption
    return formData.targetAudience === 'STUDENTS' ? studentsList : [];
  }

  const toggleRecipientSelection = (id: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedRecipients.includes(id)
      return {
        ...prev,
        selectedRecipients: isSelected
          ? prev.selectedRecipients.filter(rId => rId !== id)
          : [...prev.selectedRecipients, id]
      }
    })
  }

  const toggleAllRecipients = () => {
    const list = getRecipientList();
    const ids = list.map(r => r.id);
    
    if (formData.selectedRecipients.length === ids.length && ids.length > 0) {
      setFormData(prev => ({ ...prev, selectedRecipients: [] }))
    } else {
      setFormData(prev => ({ ...prev, selectedRecipients: ids }))
    }
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">إعلانات المعهد</h1>
          <p className="text-gray-600 mt-2">نشر الإعلانات والتواصل مع المدربين والطلاب</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إعلان جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-right">{editingId ? "تعديل الإعلان" : "إنشاء إعلان جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-right">
              <div>
                <Label htmlFor="title" className="block mb-1">عنوان الإعلان</Label>
                <Input
                  id="title"
                  className="text-right"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="عنوان الإعلان"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <Label className="block mb-1">الجمهور المستهدف</Label>
                   <Select value={formData.targetAudience} onValueChange={(value) => setFormData({ ...formData, targetAudience: value, selectedRecipients: [], courseId: "" })}>
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="اختر الجمهور" />
                    </SelectTrigger>
                    <SelectContent className="text-right">
                      <SelectItem value="STUDENTS">الطلاب</SelectItem>
                      <SelectItem value="TRAINERS">المدربين (إيميل فقط)</SelectItem>
                      <SelectItem value="ALL">الجميع (طلاب + مدربين)</SelectItem>
                      <SelectItem value="DIRECT_BOOKERS">أصحاب الحجز المباشر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.targetAudience === 'STUDENTS' || formData.targetAudience === 'ALL') && (
                  <div>
                    <Label className="block mb-1">تحديد الدورة</Label>
                    <Select value={formData.courseId} onValueChange={(value) => setFormData({ ...formData, courseId: value, selectedRecipients: [] })}>
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="كل الدورات" />
                      </SelectTrigger>
                      <SelectContent className="text-right max-h-[250px]">
                        <SelectItem value="all">جميع الطلاب</SelectItem>
                        {courses.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Recipient Selection Card */}
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-primary">
                    {formData.targetAudience === 'ALL' 
                      ? "تحديد طلاب ومدربين محددين" 
                      : formData.targetAudience === 'TRAINERS' 
                        ? "تحديد مدربين محددين" 
                        : formData.targetAudience === 'DIRECT_BOOKERS'
                          ? "تحديد أصحاب حجز محددين"
                          : "تحديد طلاب محددين"} (اختياري)
                  </Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs h-7 text-primary hover:text-primary/80"
                    onClick={toggleAllRecipients}
                  >
                    {formData.selectedRecipients.length === getRecipientList().length && getRecipientList().length > 0 ? "إلغاء الكل" : "تحديد الكل"}
                  </Button>
                </div>
                
                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {getRecipientList().length > 0 ? (
                    getRecipientList().map(item => (
                      <div key={item.id} className="flex items-center space-x-2 space-x-reverse hover:bg-white p-2 rounded transition-colors border border-transparent hover:border-gray-200">
                        <Checkbox
                          id={`r-${item.id}`}
                          checked={formData.selectedRecipients.includes(item.id)}
                          onCheckedChange={() => toggleRecipientSelection(item.id)}
                        />
                        <Label htmlFor={`r-${item.id}`} className="cursor-pointer flex-1 text-right flex flex-col justify-center py-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{item.name}</span>
                            <Badge variant="secondary" className="text-[10px] py-0 h-4 px-1.5 font-normal">
                              {item.type === 'trainer' ? 'مدرب' : item.type === 'direct_booker' ? 'صاحب حجز' : 'طالب'}
                            </Badge>
                          </div>
                          {item.type === 'direct_booker' && item.bookedHalls?.length > 0 && (
                            <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center">
                              <Building className="h-3 w-3 ml-1 text-primary/70" />
                              <span className="truncate leading-none">حجز: {item.bookedHalls.map((h: any) => h.hallName).join('، ')}</span>
                            </div>
                          )}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-2">لا يوجد بيانات للعرض</p>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground italic text-right">
                  * اتركه فارغًا للإرسال للجميع تلقائيًا. إعلانات المدربين ترسل كإيميل فقط.
                </p>
              </div>

              <div>
                <Label htmlFor="message" className="block mb-1">نص الإعلان</Label>
                <Textarea
                  id="message"
                  className="text-right"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="اكتب نص الإعلان هنا..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="scheduledAt" className="block mb-1">جدولة الإرسال (اختياري)</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  className="text-right"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                />
              </div>

              <Button onClick={handleCreateAnnouncement} className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Send className="h-4 w-4 ml-2" />}
                {editingId ? "تحديث الإعلان" : "نشر الإعلان"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإعلانات</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{announcements.length}</div>
            <p className="text-xs text-muted-foreground">نشاط الإعلانات</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إعلانات الطلاب</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {announcements.filter(a => a.targetAudience === 'STUDENTS' || !a.targetAudience).length}
            </div>
            <p className="text-xs text-muted-foreground">منصة + بريد</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إعلانات المدربين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {announcements.filter(a => a.targetAudience === 'TRAINERS').length}
            </div>
            <p className="text-xs text-muted-foreground">بريد إلكتروني فقط</p>
          </CardContent>
        </Card>
      </div>

      {/* Announcements Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-right">سجل الإعلانات</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الإعلان</TableHead>
                  <TableHead className="text-right">الجمهور</TableHead>
                  <TableHead className="text-right">تاريخ الإرسال</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.length > 0 ? (
                  announcements.map((announcement) => {
                    const isSelective = announcement.title && announcement.title.includes('\u200B');
                    const displayTitle = announcement.title ? announcement.title.replace(/\u200B/g, '') : '';
                    
                    return (
                      <TableRow key={announcement.id}>
                        <TableCell className="text-right">
                          <div className="flex flex-col">
                            <span className="font-semibold">{displayTitle}</span>
                            <p className="text-xs text-gray-500 line-clamp-1 mt-1 italic">{announcement.message}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="gap-1 whitespace-nowrap">
                            {announcement.targetAudience === 'TRAINERS' ? (
                              <>
                                <Users className="h-3 w-3" />
                                {announcement.recipientId ? `خاص: ${announcement.recipient?.name || 'مدرب'}` : (isSelective ? "المدربين (مختارون)" : "المدربين")}
                              </>
                            ) : announcement.targetAudience === 'ALL' ? (
                              <>
                                <Users className="h-3 w-3" />
                                {isSelective ? "الجميع (مختارون)" : "الجميع"}
                              </>
                            ) : (announcement.targetAudience === 'STUDENTS' || !announcement.targetAudience) ? (
                              <>
                                <GraduationCap className="h-3 w-3" />
                                {announcement.recipientId ? `خاص: ${announcement.recipient?.name || 'طالب'}` : (isSelective ? "الطلاب (مختارون)" : "الطلاب")}
                              </>
                            ) : (
                              <>
                                <User className="h-3 w-3" />
                                {announcement.recipient?.name ? `خاص: ${announcement.recipient.name}` : "إعلانات خاصة"}
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatDate(announcement.sentAt || announcement.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {announcement.status?.toUpperCase() === 'SENT' ? (
                            <Badge className="bg-green-100 text-green-800 border-none hover:bg-green-100">مرسل</Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 border-none hover:bg-blue-100">مجدول</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 justify-start">
                            <Button variant="ghost" size="sm" onClick={() => handleEditClick(announcement)}>
                              <Pencil className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(announcement.id)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      لا يوجد سجل إعلانات حالياً
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-right">تأكيد الحذف</DialogTitle>
            <DialogDescription className="text-right">
              هل أنت متأكد من رغبتك في حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 justify-start flex-row-reverse">
            <DialogClose asChild>
              <Button variant="outline">إلغاء</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

