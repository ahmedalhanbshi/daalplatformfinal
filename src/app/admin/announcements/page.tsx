"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, Megaphone, Users, Calendar, Send, Trash2, Edit, Paperclip, Clock, Loader2, RefreshCw, Search, X, CheckSquare } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { AdminPageHeader } from "@/components/admin/page-header"
import { format } from "date-fns"
import { adminService } from "@/lib/admin-service"
import { toast } from "sonner"

interface Announcement {
  id: string
  title: string
  content: string
  targetAudience: 'all' | 'students' | 'trainers' | 'institutes' | 'specific_users'
  category: 'general' | 'event' | 'maintenance' | 'urgent'
  status: 'draft' | 'scheduled' | 'sent'
  scheduledDate?: Date | string | null
  sentDate?: Date | string | null
  attachment?: string
  createdAt: Date | string
}

const emptyForm = {
  title: "",
  content: "",
  targetAudience: "all",
  category: "general",
  status: "",
  scheduledDate: "",
  scheduledTime: "",
  attachment: "",
  recipientIds: [] as string[],
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [actionDialog, setActionDialog] = useState<{ open: boolean; type: 'delete' | 'edit' | null }>({
    open: false,
    type: null,
  })
  const [editForm, setEditForm] = useState({ ...emptyForm })
  const [newAnnouncement, setNewAnnouncement] = useState({ ...emptyForm })

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<any[]>([])

  const [editSearchQuery, setEditSearchQuery] = useState("")
  const [editSearchResults, setEditSearchResults] = useState<any[]>([])
  const [editSelectedUsers, setEditSelectedUsers] = useState<any[]>([])

  const [allStudents, setAllStudents] = useState<any[]>([])
  const [allTrainers, setAllTrainers] = useState<any[]>([])
  const [allInstitutes, setAllInstitutes] = useState<any[]>([])
  const [isFetchingLists, setIsFetchingLists] = useState(false)

  // ── Fetch ──────────────────────────────────────────────
  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true)
      const data = await adminService.getAnnouncements()
      setAnnouncements(data)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "تعذّر تحميل الإعلانات")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAnnouncements() }, [fetchAnnouncements])

  useEffect(() => {
    if (newAnnouncement.targetAudience === 'specific_users' || editForm.targetAudience === 'specific_users') {
      if (allStudents.length === 0 && allTrainers.length === 0 && allInstitutes.length === 0 && !isFetchingLists) {
        const fetchLists = async () => {
          setIsFetchingLists(true)
          try {
            const [students, trainers, institutes] = await Promise.all([
              adminService.getAllStudents(),
              adminService.getAllTrainers(),
              adminService.getAllInstitutes()
            ])
            setAllStudents(students.map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: 'student' })))
            setAllTrainers(trainers.map((t: any) => ({ id: t.user?.id || t.userId, name: t.user?.name || 'مدرب', email: t.user?.email || '', role: 'trainer' })))
            setAllInstitutes(institutes.map((i: any) => ({ id: i.user?.id || i.userId, name: i.name || i.user?.name || 'معهد', email: i.user?.email || i.email || '', role: 'institute' })))
          } catch (err) {
            console.error(err)
          } finally {
            setIsFetchingLists(false)
          }
        }
        fetchLists()
      }
    }
  }, [newAnnouncement.targetAudience, editForm.targetAudience])

  // ── Create ──────────────────────────────────────────────
  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      toast.error("العنوان والمحتوى مطلوبان")
      return
    }
    if (!newAnnouncement.status) {
      toast.error("يرجى اختيار طريقة النشر")
      return
    }
    if (newAnnouncement.status === 'scheduled' && !newAnnouncement.scheduledDate) {
      toast.error("يرجى تحديد تاريخ النشر للإعلان المجدول")
      return
    }
    try {
      setSubmitting(true)
      const isSendNow = newAnnouncement.status === 'send_now'
      const result = await adminService.createAnnouncement({
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        targetAudience: newAnnouncement.targetAudience,
        category: newAnnouncement.category,
        scheduledDate: newAnnouncement.status === 'scheduled' ? newAnnouncement.scheduledDate : undefined,
        scheduledTime: newAnnouncement.status === 'scheduled' ? newAnnouncement.scheduledTime : undefined,
        recipientIds: newAnnouncement.targetAudience === 'specific_users' ? selectedUsers.map(u => u.id) : undefined,
      })
      if (isSendNow && result?.id) {
        const sendResult = await adminService.sendAnnouncement(result.id)
        toast.success(`تم الإرسال الفوري إلى ${sendResult.recipientCount} مستخدم`)
      } else {
        toast.success(newAnnouncement.status === 'scheduled' ? "تم جدولة الإعلان بنجاح" : "تم حفظ الإعلان كمسودة")
      }
      setNewAnnouncement({ ...emptyForm })
      setSelectedUsers([])
      setSearchQuery("")
      fetchAnnouncements()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل إنشاء الإعلان")
    } finally {
      setSubmitting(false)
    }
  }


  // ── Send ──────────────────────────────────────────────
  const handleSendAnnouncement = async (announcement: Announcement) => {
    try {
      const result = await adminService.sendAnnouncement(announcement.id)
      toast.success(`تم الإرسال إلى ${result.recipientCount} مستخدم`)
      fetchAnnouncements()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل إرسال الإعلان")
    }
  }

  // ── Delete ──────────────────────────────────────────────
  const handleDeleteAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    setActionDialog({ open: true, type: 'delete' })
  }

  // ── Edit ──────────────────────────────────────────────
  const handleEditAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    const sd = announcement.scheduledDate ? new Date(announcement.scheduledDate) : null
    setEditForm({
      title: announcement.title,
      content: announcement.content,
      targetAudience: announcement.targetAudience,
      category: announcement.category,
      status: announcement.status,
      scheduledDate: sd ? format(sd, "yyyy-MM-dd") : "",
      scheduledTime: sd ? format(sd, "HH:mm") : "",
      attachment: announcement.attachment || "",
      recipientIds: (announcement as any).recipientIds || [],
    })
    setEditSelectedUsers([]) // Reset edit selected users, fetching them back is complex, they can just search again if needed or we keep the IDs.
    setActionDialog({ open: true, type: 'edit' })
  }

  const handleSearchUsers = async (query: string, isEdit = false) => {
    if (isEdit) setEditSearchQuery(query)
    else setSearchQuery(query)

    if (query.trim().length < 2) {
      if (isEdit) setEditSearchResults([])
      else setSearchResults([])
      return
    }

    try {
      setIsSearching(true)
      const results = await adminService.searchUsers(query)
      if (isEdit) setEditSearchResults(results)
      else setSearchResults(results)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }

  const toggleUserSelection = (user: any, isEdit = false) => {
    if (isEdit) {
      if (editSelectedUsers.some(u => u.id === user.id)) {
        setEditSelectedUsers(prev => prev.filter(u => u.id !== user.id))
        setEditForm(prev => ({ ...prev, recipientIds: prev.recipientIds.filter(id => id !== user.id) }))
      } else {
        setEditSelectedUsers(prev => [...prev, user])
        setEditForm(prev => ({ ...prev, recipientIds: [...prev.recipientIds, user.id] }))
      }
    } else {
      if (selectedUsers.some(u => u.id === user.id)) {
        setSelectedUsers(prev => prev.filter(u => u.id !== user.id))
      } else {
        setSelectedUsers(prev => [...prev, user])
      }
    }
  }

  // ── Execute dialog action ──────────────────────────────
  const executeAction = async () => {
    if (!selectedAnnouncement) return
    try {
      setSubmitting(true)
      if (actionDialog.type === 'delete') {
        await adminService.deleteAnnouncement(selectedAnnouncement.id)
        toast.success("تم حذف الإعلان")
      } else if (actionDialog.type === 'edit') {
        await adminService.updateAnnouncement(selectedAnnouncement.id, {
          title: editForm.title,
          content: editForm.content,
          targetAudience: editForm.targetAudience,
          category: editForm.category,
          status: editForm.status,
          scheduledDate: editForm.scheduledDate || "",
          scheduledTime: editForm.scheduledTime || "",
          recipientIds: editForm.targetAudience === 'specific_users' ? editForm.recipientIds : undefined,
        })
        toast.success("تم تحديث الإعلان")
      }
      fetchAnnouncements()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشلت العملية")
    } finally {
      setSubmitting(false)
      setActionDialog({ open: false, type: null })
      setSelectedAnnouncement(null)
    }
  }

  // ── Helpers ──────────────────────────────────────────────
  const getCategoryBadge = (category: Announcement['category']) => {
    switch (category) {
      case 'urgent':      return <Badge className="bg-red-100 text-red-800">عاجل</Badge>
      case 'maintenance': return <Badge className="bg-orange-100 text-orange-800">صيانة</Badge>
      case 'event':       return <Badge className="bg-blue-100 text-blue-800">فعالية</Badge>
      default:            return <Badge variant="secondary">عام</Badge>
    }
  }

  const getStatusBadge = (status: Announcement['status']) => {
    switch (status) {
      case 'sent':      return <Badge className="bg-green-100 text-green-800">تم الإرسال</Badge>
      case 'scheduled': return <Badge className="bg-purple-100 text-purple-800">مجدول</Badge>
      default:          return <Badge className="bg-gray-100 text-gray-800">مسودة</Badge>
    }
  }

  const getAudienceLabel = (audience: Announcement['targetAudience']) => {
    switch (audience) {
      case 'all':       return 'الجميع'
      case 'students':  return 'الطلاب'
      case 'trainers':  return 'المدربين'
      case 'institutes':return 'المعاهد'
      case 'specific_users': return 'مستخدمين محددين'
      default:          return audience
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="الإعلانات والتنبيهات"
        description="إدارة الإعلانات والتنبيهات لجميع مستخدمي المنصة"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Announcement Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              إعلان جديد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">عنوان الإعلان</Label>
                <Input
                  id="title"
                  placeholder="أدخل عنوان الإعلان"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="audience">الجمهور المستهدف</Label>
                <Select
                  value={newAnnouncement.targetAudience}
                  onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, targetAudience: value })}
                >
                  <SelectTrigger><SelectValue placeholder="اختر الجمهور" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الجميع</SelectItem>
                    <SelectItem value="students">الطلاب</SelectItem>
                    <SelectItem value="trainers">المدربين</SelectItem>
                    <SelectItem value="institutes">المعاهد</SelectItem>
                    <SelectItem value="specific_users">مستخدمين محددين</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newAnnouncement.targetAudience === 'specific_users' && (
                <div className="space-y-3 p-3 bg-slate-50 border border-slate-100 rounded-md">
                  <Label>تحديد المستخدمين المخصصين</Label>
                  
                  <Tabs defaultValue="search" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-2">
                      <TabsTrigger value="search">بحث</TabsTrigger>
                      <TabsTrigger value="students">الطلاب</TabsTrigger>
                      <TabsTrigger value="trainers">المدربين</TabsTrigger>
                      <TabsTrigger value="institutes">المعاهد</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="search" className="space-y-2 mt-0">
                      <div className="relative">
                        <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="ابحث بالاسم، الإيميل، أو الجوال..."
                          className="pr-9"
                          value={searchQuery}
                          onChange={(e) => handleSearchUsers(e.target.value)}
                        />
                        {isSearching && <Loader2 className="absolute left-3 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
                      </div>

                      {searchResults.length > 0 && searchQuery.length >= 2 && (
                        <div className="max-h-[150px] overflow-y-auto border rounded-md bg-white p-1">
                          {searchResults.map(user => {
                            const isSelected = selectedUsers.some(u => u.id === user.id)
                            return (
                              <div
                                key={user.id}
                                className={`flex items-center justify-between p-2 cursor-pointer rounded-sm hover:bg-slate-50 text-sm ${isSelected ? 'bg-blue-50' : ''}`}
                                onClick={() => toggleUserSelection(user)}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium text-slate-700">{user.name}</span>
                                  <span className="text-xs text-slate-500">{user.email} - {user.role === 'student' ? 'طالب' : user.role === 'trainer' ? 'مدرب' : 'معهد'}</span>
                                </div>
                                {isSelected && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">تم الاختيار</Badge>}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="students" className="mt-0">
                      <div className="max-h-[200px] overflow-y-auto border rounded-md bg-white p-1">
                        {isFetchingLists ? <div className="p-4 text-center text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div> :
                        allStudents.length === 0 ? <div className="p-4 text-center text-sm text-gray-500">لا يوجد طلاب</div> :
                        allStudents.map(user => {
                          const isSelected = selectedUsers.some(u => u.id === user.id)
                          return (
                            <div key={user.id} className={`flex items-center justify-between p-2 cursor-pointer rounded-sm hover:bg-slate-50 text-sm ${isSelected ? 'bg-blue-50' : ''}`} onClick={() => toggleUserSelection(user)}>
                              <span className="font-medium text-slate-700">{user.name}</span>
                              {isSelected && <CheckSquare className="h-4 w-4 text-blue-600" />}
                            </div>
                          )
                        })}
                      </div>
                    </TabsContent>

                    <TabsContent value="trainers" className="mt-0">
                      <div className="max-h-[200px] overflow-y-auto border rounded-md bg-white p-1">
                        {isFetchingLists ? <div className="p-4 text-center text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div> :
                        allTrainers.length === 0 ? <div className="p-4 text-center text-sm text-gray-500">لا يوجد مدربين</div> :
                        allTrainers.map(user => {
                          const isSelected = selectedUsers.some(u => u.id === user.id)
                          return (
                            <div key={user.id} className={`flex items-center justify-between p-2 cursor-pointer rounded-sm hover:bg-slate-50 text-sm ${isSelected ? 'bg-blue-50' : ''}`} onClick={() => toggleUserSelection(user)}>
                              <span className="font-medium text-slate-700">{user.name}</span>
                              {isSelected && <CheckSquare className="h-4 w-4 text-blue-600" />}
                            </div>
                          )
                        })}
                      </div>
                    </TabsContent>

                    <TabsContent value="institutes" className="mt-0">
                      <div className="max-h-[200px] overflow-y-auto border rounded-md bg-white p-1">
                        {isFetchingLists ? <div className="p-4 text-center text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div> :
                        allInstitutes.length === 0 ? <div className="p-4 text-center text-sm text-gray-500">لا يوجد معاهد</div> :
                        allInstitutes.map(user => {
                          const isSelected = selectedUsers.some(u => u.id === user.id)
                          return (
                            <div key={user.id} className={`flex items-center justify-between p-2 cursor-pointer rounded-sm hover:bg-slate-50 text-sm ${isSelected ? 'bg-blue-50' : ''}`} onClick={() => toggleUserSelection(user)}>
                              <span className="font-medium text-slate-700">{user.name}</span>
                              {isSelected && <CheckSquare className="h-4 w-4 text-blue-600" />}
                            </div>
                          )
                        })}
                      </div>
                    </TabsContent>
                  </Tabs>

                  {selectedUsers.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs font-medium text-slate-500 mb-2">المستخدمون المحدّدون ({selectedUsers.length}):</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedUsers.map(user => (
                          <Badge key={user.id} variant="secondary" className="flex items-center gap-1 pl-1 bg-white border">
                            <span className="max-w-[100px] truncate" title={user.name}>{user.name}</span>
                            <button
                              type="button"
                              onClick={() => toggleUserSelection(user)}
                              className="rounded-full hover:bg-slate-200 p-0.5"
                            >
                              <X className="h-3 w-3 text-slate-500" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="category">نوع الإعلان</Label>
                <Select
                  value={newAnnouncement.category}
                  onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, category: value })}
                >
                  <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">عام</SelectItem>
                    <SelectItem value="event">فعالية</SelectItem>
                    <SelectItem value="maintenance">صيانة</SelectItem>
                    <SelectItem value="urgent">عاجل</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="send-status">طريقة النشر</Label>
                <Select
                  value={newAnnouncement.status}
                  onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, status: value, scheduledDate: '', scheduledTime: '' })}
                >
                  <SelectTrigger id="send-status"><SelectValue placeholder="اختر طريقة النشر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">مسودة (حفظ بدون إرسال)</SelectItem>
                    <SelectItem value="scheduled">مجدول (إرسال في وقت محدد)</SelectItem>
                    <SelectItem value="send_now">إرسال فوري</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newAnnouncement.status === 'scheduled' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="scheduledDate">تاريخ النشر</Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      value={newAnnouncement.scheduledDate}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, scheduledDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="scheduledTime">وقت النشر</Label>
                    <Input
                      id="scheduledTime"
                      type="time"
                      value={newAnnouncement.scheduledTime}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, scheduledTime: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="content">نص الإعلان</Label>
                <Textarea
                  id="content"
                  placeholder="اكتب نص الإعلان هنا..."
                  className="h-32"
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                />
              </div>

              <div className="pt-2">
                <Button className="w-full" onClick={handleCreateAnnouncement} disabled={submitting || !newAnnouncement.status}>
                  {submitting ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Send className="h-4 w-4 ml-2" />}
                  {newAnnouncement.status === 'send_now' ? 'إرسال فوري' : newAnnouncement.status === 'scheduled' ? 'جدولة الإعلان' : 'حفظ كمسودة'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Announcements List */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>سجل الإعلانات</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchAnnouncements} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p>لا توجد إعلانات بعد</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الإعلان</TableHead>
                    <TableHead>الجمهور</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((announcement) => (
                    <TableRow key={announcement.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {announcement.title}
                            {announcement.attachment && <Paperclip className="h-3 w-3 text-gray-400" />}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-[200px]">
                            {announcement.content}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-4 w-4 text-gray-500" />
                          {getAudienceLabel(announcement.targetAudience)}
                        </div>
                      </TableCell>
                      <TableCell>{getCategoryBadge(announcement.category)}</TableCell>
                      <TableCell>{getStatusBadge(announcement.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-500" />
                            {formatDate(new Date(announcement.createdAt))}
                          </div>
                          {announcement.scheduledDate && (
                            <div className="flex items-center gap-1 text-xs text-purple-600">
                              <Clock className="h-3 w-3" />
                              {format(new Date(announcement.scheduledDate), "dd/MM HH:mm")}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {announcement.status !== 'sent' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendAnnouncement(announcement)}
                              className="border-green-300 text-green-600 hover:bg-green-50"
                              title="إرسال الآن"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => handleEditAnnouncement(announcement)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteAnnouncement(announcement)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Dialog */}
      <Dialog open={actionDialog.open && actionDialog.type === 'delete'} onOpenChange={(open) => !open && setActionDialog({ open: false, type: null })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>حذف الإعلان</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAnnouncement && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-red-600">هل أنت متأكد من حذف الإعلان <strong>{selectedAnnouncement.title}</strong>؟</p>
                <p className="text-sm text-gray-600 mt-2">لا يمكن التراجع عن هذا الإجراء.</p>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setActionDialog({ open: false, type: null })}>إلغاء</Button>
              <Button onClick={executeAction} variant="destructive" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                حذف
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={actionDialog.open && actionDialog.type === 'edit'} onOpenChange={(open) => !open && setActionDialog({ open: false, type: null })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تعديل الإعلان</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">عنوان الإعلان</Label>
              <Input id="edit-title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="edit-audience">الجمهور المستهدف</Label>
              <Select value={editForm.targetAudience} onValueChange={(value) => setEditForm({ ...editForm, targetAudience: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الجميع</SelectItem>
                  <SelectItem value="students">الطلاب</SelectItem>
                  <SelectItem value="trainers">المدربين</SelectItem>
                  <SelectItem value="institutes">المعاهد</SelectItem>
                  <SelectItem value="specific_users">مستخدمين محددين</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editForm.targetAudience === 'specific_users' && (
              <div className="space-y-3 p-3 bg-slate-50 border border-slate-100 rounded-md">
                <Label>تحديد المستخدمين المخصصين</Label>
                
                <Tabs defaultValue="search" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 mb-2">
                    <TabsTrigger value="search">بحث</TabsTrigger>
                    <TabsTrigger value="students">الطلاب</TabsTrigger>
                    <TabsTrigger value="trainers">المدربين</TabsTrigger>
                    <TabsTrigger value="institutes">المعاهد</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="search" className="space-y-2 mt-0">
                    <div className="relative">
                      <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="ابحث بالاسم، الإيميل، أو الجوال..."
                        className="pr-9"
                        value={editSearchQuery}
                        onChange={(e) => handleSearchUsers(e.target.value, true)}
                      />
                      {isSearching && <Loader2 className="absolute left-3 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
                    </div>

                    {editSearchResults.length > 0 && editSearchQuery.length >= 2 && (
                      <div className="max-h-[120px] overflow-y-auto border rounded-md bg-white p-1">
                        {editSearchResults.map(user => {
                          const isSelected = editSelectedUsers.some(u => u.id === user.id) || editForm.recipientIds.includes(user.id);
                          return (
                            <div
                              key={user.id}
                              className={`flex items-center justify-between p-2 cursor-pointer rounded-sm hover:bg-slate-50 text-sm ${isSelected ? 'bg-blue-50' : ''}`}
                              onClick={() => toggleUserSelection(user, true)}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-700">{user.name}</span>
                                <span className="text-xs text-slate-500">{user.email}</span>
                              </div>
                              {isSelected && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">تم الاختيار</Badge>}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="students" className="mt-0">
                    <div className="max-h-[150px] overflow-y-auto border rounded-md bg-white p-1">
                      {isFetchingLists ? <div className="p-4 text-center text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div> :
                      allStudents.map(user => {
                        const isSelected = editSelectedUsers.some(u => u.id === user.id) || editForm.recipientIds.includes(user.id)
                        return (
                          <div key={user.id} className={`flex items-center justify-between p-2 cursor-pointer rounded-sm hover:bg-slate-50 text-sm ${isSelected ? 'bg-blue-50' : ''}`} onClick={() => toggleUserSelection(user, true)}>
                            <span className="font-medium text-slate-700">{user.name}</span>
                            {isSelected && <CheckSquare className="h-4 w-4 text-blue-600" />}
                          </div>
                        )
                      })}
                    </div>
                  </TabsContent>

                  <TabsContent value="trainers" className="mt-0">
                    <div className="max-h-[150px] overflow-y-auto border rounded-md bg-white p-1">
                      {isFetchingLists ? <div className="p-4 text-center text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div> :
                      allTrainers.map(user => {
                        const isSelected = editSelectedUsers.some(u => u.id === user.id) || editForm.recipientIds.includes(user.id)
                        return (
                          <div key={user.id} className={`flex items-center justify-between p-2 cursor-pointer rounded-sm hover:bg-slate-50 text-sm ${isSelected ? 'bg-blue-50' : ''}`} onClick={() => toggleUserSelection(user, true)}>
                            <span className="font-medium text-slate-700">{user.name}</span>
                            {isSelected && <CheckSquare className="h-4 w-4 text-blue-600" />}
                          </div>
                        )
                      })}
                    </div>
                  </TabsContent>

                  <TabsContent value="institutes" className="mt-0">
                    <div className="max-h-[150px] overflow-y-auto border rounded-md bg-white p-1">
                      {isFetchingLists ? <div className="p-4 text-center text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div> :
                      allInstitutes.map(user => {
                        const isSelected = editSelectedUsers.some(u => u.id === user.id) || editForm.recipientIds.includes(user.id)
                        return (
                          <div key={user.id} className={`flex items-center justify-between p-2 cursor-pointer rounded-sm hover:bg-slate-50 text-sm ${isSelected ? 'bg-blue-50' : ''}`} onClick={() => toggleUserSelection(user, true)}>
                            <span className="font-medium text-slate-700">{user.name}</span>
                            {isSelected && <CheckSquare className="h-4 w-4 text-blue-600" />}
                          </div>
                        )
                      })}
                    </div>
                  </TabsContent>
                </Tabs>

                {(editSelectedUsers.length > 0 || editForm.recipientIds.length > 0) && (
                  <div className="pt-2">
                    <p className="text-xs font-medium text-slate-500 mb-2">المستخدمون المحدّدون ({Math.max(editSelectedUsers.length, editForm.recipientIds.length)}):</p>
                    <div className="flex flex-wrap gap-2">
                      {editSelectedUsers.map(user => (
                        <Badge key={user.id} variant="secondary" className="flex items-center gap-1 pl-1 bg-white border">
                          <span className="max-w-[100px] truncate" title={user.name}>{user.name}</span>
                          <button type="button" onClick={() => toggleUserSelection(user, true)} className="rounded-full hover:bg-slate-200 p-0.5">
                            <X className="h-3 w-3 text-slate-500" />
                          </button>
                        </Badge>
                      ))}
                      {editSelectedUsers.length === 0 && editForm.recipientIds.length > 0 && (
                        <span className="text-xs text-gray-400">لا يتم عرض أسماء المستخدمين السابقين، ابحث لإضافة المزيد أو حذف الحاليين.</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div>
              <Label htmlFor="edit-category">نوع الإعلان</Label>
              <Select value={editForm.category} onValueChange={(value) => setEditForm({ ...editForm, category: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">عام</SelectItem>
                  <SelectItem value="event">فعالية</SelectItem>
                  <SelectItem value="maintenance">صيانة</SelectItem>
                  <SelectItem value="urgent">عاجل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-status">الحالة</Label>
              <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="scheduled">مجدول</SelectItem>
                  <SelectItem value="sent">تم الإرسال</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="edit-scheduledDate">تاريخ النشر</Label>
                <Input id="edit-scheduledDate" type="date" value={editForm.scheduledDate} onChange={(e) => setEditForm({ ...editForm, scheduledDate: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="edit-scheduledTime">وقت النشر</Label>
                <Input id="edit-scheduledTime" type="time" value={editForm.scheduledTime} onChange={(e) => setEditForm({ ...editForm, scheduledTime: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-content">نص الإعلان</Label>
              <Textarea id="edit-content" value={editForm.content} onChange={(e) => setEditForm({ ...editForm, content: e.target.value })} />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setActionDialog({ open: false, type: null })}>إلغاء</Button>
              <Button onClick={executeAction} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                حفظ التغييرات
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
