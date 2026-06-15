"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Mail, MessageSquare, Eye, ArrowLeft, Send, UserCheck, Phone, Calendar, BookOpen, Trash2, Loader2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useState, useEffect } from "react"
import { instituteService } from "@/lib/institute-service"
import { trainerService } from "@/lib/trainer-service"
import { toast } from "sonner"

interface CourseStudentsManagerProps {
  courseId: string
  backLink: string
  backText: string
  fetchStudentsOverride?: (courseId: string) => Promise<any>
  unenrollOverride?: (courseId: string, enrollmentId: string, reason: string) => Promise<any>
}

interface EnrollmentData {
  id: string
  studentId: string
  courseId: string
  enrolledAt: string
  status: string
  student: {
    id: string
    name: string
    email: string
    phone?: string | null
  }
}

export default function CourseStudentsManager({ courseId, backLink, backText, fetchStudentsOverride, unenrollOverride }: CourseStudentsManagerProps) {
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([])
  const [courseTitle, setCourseTitle] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [showNotificationDialog, setShowNotificationDialog] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [notificationData, setNotificationData] = useState({
    title: "",
    message: "",
    type: "announcement",
  })
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false)

  // Delete State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<EnrollmentData | null>(null)
  const [cancellationReason, setCancellationReason] = useState("")

  // Student Details Dialog State
  const [viewStudent, setViewStudent] = useState<EnrollmentData | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError("")
      const isTrainer = backLink.includes('/trainer/')
      const service = isTrainer ? trainerService : instituteService
      const data = fetchStudentsOverride
        ? await fetchStudentsOverride(courseId)
        : await service.getCourseStudents(courseId)
      setCourseTitle(data.course?.title || "")
      setEnrollments(data.enrollments || [])
    } catch (err: any) {
      setError(err?.response?.data?.message || "فش�„ ف�Š جلب بيانات الطلاب")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [courseId])

  const activeEnrollments = enrollments.filter(e => e.status === 'active')

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'مستمر'
      case 'cancelled': return 'ملغى'
      case 'preliminary': return 'مبدئي'
      case 'pending_payment': return 'بانتظار ا�„دفع'
      case 'reject_payment': return 'دفع �…رف�ˆض'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-700 hover:bg-green-200 border-transparent shadow-none'
      case 'cancelled': return 'bg-red-100 text-red-700 hover:bg-red-200 border-transparent shadow-none'
      case 'preliminary': return 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-transparent shadow-none'
      case 'pending_payment': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-transparent shadow-none'
      case 'reject_payment': return 'bg-red-100 text-red-700 hover:bg-red-200 border-transparent shadow-none'
      default: return 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-transparent shadow-none'
    }
  }

  const handleDeleteClick = (enrollment: EnrollmentData) => {
    setStudentToDelete(enrollment)
    setCancellationReason("")
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return
    try {
      const isTrainer = backLink.includes('/trainer/')
      const service = isTrainer ? trainerService : instituteService
      if (unenrollOverride) {
        await unenrollOverride(courseId, studentToDelete.id, cancellationReason)
      } else {
        await service.unenrollStudent(courseId, studentToDelete.id, cancellationReason)
      }
      setEnrollments(enrollments.map(e =>
        e.id === studentToDelete.id ? { ...e, status: 'cancelled' } : e
      ))
      toast.success("تم إلغاء تسجيل الطالب بنجاح")
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فش�„ ف�Š إلغاء التسجيل")
    }
    setIsDeleteDialogOpen(false)
    setStudentToDelete(null)
    setCancellationReason("")
  }

  const handleSendNotification = async () => {
    if (!notificationData.title || !notificationData.message || selectedStudents.length === 0) {
      toast.error("يرجى التأكد من إدخال البيانات واختيار الطلاب");
      return;
    }

    try {
      setIsSendingAnnouncement(true);
      const isTrainer = backLink.includes('/trainer/')
      const service = isTrainer ? trainerService : instituteService

      console.log(`[Notification] Dispatching announcements for ${selectedStudents.length} students using ${isTrainer ? 'Trainer' : 'Institute'} service...`);

      const promises = selectedStudents.map(studentId => 
        service.sendStudentAnnouncement({
          title: notificationData.title,
          message: notificationData.message,
          recipientId: studentId
        })
      );

      await Promise.all(promises);

      toast.success(`تم إرسال الإشعار بنجاح إلى ${selectedStudents.length} طالب`);
      setShowNotificationDialog(false);
      setSelectedStudents([]);
      setNotificationData({ title: "", message: "", type: "announcement" });
    } catch (err: any) {
      console.error('[Notification] FAILED:', err);
      toast.error(err?.response?.data?.message || "فش�„ إرسال الإشعارات للطلاب");
    } finally {
      setIsSendingAnnouncement(false);
    }
  }

  const handleSelectAll = () => {
    if (selectedStudents.length === activeEnrollments.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(activeEnrollments.map(e => e.studentId))
    }
  }

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleViewStudent = (enrollment: EnrollmentData) => {
    setViewStudent(enrollment)
    setShowDetailsDialog(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل بيانات الطلاب...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
        <Button onClick={fetchData}>إعادة المحاولة</Button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={backLink}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backText}
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          إدارة المسجّلين
        </h1>
        <p className="text-gray-600">
          {courseTitle}
        </p>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">إلغاء تسجيل طالب</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رغبتك ف�Š إلغاء تسجيل الطالب {studentToDelete?.student.name} من هذه الدورة؟
              <br />
              هذا الإجراء سيقوم بإزالة الطالب من قائمة المسجلين ف�Š هذه الدورة ف�‚ط.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Label htmlFor="cancellation-reason" className="text-sm font-medium">
              سبب إلغاء التسجيل <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="cancellation-reason"
              placeholder="يرجى كتابة سبب استبعاد الطالب من الدورة..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-gray-500">
              {cancellationReason.length < 5 ? (
                <span className="text-red-500">يجب كتابة 5 أحرف على الأقل</span>
              ) : (
                <span className="text-green-600">السبب مقبول</span>
              )}
            </p>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={cancellationReason.trim().length < 5}
            >
              نعم، إلغاء التسجيل
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">إجمالي المسجّلين</p>
                <p className="text-2xl font-bold">{enrollments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">طلاب نشطين</p>
                <p className="text-2xl font-bold">{activeEnrollments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mb-6">
        <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
          <DialogTrigger asChild>
            <Button
              disabled={selectedStudents.length === 0}
              onClick={() => setShowNotificationDialog(true)}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              إرسال إشعار ({selectedStudents.length})
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إرسال إشعار للطلاب</DialogTitle>
              <DialogDescription>
                أرسل إشعاراً للطلاب المحددين ({selectedStudents.length} طالب)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notification-title">عنوان الإشعار</Label>
                <Input
                  id="notification-title"
                  placeholder="مثال: تذكير بموعد الدرس"
                  value={notificationData.title}
                  onChange={(e) => setNotificationData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification-message">نص الإشعار</Label>
                <Textarea
                  id="notification-message"
                  placeholder="اكتب رسالة الإشعار..."
                  value={notificationData.message}
                  onChange={(e) => setNotificationData(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>نوع الإشعار</Label>
                <Select
                  value={notificationData.type}
                  onValueChange={(value) => setNotificationData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">إعلان عام</SelectItem>
                    <SelectItem value="reminder">تذكير</SelectItem>
                    <SelectItem value="update">تحديث</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowNotificationDialog(false)} disabled={isSendingAnnouncement}>
                  إلغاء
                </Button>
                <Button onClick={handleSendNotification} disabled={isSendingAnnouncement}>
                  {isSendingAnnouncement ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      إرسال الإشعار
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline">
          <Mail className="mr-2 h-4 w-4" />
          تصدير قائمة الطلاب
        </Button>
      </div>

      {/* Student Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>تفاص�Š�„ الطالب</DialogTitle>
          </DialogHeader>
          {viewStudent && (
            <div className="space-y-6">
              <div className="flex items-start justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <Users className="h-8 w-8 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{viewStudent.student.name}</h3>
                    <div className="flex items-center gap-2 text-gray-500 mt-1">
                      <Mail className="h-4 w-4" />
                      <span>{viewStudent.student.email}</span>
                    </div>
                    {viewStudent.student.phone && (
                      <div className="flex items-center gap-2 text-gray-500 mt-1">
                        <Phone className="h-4 w-4" />
                        <span>{viewStudent.student.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className={`px-3 py-1 ${getStatusColor(viewStudent.status)}`}>
                  {getStatusLabel(viewStudent.status)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">تاريخ التسجيل</span>
                  </div>
                  <p className="text-gray-900">{formatDate(viewStudent.enrolledAt)}</p>
                </div>

              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">ملاحظات وإجراءات سريعة</h4>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => {
                    setShowDetailsDialog(false)
                    setSelectedStudents([viewStudent.studentId])
                    setShowNotificationDialog(true)
                  }}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    إرسال رسالة
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <UserCheck className="mr-2 h-4 w-4" />
                    تحديث الحالة
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الطلاب المسجّلين</CardTitle>
          <CardDescription>
            جميع الطلاب المسجّلين ف�Š الدورة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedStudents.length === activeEnrollments.length && activeEnrollments.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                    aria-label="تحديد جميع الطلاب"
                  />
                </TableHead>
                <TableHead>الطالب</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ التسجيل</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell>
                    {enrollment.status === 'active' && (
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(enrollment.studentId)}
                        onChange={() => handleSelectStudent(enrollment.studentId)}
                        className="rounded"
                        aria-label={`تحديد الطالب ${enrollment.student.name}`}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{enrollment.student.name}</div>
                      <div className="text-sm text-gray-500">{enrollment.student.email}</div>
                      {enrollment.student.phone && (
                        <div className="text-sm text-gray-500">{enrollment.student.phone}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(enrollment.status)}>
                      {getStatusLabel(enrollment.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDate(enrollment.enrolledAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewStudent(enrollment)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {enrollment.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectStudent(enrollment.studentId)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}

                      {enrollment.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          onClick={() => handleDeleteClick(enrollment)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {enrollments.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                لا يوجد طلاب مسجّلين
              </h3>
              <p className="text-gray-500">
                لم يسجل أي طالب ف�Š هذه الدورة بعد
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ملخص التسجيل</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">نشطين:</span>
                <span className="font-medium text-green-600">
                  {activeEnrollments.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ملغيين:</span>
                <span className="font-medium text-red-600">
                  {enrollments.filter(e => e.status === 'cancelled').length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">إحصائيات التسجيل</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">إجمالي التسجيلات:</span>
                <span className="font-medium">{enrollments.length}</span>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

