"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Users, BookOpen, UserX, UserCheck, Settings, KeyRound } from "lucide-react"
import { User } from "@/types"
import { formatDate, getFileUrl } from "@/lib/utils"
import { AdminPageHeader } from "@/components/admin/page-header"
import { adminService } from "@/lib/admin-service"
import { toast } from "sonner"

type DialogType = 'view' | 'editCredentials' | 'suspend' | 'reactivate' | null

export default function AdminStudents() {
  const [students, setStudents] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null)
  const [dialogType, setDialogType] = useState<DialogType>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Edit credentials form
  const [credForm, setCredForm] = useState({ email: "", password: "", confirmPassword: "" })
  const [credError, setCredError] = useState("")
  const [credLoading, setCredLoading] = useState(false)

  // Suspend form
  const [suspendReason, setSuspendReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      setLoading(true)
      const data = await adminService.getAllStudents()
      setStudents(data)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل تحميل بيانات الطلاب")
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = useMemo(() =>
    students.filter((s) => {
      const matchesStatus = statusFilter === "all" || s.status === statusFilter
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone || "").toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    }),
    [students, searchQuery, statusFilter]
  )

  const openDialog = (student: User, type: DialogType) => {
    setSelectedStudent(student)
    setDialogType(type)
    if (type === "editCredentials") {
      setCredForm({ email: student.email, password: "", confirmPassword: "" })
      setCredError("")
    }
    if (type === "suspend") setSuspendReason("")
  }

  const closeDialog = () => {
    setDialogType(null)
    setSelectedStudent(null)
    setCredError("")
  }

  const handleSaveCredentials = async () => {
    if (!selectedStudent) return
    setCredError("")
    if (!credForm.email) { setCredError("البريد الإلكتروني مطلوب"); return }
    if (credForm.password && credForm.password !== credForm.confirmPassword) {
      setCredError("كلمة المرور وتأكيدها غير متطابقين")
      return
    }
    try {
      setCredLoading(true)
      const payload: any = { email: credForm.email }
      if (credForm.password) payload.password = credForm.password
      await adminService.updateStudent(selectedStudent.id, payload)
      toast.success("تم تحديث بيانات الدخول بنجاح")
      closeDialog()
      loadStudents()
    } catch (err: any) {
      setCredError(err?.response?.data?.message || "فشل تحديث البيانات")
    } finally {
      setCredLoading(false)
    }
  }

  const handleSuspend = async () => {
    if (!selectedStudent || !suspendReason.trim()) return
    try {
      setActionLoading(true)
      await adminService.suspendStudent(selectedStudent.id, suspendReason)
      toast.success("تم تعليق الحساب بنجاح")
      closeDialog()
      loadStudents()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل تعليق الحساب")
    } finally {
      setActionLoading(false)
    }
  }

  const handleReactivate = async () => {
    if (!selectedStudent) return
    try {
      setActionLoading(true)
      await adminService.reactivateStudent(selectedStudent.id)
      toast.success("تم إعادة تنشيط الحساب بنجاح")
      closeDialog()
      loadStudents()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل إعادة التنشيط")
    } finally {
      setActionLoading(false)
    }
  }

  const totalStudents = students.length
  const activeStudents = students.filter((s) => s.status === "active").length
  const suspendedStudents = students.filter((s) => s.status === "suspended").length

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="إدارة الطلاب" description="مراجعة وإدارة الطلاب المسجلين في المنصة" />
        <div className="flex justify-center p-12">
          <p>جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="إدارة الطلاب"
        description="مراجعة وإدارة الطلاب المسجلين في المنصة"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلاب</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">طالب مسجل</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الطلاب النشطين</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStudents}</div>
            <p className="text-xs text-muted-foreground">حساب نشط</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الحسابات المعلقة</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suspendedStudents}</div>
            <p className="text-xs text-muted-foreground">حساب معلق</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="البحث بالاسم أو البريد الإلكتروني أو رقم الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="suspended">معلق</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الطلاب ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الطالب</TableHead>
                <TableHead>رقم الهاتف</TableHead>
                <TableHead>تاريخ التسجيل</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    لا يوجد طلاب مطابقون للبحث
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden">
                          {student.avatar ? (
                            <img
                              src={getFileUrl(student.avatar)}
                              alt={student.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none"
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-sm">
                              {student.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {student.phone || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(student.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          student.status === "active"
                            ? "bg-green-100 text-green-800"
                            : student.status === "suspended"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-gray-100 text-gray-600"
                        }
                      >
                        {student.status === "active"
                          ? "نشط"
                          : student.status === "suspended"
                          ? "معلق"
                          : student.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* View */}
                        <Button
                          variant="outline"
                          size="sm"
                          title="عرض التفاصيل"
                          onClick={() => openDialog(student, "view")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {/* Edit credentials */}
                        <Button
                          variant="outline"
                          size="sm"
                          title="تعديل بيانات الدخول"
                          onClick={() => openDialog(student, "editCredentials")}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        {/* Suspend / Reactivate */}
                        {student.status === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            title="تعليق الحساب"
                            onClick={() => openDialog(student, "suspend")}
                            className="border-orange-300 text-orange-600 hover:bg-orange-50"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        ) : student.status === "suspended" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            title="إعادة تنشيط الحساب"
                            onClick={() => openDialog(student, "reactivate")}
                            className="border-green-300 text-green-600 hover:bg-green-50"
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── View Details Dialog ── */}
      <Dialog open={dialogType === "view"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الطالب</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              {/* Avatar + basic */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                  {selectedStudent.avatar ? (
                    <img
                      src={getFileUrl(selectedStudent.avatar)}
                      alt={selectedStudent.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-bold">
                      {selectedStudent.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{selectedStudent.name}</h3>
                  <p className="text-gray-600 text-sm">{selectedStudent.email}</p>
                  <p className="text-gray-500 text-sm">{selectedStudent.phone || "لا يوجد رقم هاتف"}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge
                      className={
                        selectedStudent.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-orange-100 text-orange-800"
                      }
                    >
                      {selectedStudent.status === "active" ? "نشط" : "معلق"}
                    </Badge>
                    <Badge variant="outline">{selectedStudent.role}</Badge>
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl text-sm">
                <div>
                  <p className="text-gray-500 font-medium mb-1">تاريخ التسجيل</p>
                  <p>{formatDate(selectedStudent.createdAt)}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium mb-1">حالة الحساب</p>
                  <p>{selectedStudent.status === "active" ? "نشط" : selectedStudent.status === "suspended" ? "معلق" : selectedStudent.status}</p>
                </div>
              </div>

              <Button onClick={closeDialog} className="w-full">إغلاق</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Credentials Dialog ── */}
      <Dialog open={dialogType === "editCredentials"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تعديل بيانات الدخول</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                تعديل بيانات دخول الطالب: <strong>{selectedStudent.name}</strong>
              </p>
              {credError && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{credError}</p>
              )}
              <div>
                <Label htmlFor="s-email">البريد الإلكتروني الجديد</Label>
                <Input
                  id="s-email"
                  type="email"
                  value={credForm.email}
                  onChange={(e) => setCredForm({ ...credForm, email: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="s-password">كلمة المرور الجديدة</Label>
                <Input
                  id="s-password"
                  type="password"
                  value={credForm.password}
                  onChange={(e) => setCredForm({ ...credForm, password: e.target.value })}
                  placeholder="اتركها فارغة إذا لم ترد التغيير"
                  className="mt-1"
                />
              </div>
              {credForm.password && (
                <div>
                  <Label htmlFor="s-confirm">تأكيد كلمة المرور</Label>
                  <Input
                    id="s-confirm"
                    type="password"
                    value={credForm.confirmPassword}
                    onChange={(e) => setCredForm({ ...credForm, confirmPassword: e.target.value })}
                    className="mt-1"
                  />
                </div>
              )}
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
                <Button onClick={handleSaveCredentials} disabled={credLoading}>
                  {credLoading ? "جاري الحفظ..." : "حفظ التغييرات"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Suspend Dialog ── */}
      <Dialog open={dialogType === "suspend"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تعليق الحساب</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-orange-800">
                  هل أنت متأكد من تعليق حساب الطالب <strong>{selectedStudent.name}</strong>؟
                </p>
                <p className="text-sm text-orange-600 mt-1">سيُمنع من تسجيل الدخول وتنفيذ أي عمليات جديدة.</p>
              </div>
              <div>
                <Label htmlFor="suspend-reason">سبب التعليق <span className="text-red-500">*</span></Label>
                <Input
                  id="suspend-reason"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="اكتب سبب التعليق..."
                  className="mt-1"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
                <Button
                  onClick={handleSuspend}
                  disabled={actionLoading || !suspendReason.trim()}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {actionLoading ? "جاري التعليق..." : "تعليق الحساب"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reactivate Dialog ── */}
      <Dialog open={dialogType === "reactivate"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>إعادة تنشيط الحساب</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-green-800">
                  هل تريد إعادة تنشيط حساب الطالب <strong>{selectedStudent.name}</strong>؟
                </p>
                <p className="text-sm text-green-600 mt-1">سيتمكن من تسجيل الدخول والعمل بشكل طبيعي.</p>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
                <Button
                  onClick={handleReactivate}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {actionLoading ? "جاري التنشيط..." : "إعادة التنشيط"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
