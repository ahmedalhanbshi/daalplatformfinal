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
import { Eye, CheckCircle, XCircle, Building, Clock, UserX, UserCheck, KeyRound } from "lucide-react"
import { Institute } from "@/types"
import { formatDate, getFileUrl } from "@/lib/utils"
import { AdminPageHeader } from "@/components/admin/page-header"
import { adminService } from "@/lib/admin-service"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

type DialogType = 'view' | 'editCredentials' | 'suspend' | 'reactivate' | 'approve' | null

function AdminInstitutesContent() {
  const searchParams = useSearchParams()
  const viewId = searchParams.get('view')

  const [institutes, setInstitutes] = useState<Institute[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedInstitute, setSelectedInstitute] = useState<Institute | null>(null)
  const [dialogType, setDialogType] = useState<DialogType>(null)

  // Edit credentials
  const [credForm, setCredForm] = useState({ email: "", password: "", confirmPassword: "" })
  const [credError, setCredError] = useState("")
  const [credLoading, setCredLoading] = useState(false)

  // Suspend reason
  const [suspendReason, setSuspendReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => { loadInstitutes() }, [])

  useEffect(() => {
    if (!loading && viewId && institutes.length > 0) {
      const inst = institutes.find(i => i.id === viewId)
      if (inst) openDialog(inst, 'view')
    }
  }, [loading, institutes, viewId])

  const loadInstitutes = async () => {
    try {
      setLoading(true)
      const data = await adminService.getAllInstitutes()
      setInstitutes(data)
    } catch (err: any) {
      toast.error("فشل تحميل قائمة المعاهد")
    } finally {
      setLoading(false)
    }
  }

  const filteredInstitutes = useMemo(() =>
    institutes.filter((inst) => {
      const matchesStatus =
        statusFilter === "all" ||
        inst.status === statusFilter ||
        inst.verificationStatus === statusFilter
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        inst.name.toLowerCase().includes(q) ||
        (inst.email || "").toLowerCase().includes(q) ||
        (inst.phone || "").toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    }),
    [institutes, searchQuery, statusFilter]
  )

  const openDialog = (institute: Institute, type: DialogType) => {
    setSelectedInstitute(institute)
    setDialogType(type)
    if (type === "editCredentials") {
      setCredForm({ email: institute.email || "", password: "", confirmPassword: "" })
      setCredError("")
    }
    if (type === "suspend") setSuspendReason("")
  }

  const closeDialog = () => {
    setDialogType(null)
    setSelectedInstitute(null)
    setCredError("")
    setSuspendReason("")
  }

  const handleSaveCredentials = async () => {
    if (!selectedInstitute) return
    setCredError("")
    if (!credForm.email) { setCredError("البريد الإلكتروني مطلوب"); return }
    if (credForm.password && credForm.password !== credForm.confirmPassword) {
      setCredError("كلمة المرور وتأكيدها غير متطابقين"); return
    }
    try {
      setCredLoading(true)
      const payload: any = { email: credForm.email }
      if (credForm.password) payload.password = credForm.password
      await adminService.updateInstitute(selectedInstitute.id, payload)
      toast.success("تم تحديث بيانات الدخول بنجاح")
      closeDialog()
      loadInstitutes()
    } catch (err: any) {
      setCredError(err?.response?.data?.message || "فشل تحديث البيانات")
    } finally {
      setCredLoading(false)
    }
  }

  const handleSuspend = async () => {
    if (!selectedInstitute || !suspendReason.trim()) return
    try {
      setActionLoading(true)
      await adminService.suspendInstitute(selectedInstitute.id, suspendReason)
      toast.success("تم تعليق المعهد بنجاح")
      closeDialog()
      loadInstitutes()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل تعليق المعهد")
    } finally {
      setActionLoading(false)
    }
  }

  const handleReactivate = async () => {
    if (!selectedInstitute) return
    try {
      setActionLoading(true)
      await adminService.reactivateInstitute(selectedInstitute.id)
      toast.success("تم إعادة تنشيط المعهد بنجاح")
      closeDialog()
      loadInstitutes()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل إعادة التنشيط")
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedInstitute) return
    try {
      setActionLoading(true)
      await adminService.approveInstitute(selectedInstitute.id)
      toast.success("تم اعتماد المعهد بنجاح")
      closeDialog()
      loadInstitutes()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل اعتماد المعهد")
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: Institute['status'] | string | undefined) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-100 text-green-800">معتمد</Badge>
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800">قيد المراجعة</Badge>
      case 'suspended': return <Badge className="bg-orange-100 text-orange-800">معلق</Badge>
      case 'rejected': return <Badge className="bg-red-100 text-red-800">مرفوض</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="إدارة المعاهد" description="مراجعة وإدارة المعاهد المسجلة في المنصة" />
        <div className="flex justify-center p-12"><p>جاري التحميل...</p></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="إدارة المعاهد" description="مراجعة وإدارة المعاهد المسجلة في المنصة" />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المعاهد</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{institutes.length}</div>
            <p className="text-xs text-muted-foreground">معاهد مسجلة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معاهد معتمدة</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {institutes.filter(i => i.status === 'approved' || i.verificationStatus === 'approved').length}
            </div>
            <p className="text-xs text-muted-foreground">معاهد نشطة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد المراجعة</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {institutes.filter(i => i.status === 'pending' || i.verificationStatus === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">طلبات جديدة</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="البحث باسم المعهد أو البريد الإلكتروني أو رقم الهاتف..."
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
              <option value="suspended">معلق</option>
              <option value="rejected">مرفوض</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المعاهد ({filteredInstitutes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInstitutes.length === 0 ? (
            <div className="text-center p-8 text-gray-500">لا توجد معاهد مطابقة للبحث</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المعهد</TableHead>
                  <TableHead>رقم الهاتف</TableHead>
                  <TableHead>الموقع</TableHead>
                  <TableHead>تاريخ التسجيل</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInstitutes.map((institute) => (
                  <TableRow key={institute.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden">
                          {institute.logo ? (
                            <img
                              src={getFileUrl(institute.logo)}
                              alt={institute.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{institute.name}</div>
                          <div className="text-sm text-gray-500">{institute.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{institute.phone || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-600">{institute.address || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-600">{formatDate(institute.createdAt)}</TableCell>
                    <TableCell>{getStatusBadge(institute.verificationStatus || institute.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* View */}
                        <Button variant="outline" size="sm" title="عرض التفاصيل" onClick={() => openDialog(institute, 'view')}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {/* Edit credentials */}
                        <Button variant="outline" size="sm" title="تعديل بيانات الدخول" onClick={() => openDialog(institute, 'editCredentials')}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        {/* Approve if pending */}
                        {(institute.status === 'pending' || institute.verificationStatus === 'pending') && (
                          <Button size="sm" onClick={() => openDialog(institute, 'approve')} className="bg-green-600 hover:bg-green-700 h-8">
                            <CheckCircle className="h-4 w-4 mr-1" />اعتماد
                          </Button>
                        )}
                        {/* Suspend if approved */}
                        {(institute.status === 'approved' || institute.verificationStatus === 'approved') && (
                          <Button variant="outline" size="sm" title="تعليق المعهد" onClick={() => openDialog(institute, 'suspend')} className="border-orange-300 text-orange-600 hover:bg-orange-50">
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Reactivate if suspended */}
                        {institute.status === 'suspended' && (
                          <Button variant="outline" size="sm" title="إعادة تنشيط" onClick={() => openDialog(institute, 'reactivate')} className="border-green-300 text-green-600 hover:bg-green-50">
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── View Details ── */}
      <Dialog open={dialogType === 'view'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تفاصيل المعهد</DialogTitle></DialogHeader>
          {selectedInstitute && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {selectedInstitute.logo ? (
                  <img src={getFileUrl(selectedInstitute.logo)} alt={selectedInstitute.name} className="w-20 h-20 rounded-full object-cover border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center border">
                    <Building className="h-10 w-10 text-gray-500" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold">{selectedInstitute.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(selectedInstitute.verificationStatus || selectedInstitute.status)}
                    <span className="text-sm text-gray-500">منذ {formatDate(selectedInstitute.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                <div>
                  <h4 className="font-semibold text-sm text-gray-500 mb-1">البريد الإلكتروني</h4>
                  <p className="text-sm font-medium">{selectedInstitute.email || 'غير متوفر'}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-500 mb-1">رقم الهاتف</h4>
                  <p className="text-sm font-medium" dir="ltr" style={{ textAlign: "right" }}>{selectedInstitute.phone || 'غير متوفر'}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-500 mb-1">الموقع الإلكتروني</h4>
                  {selectedInstitute.website ? (
                    <a href={selectedInstitute.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block text-sm font-medium">
                      {selectedInstitute.website}
                    </a>
                  ) : <p className="text-sm font-medium">غير متوفر</p>}
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-500 mb-1">رقم الترخيص</h4>
                  <p className="text-sm font-medium">{selectedInstitute.licenseNumber || 'غير متوفر'}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-500 mb-1">العنوان</h4>
                  <p className="text-sm font-medium">{selectedInstitute.address || 'غير متوفر'}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-500 mb-1">رابط الموقع الجغرافي (الخريطة)</h4>
                  {selectedInstitute.locationUrl ? (
                    <a href={selectedInstitute.locationUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block text-sm font-medium">
                      عرض الموقع
                    </a>
                  ) : <p className="text-sm font-medium">غير متوفر</p>}
                </div>
              </div>

              {selectedInstitute.description && (
                <div>
                  <h4 className="font-semibold mb-2">نبذة عن المعهد</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg text-sm min-h-[80px]">
                    {selectedInstitute.description}
                  </p>
                </div>
              )}

              {selectedInstitute.features && selectedInstitute.features.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">المميزات والخدمات</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedInstitute.features.map((feature: string, i: number) => (
                      <Badge key={i} variant="secondary">{feature}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedInstitute.licenseDocumentUrl && (
                <div>
                  <h4 className="font-semibold mb-2">وثائق الترخيص</h4>
                  <a href={getFileUrl(selectedInstitute.licenseDocumentUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors text-primary text-sm">
                    عرض وثيقة الترخيص
                  </a>
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
          {selectedInstitute && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">تعديل بيانات دخول المعهد: <strong>{selectedInstitute.name}</strong></p>
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

      {/* ── Approve ── */}
      <Dialog open={dialogType === 'approve'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>اعتماد المعهد</DialogTitle></DialogHeader>
          {selectedInstitute && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-green-800">هل ترغب في اعتماد المعهد <strong>{selectedInstitute.name}</strong>؟</p>
                <p className="text-sm text-green-600 mt-1">سيتم تفعيل الحساب وتمكينه من إدارة الدورات والقاعات.</p>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
                <Button onClick={handleApprove} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
                  {actionLoading ? "جاري الاعتماد..." : "اعتماد المعهد"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Suspend ── */}
      <Dialog open={dialogType === 'suspend'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>تعليق المعهد</DialogTitle></DialogHeader>
          {selectedInstitute && (
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-orange-800">هل أنت متأكد من تعليق المعهد <strong>{selectedInstitute.name}</strong>؟</p>
                <p className="text-sm text-orange-600 mt-1">سيُمنع من تسجيل الدخول وتنفيذ أي عمليات جديدة.</p>
              </div>
              <div>
                <Label>سبب التعليق <span className="text-red-500">*</span></Label>
                <Textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="اكتب سبب التعليق..." className="mt-1" />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
                <Button onClick={handleSuspend} disabled={actionLoading || !suspendReason.trim()} className="bg-orange-600 hover:bg-orange-700">
                  {actionLoading ? "جاري التعليق..." : "تعليق المعهد"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reactivate ── */}
      <Dialog open={dialogType === 'reactivate'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>إعادة تنشيط المعهد</DialogTitle></DialogHeader>
          {selectedInstitute && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-green-800">هل تريد إعادة تنشيط المعهد <strong>{selectedInstitute.name}</strong>؟</p>
                <p className="text-sm text-green-600 mt-1">سيتمكن من تسجيل الدخول والعمل بشكل طبيعي.</p>
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
    </div>
  )
}

export default function AdminInstitutes() {
  return (
    <Suspense fallback={<div className="p-8 text-center">جاري التحميل...</div>}>
      <AdminInstitutesContent />
    </Suspense>
  )
}

