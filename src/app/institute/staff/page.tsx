"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Mail, UserCheck, Users, Loader2, Phone, ToggleLeft, Trash2, MoreVertical, Pencil } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDate, getFileUrl } from "@/lib/utils"
import { instituteService } from "@/lib/institute-service"

interface StaffMember {
  id: string
  name: string
  email: string | null
  phone: string | null
  bio: string | null
  avatar: string | null
  specialties: string[]
  status: "ACTIVE" | "INACTIVE"
  joinedAt: string
  notes: string | null
}

interface StaffForm {
  name: string
  email: string
  phone: string
  bio: string
  avatarFile: File | null
  avatarPreview: string | null
}

const emptyForm: StaffForm = { name: "", email: "", phone: "", bio: "", avatarFile: null, avatarPreview: null }

export default function InstituteStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add dialog
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addFieldErrors, setAddFieldErrors] = useState<{ name?: string; email?: string }>({})
  const [addForm, setAddForm] = useState<StaffForm>(emptyForm)

  // Edit dialog
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<StaffForm>(emptyForm)

  // Delete / action
  const [confirmDelete, setConfirmDelete] = useState<StaffMember | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadStaff = () => {
    setLoading(true)
    setError(null)
    instituteService.getStaff()
      .then((data) => setStaff(data as StaffMember[]))
      .catch(() => setError("فشل تحميل بيانات الطاقم"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadStaff() }, [])

  const validateAddForm = () => {
    const errors: { name?: string; email?: string } = {}
    if (!addForm.name.trim()) errors.name = "هذا الحقل مطلوب"
    if (addForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email)) {
      errors.email = "البريد الإلكتروني غير صالح"
    }
    setAddFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ── Add ──────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!validateAddForm()) return
    setAddLoading(true)
    setAddError(null)
    try {
      const formData = new FormData()
      formData.append("name", addForm.name)
      if (addForm.email) formData.append("email", addForm.email)
      if (addForm.phone) formData.append("phone", addForm.phone)
      if (addForm.bio) formData.append("bio", addForm.bio)
      if (addForm.avatarFile) formData.append("avatar", addForm.avatarFile)

      await instituteService.addStaff(formData)
      setIsAddOpen(false)
      setAddForm(emptyForm)
      setAddFieldErrors({})
      loadStaff()
    } catch (e: unknown) {
      const message =
        typeof e === "object" &&
        e !== null &&
        "response" in e &&
        typeof (e as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setAddError(message || "فشل إضافة المدرب")
    } finally {
      setAddLoading(false)
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────
  const openEdit = (member: StaffMember) => {
    setEditTarget(member)
    setEditForm({
      name: member.name,
      email: member.email ?? "",
      phone: member.phone ?? "",
      bio: member.bio ?? "",
      avatarFile: null,
      avatarPreview: member.avatar ? getFileUrl(member.avatar) || null : null,
    })
    setEditError(null)
  }

  const handleUpdate = async () => {
    if (!editTarget || !editForm.name) return
    setEditLoading(true)
    setEditError(null)
    try {
      const formData = new FormData()
      formData.append("name", editForm.name)
      if (editForm.email) formData.append("email", editForm.email)
      if (editForm.phone) formData.append("phone", editForm.phone)
      if (editForm.bio) formData.append("bio", editForm.bio)
      if (editForm.avatarFile) formData.append("avatar", editForm.avatarFile)

      const updated: StaffMember = await instituteService.updateStaff(editTarget.id, formData)
      setStaff(prev => prev.map(s => s.id === editTarget.id ? { ...s, ...updated } : s))
      setEditTarget(null)
    } catch (e: unknown) {
      const message =
        typeof e === "object" &&
        e !== null &&
        "response" in e &&
        typeof (e as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setEditError(message || "فشل تحديث بيانات المدرب")
    } finally {
      setEditLoading(false)
    }
  }

  // ── Status toggle ─────────────────────────────────────────────────────────
  const handleToggleStatus = async (member: StaffMember) => {
    setActionLoading(member.id)
    const newStatus = member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    try {
      await instituteService.updateStaffStatus(member.id, newStatus)
      setStaff(prev => prev.map(s => s.id === member.id ? { ...s, status: newStatus } : s))
    } catch {
      loadStaff()
    } finally {
      setActionLoading(null)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (member: StaffMember) => {
    setActionLoading(member.id)
    try {
      await instituteService.removeStaff(member.id)
      setStaff(prev => prev.filter(s => s.id !== member.id))
    } catch {
      loadStaff()
    } finally {
      setConfirmDelete(null)
      setActionLoading(null)
    }
  }

  const activeCount = staff.filter(s => s.status === "ACTIVE").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">كشف المدربين</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">إضافة وإدارة مدربي المعهد</p>
        </div>
        <Button onClick={() => { setAddError(null); setIsAddOpen(true) }}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة مدرب
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المدربين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : staff.length}</div>
            <p className="text-xs text-muted-foreground">مدرب مسجل</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">النشطون</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : activeCount}</div>
            <p className="text-xs text-muted-foreground">مدرب نشط</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">غير النشطون</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : staff.length - activeCount}</div>
            <p className="text-xs text-muted-foreground">مدرب غير نشط</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>قائمة المدربين</CardTitle>
            {!loading && (
              <Badge variant="secondary" className="font-mono">{staff.length} مدرب</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin ml-2" />
              <span>جاري تحميل المدربين...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-red-500 gap-2">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={loadStaff}>إعادة المحاولة</Button>
            </div>
          ) : staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <Users className="h-10 w-10" />
              <p>لم يتم إضافة أي مدربين بعد</p>
              <Button variant="outline" size="sm" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 ml-1" /> إضافة أول مدرب
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المدرب</TableHead>
                  <TableHead>معلومات الاتصال</TableHead>
                  <TableHead>نبذة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ الإضافة</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => (
                  <TableRow key={member.id} className={member.status === "INACTIVE" ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.avatar ? getFileUrl(member.avatar) : undefined} />
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <p className="font-medium">{member.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400">
                        {member.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />{member.email}
                          </div>
                        )}
                        {member.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />{member.phone}
                          </div>
                        )}
                        {!member.email && !member.phone && (
                          <span className="text-gray-400">غير متوفر</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">
                      {member.bio ?? "غير متوفر"}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        member.status === "ACTIVE"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }>
                        {member.status === "ACTIVE" ? "نشط" : "غير نشط"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(member.joinedAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={actionLoading === member.id}>
                            {actionLoading === member.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <MoreVertical className="h-4 w-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(member)}>
                            <Pencil className="h-4 w-4 ml-2" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(member)}>
                            <ToggleLeft className="h-4 w-4 ml-2" />
                            {member.status === "ACTIVE" ? "تعطيل" : "تفعيل"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => setConfirmDelete(member)}
                          >
                            <Trash2 className="h-4 w-4 ml-2" />
                            حذف من الكشف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Add Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent
          dir="rtl"
          className="w-[540px] max-w-[calc(100vw-32px)] rounded-[6.5px] border border-[#E2E8F0] bg-white p-5 sm:p-7 shadow-[0_18px_40px_rgba(15,23,42,0.18)] data-[state=open]:animate-in data-[state=closed]:animate-out [&>button]:hidden"
        >
          <DialogHeader className="space-y-1.5 text-right sm:text-right">
            <DialogTitle className="w-full text-right text-[20px] font-bold text-[#0F172A]">إضافة مدرب</DialogTitle>
            <DialogDescription className="w-full text-right text-[14px] text-[#64748B]">أدخل بيانات المدرب لإضافته إلى كشف مدربي المعهد</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-right">
            <div className="rounded-[6.5px] border border-[#E2E8F0] bg-white p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="order-2 sm:order-1 flex-1">
                  <Label className="text-[14px] font-semibold text-[#0F172A]">صورة المدرب</Label>
                  <p className="mt-1 text-xs text-[#94A3B8]">اختياري، PNG أو JPG حتى 5MB</p>
                  <input
                    id="add-avatar-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setAddForm(f => ({
                          ...f,
                          avatarFile: file,
                          avatarPreview: URL.createObjectURL(file)
                        }))
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 h-10 rounded-[6.5px] border-[#E2E8F0] bg-white px-4 text-[#0F172A] hover:bg-[#F8FAFC]"
                    onClick={() => document.getElementById("add-avatar-upload")?.click()}
                  >
                    اختيار صورة
                  </Button>
                </div>
                <Avatar className="order-1 sm:order-2 h-16 w-16 rounded-[6.5px] border border-[#E2E8F0] shadow-sm">
                  <AvatarImage src={addForm.avatarPreview || undefined} />
                  <AvatarFallback className="rounded-[6.5px] bg-primary/5 text-slate-700">صورة</AvatarFallback>
                </Avatar>
              </div>
            </div>
            <div>
              <Label htmlFor="add-name" className="text-[14px] font-semibold text-[#0F172A]">الاسم الكامل <span className="text-[#DC2626]">*</span></Label>
              <Input
                id="add-name"
                placeholder="اسم المدرب"
                value={addForm.name}
                className={`mt-1 h-[42px] w-full rounded-[6.5px] border bg-white px-3 text-right placeholder:text-[#94A3B8] focus-visible:ring-2 focus-visible:ring-blue-100 ${addFieldErrors.name ? "border-[#DC2626]" : "border-[#E2E8F0] focus-visible:border-[#2563EB]"}`}
                onChange={(e) => {
                  setAddForm(f => ({ ...f, name: e.target.value }))
                  if (addFieldErrors.name && e.target.value.trim()) setAddFieldErrors(prev => ({ ...prev, name: undefined }))
                }}
              />
              {addFieldErrors.name && <p className="mt-1 text-xs text-[#DC2626] text-right">{addFieldErrors.name}</p>}
            </div>
            <div>
              <div className="flex items-center justify-start gap-2">
                <Label htmlFor="add-email" className="text-[14px] font-semibold text-[#0F172A]">البريد الإلكتروني</Label>
                <span className="rounded-[6.5px] bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">اختياري</span>
              </div>
              <Input
                id="add-email"
                type="email"
                placeholder="trainer@example.com"
                value={addForm.email}
                className={`mt-1 h-[42px] w-full rounded-[6.5px] border bg-white px-3 text-right placeholder:text-[#94A3B8] focus-visible:ring-2 focus-visible:ring-blue-100 ${addFieldErrors.email ? "border-[#DC2626]" : "border-[#E2E8F0] focus-visible:border-[#2563EB]"}`}
                onChange={(e) => {
                  setAddForm(f => ({ ...f, email: e.target.value }))
                  if (addFieldErrors.email) setAddFieldErrors(prev => ({ ...prev, email: undefined }))
                }}
              />
              {addFieldErrors.email && <p className="mt-1 text-xs text-[#DC2626] text-right">{addFieldErrors.email}</p>}
            </div>
            <div>
              <div className="flex items-center justify-start gap-2">
                <Label htmlFor="add-phone" className="text-[14px] font-semibold text-[#0F172A]">رقم الهاتف</Label>
                <span className="rounded-[6.5px] bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">اختياري</span>
              </div>
              <Input id="add-phone" type="tel" placeholder="مثال: 777123456" value={addForm.phone}
                className="mt-1 h-[42px] w-full rounded-[6.5px] border border-[#E2E8F0] bg-white px-3 text-right placeholder:text-[#94A3B8] focus-visible:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-blue-100"
                onChange={(e) => setAddForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <div className="flex items-center justify-start gap-2">
                <Label htmlFor="add-bio" className="text-[14px] font-semibold text-[#0F172A]">نبذة تعريفية</Label>
                <span className="rounded-[6.5px] bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">اختياري</span>
              </div>
              <Textarea id="add-bio" placeholder="خبراته وتخصصاته..." value={addForm.bio} rows={2}
                className="mt-1 h-[72px] w-full resize-y rounded-[6.5px] border border-[#E2E8F0] bg-white px-3 text-right placeholder:text-[#94A3B8] focus-visible:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-blue-100"
                onChange={(e) => setAddForm(f => ({ ...f, bio: e.target.value }))} />
            </div>
            {addError && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-[6.5px] text-right">{addError}</p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-start">
              <Button
                onClick={handleAdd}
                disabled={addLoading}
                className="h-10 rounded-[6.5px] bg-[#2563EB] px-[18px] text-white hover:bg-[#1D4ED8] sm:w-auto"
              >
                {addLoading ? <><Loader2 className="h-4 w-4 animate-spin ml-1" />جاري الإضافة...</> : "إضافة"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={addLoading}
                className="h-10 rounded-[6.5px] border-[#E2E8F0] bg-white px-[18px] text-[#0F172A] hover:bg-[#F8FAFC] sm:w-auto"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null) }}>
        <DialogContent
          dir="rtl"
          className="w-[540px] max-w-[calc(100vw-32px)] rounded-[6.5px] border border-[#E2E8F0] bg-white p-5 sm:p-7 shadow-[0_18px_40px_rgba(15,23,42,0.18)] data-[state=open]:animate-in data-[state=closed]:animate-out [&>button]:hidden"
        >
          <DialogHeader className="space-y-1.5 text-right sm:text-right">
            <DialogTitle className="w-full text-right text-[20px] font-bold text-[#0F172A]">تعديل بيانات المدرب</DialogTitle>
            <DialogDescription className="w-full text-right text-[14px] text-[#64748B]">عدّل بيانات {editTarget?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-right">
            <div className="rounded-[6.5px] border border-[#E2E8F0] bg-white p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="order-2 sm:order-1 flex-1">
                  <Label className="text-[14px] font-semibold text-[#0F172A]">صورة المدرب</Label>
                  <p className="mt-1 text-xs text-[#94A3B8]">اختياري: قم باختيار صورة جديدة لتغيير الصورة الحالية</p>
                  <input
                    id="edit-avatar-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setEditForm(f => ({
                          ...f,
                          avatarFile: file,
                          avatarPreview: URL.createObjectURL(file)
                        }))
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 h-10 rounded-[6.5px] border-[#E2E8F0] bg-white px-4 text-[#0F172A] hover:bg-[#F8FAFC]"
                    onClick={() => document.getElementById("edit-avatar-upload")?.click()}
                  >
                    اختيار صورة
                  </Button>
                </div>
                <Avatar className="order-1 sm:order-2 h-16 w-16 rounded-[6.5px] border border-[#E2E8F0] shadow-sm">
                  <AvatarImage src={editForm.avatarPreview || undefined} />
                  <AvatarFallback className="rounded-[6.5px] bg-primary/5 text-slate-700">صورة</AvatarFallback>
                </Avatar>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-name" className="text-[14px] font-semibold text-[#0F172A]">الاسم الكامل <span className="text-[#DC2626]">*</span></Label>
              <Input id="edit-name" placeholder="اسم المدرب" value={editForm.name}
                className="mt-1 h-[42px] w-full rounded-[6.5px] border border-[#E2E8F0] bg-white px-3 text-right placeholder:text-[#94A3B8] focus-visible:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-blue-100"
                onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <div className="flex items-center justify-start gap-2">
                <Label htmlFor="edit-email" className="text-[14px] font-semibold text-[#0F172A]">البريد الإلكتروني</Label>
                <span className="rounded-[6.5px] bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">اختياري</span>
              </div>
              <Input id="edit-email" type="email" placeholder="trainer@example.com" value={editForm.email}
                className="mt-1 h-[42px] w-full rounded-[6.5px] border border-[#E2E8F0] bg-white px-3 text-right placeholder:text-[#94A3B8] focus-visible:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-blue-100"
                onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <div className="flex items-center justify-start gap-2">
                <Label htmlFor="edit-phone" className="text-[14px] font-semibold text-[#0F172A]">رقم الهاتف</Label>
                <span className="rounded-[6.5px] bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">اختياري</span>
              </div>
              <Input id="edit-phone" type="tel" placeholder="مثال: 777123456" value={editForm.phone}
                className="mt-1 h-[42px] w-full rounded-[6.5px] border border-[#E2E8F0] bg-white px-3 text-right placeholder:text-[#94A3B8] focus-visible:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-blue-100"
                onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <div className="flex items-center justify-start gap-2">
                <Label htmlFor="edit-bio" className="text-[14px] font-semibold text-[#0F172A]">نبذة تعريفية</Label>
                <span className="rounded-[6.5px] bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">اختياري</span>
              </div>
              <Textarea id="edit-bio" placeholder="خبراته وتخصصاته..." value={editForm.bio} rows={2}
                className="mt-1 h-[72px] w-full resize-y rounded-[6.5px] border border-[#E2E8F0] bg-white px-3 text-right placeholder:text-[#94A3B8] focus-visible:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-blue-100"
                onChange={(e) => setEditForm(f => ({ ...f, bio: e.target.value }))} />
            </div>
            {editError && (
              <p className="rounded-[6.5px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#DC2626]">{editError}</p>
            )}
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-start">
              <Button
                variant="outline"
                onClick={() => setEditTarget(null)}
                disabled={editLoading}
                className="h-10 rounded-[6.5px] border-[#E2E8F0] bg-white px-[18px] text-[#0F172A] hover:bg-[#F8FAFC] sm:w-auto"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={editLoading || !editForm.name}
                className="h-10 rounded-[6.5px] bg-[#2563EB] px-6 text-white hover:bg-[#1D4ED8] disabled:opacity-60 sm:w-auto"
              >
                {editLoading ? <><Loader2 className="h-4 w-4 animate-spin ml-1" />جاري الحفظ...</> : "حفظ التعديلات"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Delete Dialog ──────────────────────────────────────────── */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">حذف مدرب</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف <strong>{confirmDelete?.name}</strong> من كشف مدربي المعهد؟
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>إلغاء</Button>
            <Button variant="destructive" disabled={!!actionLoading}
              onClick={() => confirmDelete && handleDelete(confirmDelete)}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "نعم، حذف"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}



