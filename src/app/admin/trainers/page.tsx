"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useState, useEffect, useMemo, Suspense } from "react"
export const dynamic = "force-dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Eye, CheckCircle, XCircle, UserCheck, AlertTriangle, Users,
  FileText, UserX, KeyRound
} from "lucide-react"
import { formatDate, getFileUrl } from "@/lib/utils"
import { AdminPageHeader } from "@/components/admin/page-header"
import { adminService } from "@/lib/admin-service"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

interface TrainerData {
  id: string
  userId: string
  bio: string | null
  cvUrl: string | null
  specialties: string[]
  certificatesUrls: string[]
  verificationStatus: string
  status: string
  name: string
  email: string
  phone: string | null
  createdAt: string
  avatar: string | null
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    createdAt: string
    avatar: string | null
  }
}

type DialogType = 'view' | 'editCredentials' | 'suspend' | 'reactivate' | 'approve' | 'reject' | null

function AdminTrainersContent() {
  const searchParams = useSearchParams()
  const viewId = searchParams.get('view')

  const [trainers, setTrainers] = useState<TrainerData[]>([])
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerData | null>(null)
  const [dialogType, setDialogType] = useState<DialogType>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Edit credentials
  const [credForm, setCredForm] = useState({ email: "", password: "", confirmPassword: "" })
  const [credError, setCredError] = useState("")
  const [credLoading, setCredLoading] = useState(false)

  // Suspend / Reject
  const [actionReason, setActionReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => { loadTrainers() }, [])

  useEffect(() => {
    if (!loading && viewId && trainers.length > 0) {
      const trainer = trainers.find(t => t.id === viewId)
      if (trainer) openDialog(trainer, 'view')
    }
  }, [loading, trainers, viewId])

  const loadTrainers = async () => {
    try {
      setLoading(true)
      const data = await adminService.getAllTrainers()
      setTrainers(data)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل تحميل البيانات")
    } finally {
      setLoading(false)
    }
  }

  const filteredTrainers = useMemo(() =>
    trainers.filter((t) => {
      const matchesStatus = statusFilter === "all" || t.status === statusFilter || t.verificationStatus === statusFilter
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        (t.name || "").toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q) ||
        (t.phone || t.user?.phone || "").toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    }),
    [trainers, searchQuery, statusFilter]
  )

  const openDialog = (trainer: TrainerData, type: DialogType) => {
    setSelectedTrainer(trainer)
    setDialogType(type)
    if (type === "editCredentials") {
      setCredForm({ email: trainer.email || trainer.user?.email || "", password: "", confirmPassword: "" })
      setCredError("")
    }
    if (type === "suspend" || type === "reject") setActionReason("")
  }

  const closeDialog = () => {
    setDialogType(null)
    setSelectedTrainer(null)
    setCredError("")
    setActionReason("")
  }

  const handleSaveCredentials = async () => {
    if (!selectedTrainer) return
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
      await adminService.updateTrainer(selectedTrainer.id, payload)
      toast.success("تم تحديث بيانات الدخول بنجاح")
      closeDialog()
      loadTrainers()
    } catch (err: any) {
      setCredError(err?.response?.data?.message || "فشل تحديث البيانات")
    } finally {
      setCredLoading(false)
    }
  }

  const handleSuspend = async () => {
    if (!selectedTrainer || !actionReason.trim()) return
    try {
      setActionLoading(true)
      // Use updateTrainer to set status to suspended
      await adminService.updateTrainer(selectedTrainer.id, { status: "suspended", suspendReason: actionReason })
      toast.success("تم تعليق الحساب بنجاح")
      closeDialog()
      loadTrainers()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل تعليق الحساب")
    } finally {
      setActionLoading(false)
    }
  }

  const handleReactivate = async () => {
    if (!selectedTrainer) return
    try {
      setActionLoading(true)
      await adminService.reactivateTrainer(selectedTrainer.id)
      toast.success("تم إعادة تنشيط الحساب")
      closeDialog()
      loadTrainers()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل إعادة التنشيط")
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedTrainer) return
    try {
      setActionLoading(true)
      await adminService.approveTrainer(selectedTrainer.id)
      toast.success("تم قبول المدرب بنجاح")
      closeDialog()
      loadTrainers()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل قبول المدرب")
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedTrainer || !actionReason.trim()) return
    try {
      setActionLoading(true)
      await adminService.rejectTrainer(selectedTrainer.id, actionReason)
      toast.success("تم رفض المدرب")
      closeDialog()
      loadTrainers()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل رفض المدرب")
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-100 text-green-800">معتمد</Badge>
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800">قيد المراجعة</Badge>
      case 'rejected': return <Badge className="bg-red-100 text-red-800">مرفوض</Badge>
      case 'suspended': return <Badge className="bg-orange-100 text-orange-800">معلق</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="إدارة المدربين" description="مراجعة واعتماد طلبات المدربين الجدد وإدارة الحسابات الحالية" />
        <div className="flex justify-center p-12"><p>جاري التحميل...</p></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="إدارة المدربين"
        description="مراجعة واعتماد طلبات المدربين الجدد وإدارة الحسابات الحالية"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المدربين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trainers.length}</div>
            <p className="text-xs text-muted-foreground">مدرب مسجل</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المدربين المعتمدين</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trainers.filter(t => t.status === 'approved' || t.verificationStatus === 'approved').length}</div>
            <p className="text-xs text-muted-foreground">حساب معتمد</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد المراجعة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trainers.filter(t => t.status === 'pending' || t.verificationStatus === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">في انتظار الاعتماد</p>
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[160px]"
            >
              <option value="all">كل الحالات</option>
              <option value="approved">معتمد</option>
              <option value="pending">قيد المراجعة</option>
              <option value="rejected">مرفوض</option>
              <option value="suspended">معلق</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المدربين ({filteredTrainers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المدرب</TableHead>
                <TableHead>رقم الهاتف</TableHead>
                <TableHead>تاريخ التسجيل</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrainers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    لا يوجد مدربون مطابقون للبحث
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrainers.map((trainer) => (
                  <TableRow key={trainer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden">
                          {trainer.avatar ? (
                            <img
                              src={getFileUrl(trainer.avatar)}
                              alt={trainer.name}
                              className="h-full w-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-500 font-bold text-sm">
                              {(trainer.name || '?').charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{trainer.name}</div>
                          <div className="text-sm text-gray-500">{trainer.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {trainer.phone || trainer.user?.phone || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(new Date(trainer.createdAt || trainer.user?.createdAt))}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(trainer.verificationStatus || trainer.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* View */}
                        <Button variant="outline" size="sm" title="عرض التفاصيل" onClick={() => openDialog(trainer, 'view')}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {/* Edit credentials */}
                        <Button variant="outline" size="sm" title="تعديل بيانات الدخول" onClick={() => openDialog(trainer, 'editCredentials')}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        {/* Approve/Reject for pending */}
                        {trainer.verificationStatus === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => openDialog(trainer, 'approve')} className="bg-green-600 hover:bg-green-700 h-8">
                              <CheckCircle className="h-4 w-4 mr-1" />اعتماد
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => openDialog(trainer, 'reject')} className="h-8">
                              <XCircle className="h-4 w-4 mr-1" />رفض
                            </Button>
                          </>
                        )}
                        {/* Suspend / Reactivate */}
                        {(trainer.status === 'approved' || trainer.verificationStatus === 'approved') && (
                          <Button variant="outline" size="sm" title="تعليق الحساب" onClick={() => openDialog(trainer, 'suspend')} className="border-orange-300 text-orange-600 hover:bg-orange-50">
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                        {trainer.status === 'suspended' && (
                          <Button variant="outline" size="sm" title="إعادة تنشيط" onClick={() => openDialog(trainer, 'reactivate')} className="border-green-300 text-green-600 hover:bg-green-50">
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── View Details ── */}
      <Dialog open={dialogType === 'view'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تفاصيل المدرب</DialogTitle></DialogHeader>
          {selectedTrainer && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                  {selectedTrainer.avatar ? (
                    <img src={getFileUrl(selectedTrainer.avatar)} alt={selectedTrainer.name} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-400 text-2xl font-bold">{(selectedTrainer.name || '?').charAt(0)}</div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedTrainer.name}</h3>
                  <p className="text-gray-600">{selectedTrainer.email}</p>
                  <p className="text-sm text-gray-500">{selectedTrainer.phone || selectedTrainer.user?.phone || 'لا يوجد رقم هاتف'}</p>
                  <p className="text-sm text-gray-500">انضم في {formatDate(new Date(selectedTrainer.createdAt || selectedTrainer.user?.createdAt))}</p>
                  <div className="flex gap-2 mt-2">{getStatusBadge(selectedTrainer.verificationStatus || selectedTrainer.status)}</div>
                </div>
              </div>

              {selectedTrainer.bio && (
                <div>
                  <h4 className="font-semibold mb-2">السيرة الذاتية:</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm">{selectedTrainer.bio}</p>
                </div>
              )}
              {selectedTrainer.specialties && selectedTrainer.specialties.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">التخصصات:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTrainer.specialties.map((s, i) => <Badge key={i} variant="secondary">{s}</Badge>)}
                  </div>
                </div>
              )}
              {selectedTrainer.cvUrl && (
                <div>
                  <h4 className="font-semibold mb-2">السيرة الذاتية (ملف):</h4>
                  <a href={getFileUrl(selectedTrainer.cvUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline text-sm">
                    <FileText className="h-4 w-4" />عرض السيرة الذاتية
                  </a>
                </div>
              )}
              {selectedTrainer.certificatesUrls && selectedTrainer.certificatesUrls.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">الشهادات ({selectedTrainer.certificatesUrls.length}):</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTrainer.certificatesUrls.map((url, i) => (
                      <a key={i} href={getFileUrl(url)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">شهادة {i + 1}</a>
                    ))}
                  </div>
                </div>
              )}
              <Button onClick={closeDialog} className="w-full">إغلاق</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Credentials ── */}
      <Dialog open={dialogType === 'editCredentials'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>تعديل بيانات الدخول</DialogTitle></DialogHeader>
          {selectedTrainer && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">تعديل بيانات دخول المدرب: <strong>{selectedTrainer.name}</strong></p>
              {credError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{credError}</p>}
              <div>
                <Label>البريد الإلكتروني الجديد</Label>
                <Input type="email" value={credForm.email} onChange={(e) => setCredForm({ ...credForm, email: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>كلمة المرور الجديدة</Label>
                <Input type="password" value={credForm.password} onChange={(e) => setCredForm({ ...credForm, password: e.target.value })} placeholder="اتركها فارغة إذا لم ترد التغيير" className="mt-1" />
              </div>
              {credForm.password && (
                <div>
                  <Label>تأكيد كلمة المرور</Label>
                  <Input type="password" value={credForm.confirmPassword} onChange={(e) => setCredForm({ ...credForm, confirmPassword: e.target.value })} className="mt-1" />
                </div>
              )}
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
                <Button onClick={handleSaveCredentials} disabled={credLoading}>{credLoading ? "جاري الحفظ..." : "حفظ التغييرات"}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Suspend ── */}
      <Dialog open={dialogType === 'suspend'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>تعليق حساب المدرب</DialogTitle></DialogHeader>
          {selectedTrainer && (
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-orange-800">هل أنت متأكد من تعليق حساب المدرب <strong>{selectedTrainer.name}</strong>؟</p>
                <p className="text-sm text-orange-600 mt-1">سيُمنع من تسجيل الدخول وإدارة الدورات.</p>
              </div>
              <div>
                <Label>سبب التعليق <span className="text-red-500">*</span></Label>
                <Textarea value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder="اكتب سبب التعليق..." className="mt-1" />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
                <Button onClick={handleSuspend} disabled={actionLoading || !actionReason.trim()} className="bg-orange-600 hover:bg-orange-700">
                  {actionLoading ? "جاري التعليق..." : "تعليق الحساب"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reactivate ── */}
      <Dialog open={dialogType === 'reactivate'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>إعادة تنشيط حساب المدرب</DialogTitle></DialogHeader>
          {selectedTrainer && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-green-800">هل تريد إعادة تنشيط حساب المدرب <strong>{selectedTrainer.name}</strong>؟</p>
                <p className="text-sm text-green-600 mt-1">سيتمكن من تسجيل الدخول وإدارة الدورات بشكل طبيعي.</p>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
                <Button onClick={handleReactivate} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
                  {actionLoading ? "جاري التنشيط..." : "إعادة التنشيط"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Approve ── */}
      <Dialog open={dialogType === 'approve'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>اعتماد المدرب</DialogTitle></DialogHeader>
          {selectedTrainer && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-green-800">هل ترغب في اعتماد حساب المدرب <strong>{selectedTrainer.name || selectedTrainer.user?.name}</strong>؟</p>
                <p className="text-sm text-green-600 mt-2">سيتم تفعيل الحساب وتمكينه من إضافة الدورات.</p>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
                <Button onClick={handleApprove} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
                  {actionLoading ? "جاري الاعتماد..." : "تأكيد الاعتماد"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reject ── */}
      <Dialog open={dialogType === 'reject'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>رفض المدرب</DialogTitle></DialogHeader>
          {selectedTrainer && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-red-800">هل أنت متأكد من رفض طلب المدرب <strong>{selectedTrainer.name || selectedTrainer.user?.name}</strong>؟</p>
              </div>
              <div>
                <Label>سبب الرفض <span className="text-red-500">*</span></Label>
                <Textarea value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder="اكتب سبب الرفض..." className="mt-1" />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
                <Button onClick={handleReject} disabled={actionLoading || !actionReason.trim()} variant="destructive">
                  {actionLoading ? "جاري الرفض..." : "تأكيد الرفض"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminTrainers() {
  return (
    <Suspense fallback={<div className="p-8 text-center">جاري التحميل...</div>}>
      <AdminTrainersContent />
    </Suspense>
  )
}

