"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, CheckCircle, CreditCard, Users, Calendar, Megaphone, Clock, Loader2, ExternalLink } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { notificationService, NotificationItem } from "@/lib/notification-service"
import { studentService } from "@/lib/student-service"
import { useNotifications } from "@/contexts/notification-context"
import { NotificationMessage } from "@/components/notifications/notification-message"
import { toast } from "sonner"
import Link from "next/link"
import { downloadRegistrationCertificate } from "@/lib/certificate-generator"
import { usePlatform } from "@/contexts/platform-context"

export default function StudentNotificationsPage() {
  const radiusClass = "rounded-[6.5px]"
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all")
  const [selected, setSelected] = useState<NotificationItem | null>(null)
  const [knownCourseIds, setKnownCourseIds] = useState<Set<string>>(new Set())
  const [entityToCourseId, setEntityToCourseId] = useState<Map<string, string>>(new Map())
  const [isDownloadingCert, setIsDownloadingCert] = useState(false)
  const { refreshUnreadCount, clearUnread } = useNotifications()
  const { settings } = usePlatform()

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const data = await notificationService.getNotifications()
      setNotifications(data)
    } catch {
      toast.error("تعذّر تحميل الإشعارات")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    const buildCourseLookup = async () => {
      try {
        const myCourses = await studentService.getMyCourses()
        const nextCourseIds = new Set<string>()
        const nextEntityMap = new Map<string, string>()

        for (const enrollment of myCourses || []) {
          const courseId = String(enrollment?.course?.id || enrollment?.courseId || "")
          if (!courseId) continue

          nextCourseIds.add(courseId)

          const enrollmentKeys = [
            enrollment?.id,
            enrollment?.enrollmentId,
            enrollment?.relatedEntityId,
            enrollment?._id,
          ].filter(Boolean)

          for (const key of enrollmentKeys) {
            nextEntityMap.set(String(key), courseId)
          }

          const payments = Array.isArray(enrollment?.payments) ? enrollment.payments : []
          for (const payment of payments) {
            const paymentKeys = [payment?.id, payment?.paymentId, payment?._id, payment?.relatedEntityId].filter(Boolean)
            for (const key of paymentKeys) {
              nextEntityMap.set(String(key), courseId)
            }
          }
        }

        setKnownCourseIds(nextCourseIds)
        setEntityToCourseId(nextEntityMap)
      } catch {
        // fallback only; notification view should still work
      }
    }

    buildCourseLookup()
  }, [])

  const openNotification = async (notification: NotificationItem) => {
    setSelected(notification)
    if (!notification.isRead) {
      try {
        await notificationService.markAsRead(notification.id)
        setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)))
        refreshUnreadCount()
      } catch {
        // silent
      }
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <CreditCard className="h-5 w-5" />
      case "enrollment":
        return <Users className="h-5 w-5" />
      case "session":
        return <Calendar className="h-5 w-5" />
      case "announcement":
      case "announcement_general":
      case "announcement_event":
      case "announcement_maintenance":
      case "announcement_urgent":
        return <Megaphone className="h-5 w-5" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "payment":
        return "text-green-600 bg-green-100"
      case "enrollment":
        return "text-blue-600 bg-blue-100"
      case "session":
        return "text-orange-600 bg-orange-100"
      case "announcement":
      case "announcement_general":
        return "text-purple-600 bg-purple-100"
      case "announcement_urgent":
        return "text-red-600 bg-red-100"
      case "announcement_maintenance":
        return "text-orange-600 bg-orange-100"
      case "announcement_event":
        return "text-blue-600 bg-blue-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "payment":
        return "دفع"
      case "enrollment":
        return "تسجيل"
      case "session":
        return "درس"
      case "announcement":
      case "announcement_general":
        return "إعلان"
      case "announcement_urgent":
        return "عاجل"
      case "announcement_maintenance":
        return "صيانة"
      case "announcement_event":
        return "فعالية"
      default:
        return type
    }
  }

  const filteredNotifications = notifications.filter((n) => {
    const matchesType = typeFilter === "all" ? true : (typeFilter === "announcement" ? n.type?.startsWith("announcement") : n.type === typeFilter)
    const matchesStatus = statusFilter === "all" ? true : statusFilter === "unread" ? !n.isRead : n.isRead
    return matchesType && matchesStatus
  })

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      clearUnread()
    } catch {
      toast.error("تعذّر تحديث الإشعارات")
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const resolveActionUrl = (notification: NotificationItem) => {
    const raw = notification.actionUrl || ""
    const type = String(notification.type || "").toLowerCase()
    const isCourseRelated = ["enrollment", "payment", "course"].includes(type)

    const extractCourseIdFromUrl = (url: string) => {
      const patterns = [
        /\/student\/courses\/([^/?#]+)/i,
        /\/student\/explore\/course\/([^/?#]+)/i,
        /\/courses\/([^/?#]+)/i,
      ]
      for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match?.[1]) return match[1]
      }
      return ""
    }

    const extractAnyIdFromUrl = (url: string) => {
      const uuidLike = url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
      if (uuidLike?.[0]) return uuidLike[0]
      const generic = url.match(/\/([^/?#]+)(?:[?#]|$)/)
      return generic?.[1] || ""
    }

    if (isCourseRelated) {
      const byUrl = extractCourseIdFromUrl(raw)
      if (byUrl && knownCourseIds.has(byUrl)) return `/student/explore/course/${byUrl}`

      const relatedId = String(notification.relatedEntityId || "")
      if (relatedId && entityToCourseId.has(relatedId)) {
        return `/student/explore/course/${entityToCourseId.get(relatedId)}`
      }

      const anyIdInUrl = extractAnyIdFromUrl(raw)
      if (anyIdInUrl && entityToCourseId.has(anyIdInUrl)) {
        return `/student/explore/course/${entityToCourseId.get(anyIdInUrl)}`
      }

      if (byUrl && !knownCourseIds.size) return `/student/explore/course/${byUrl}`
      return "/student/courses"
    }

    return raw
  }

  const handleDownloadCertificate = async (enrollmentId: string) => {
    if (!enrollmentId) {
      toast.error("تعذر العثور على بيانات التسجيل المرتبطة بهذا الإشعار")
      return
    }
    
    try {
      setIsDownloadingCert(true)
      await downloadRegistrationCertificate(
        enrollmentId, 
        settings?.general?.siteName || "منصة دال",
        settings?.general?.siteLogo
      )
    } catch (error) {
      // Error is handled in the utility
    } finally {
      setIsDownloadingCert(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[980px] px-4 pb-8 pt-3 sm:px-6 sm:pt-4" dir="rtl">
      <Card className={`mb-4 border-slate-200 shadow-sm sm:mb-5 ${radiusClass}`}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className={`h-10 w-full border-slate-200 text-right sm:w-[220px] ${radiusClass}`}>
                  <SelectValue placeholder="جميع الإشعارات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الإشعارات</SelectItem>
                  <SelectItem value="payment">المدفوعات</SelectItem>
                  <SelectItem value="enrollment">التسجيلات</SelectItem>
                  <SelectItem value="session">الدروس</SelectItem>
                  <SelectItem value="announcement">الإعلانات</SelectItem>
                </SelectContent>
              </Select>

              <div className={`grid h-10 w-full grid-cols-3 border border-slate-200 bg-slate-100 p-1 sm:w-[320px] ${radiusClass}`}>
                {[
                  { value: "all", label: "الكل" },
                  { value: "unread", label: "غير مقروء" },
                  { value: "read", label: "مقروء" },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setStatusFilter(tab.value as "all" | "unread" | "read")}
                    className={`${radiusClass} text-sm font-medium transition ${
                      statusFilter === tab.value ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} className={`h-10 bg-blue-600 px-4 text-white hover:bg-blue-700 ${radiusClass}`}>
                <CheckCircle className="ml-2 h-4 w-4" />
                تحديد الكل كمقروء
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <Card className={`border-slate-200 ${radiusClass}`}>
            <CardContent className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </CardContent>
          </Card>
        ) : filteredNotifications.length === 0 ? (
          <Card className={`border-slate-200 shadow-sm ${radiusClass}`}>
            <CardContent className="py-10 text-center">
              <Bell className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <h3 className="mb-2 text-lg font-semibold text-slate-900">لا توجد إشعارات</h3>
              <p className="text-sm text-slate-500">ستظهر هنا التحديثات المهمة عند توفرها</p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`cursor-pointer border transition-all duration-200 hover:-translate-y-[1px] hover:border-blue-300 hover:shadow-sm ${radiusClass} ${
                !notification.isRead ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"
              }`}
              onClick={() => openNotification(notification)}
            >
              <CardContent className="p-4 sm:p-4">
                <div className="flex min-h-[88px] items-center gap-3 sm:gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center ${radiusClass} ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="min-w-0 flex-1 text-right">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className={`flex items-center gap-2 text-sm font-bold sm:text-base ${!notification.isRead ? "text-slate-900" : "text-slate-700"}`}>
                        {notification.title}
                        {resolveActionUrl(notification) && <ExternalLink className="h-3 w-3 text-indigo-500 opacity-60" />}
                      </h3>
                      <Badge variant="outline" className={`${radiusClass} border-slate-200 text-[11px] text-slate-600`}>
                        {getTypeLabel(notification.type)}
                      </Badge>
                    </div>

                    <div className="line-clamp-2 text-sm text-slate-500">
                      <NotificationMessage message={notification.message} />
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      {formatDate(new Date(notification.createdAt))}
                    </div>
                  </div>

                  {!notification.isRead && <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-[6.5px] [&>button[data-dialog-close='default']]:hidden" dir="rtl">
          {selected && (
            <>
              <DialogHeader className="text-right">
                <div className="mb-2 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center ${radiusClass} ${getNotificationColor(selected.type)}`}>
                    {getNotificationIcon(selected.type)}
                  </div>
                  <div>
                    <DialogTitle className="text-right">{selected.title}</DialogTitle>
                    <Badge variant="outline" className={`mt-1 text-xs ${radiusClass}`}>
                      {getTypeLabel(selected.type)}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 text-right">
                <NotificationMessage message={selected.message} isFull={true} />
                <div className="flex items-center gap-2 border-y py-3 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  {formatDate(new Date(selected.createdAt))}
                  <span className="mr-auto">
                    <Badge className={`bg-green-100 text-green-700 ${radiusClass}`}>
                      <CheckCircle className="ml-1 h-3 w-3" />
                      مقروء
                    </Badge>
                  </span>
                </div>
              </div>

              <DialogFooter className="mt-2 flex flex-col gap-3 sm:flex-row">
                {resolveActionUrl(selected) && (
                  <Button asChild className={`flex-1 bg-indigo-600 text-white hover:bg-indigo-700 ${radiusClass}`}>
                    <Link href={resolveActionUrl(selected)}>
                      <ExternalLink className="ml-2 h-4 w-4" />
                      الانتقال للتفاصيل
                    </Link>
                  </Button>
                )}
                
                {(selected.originalType === "ENROLLMENT_FINAL_ACCEPTED" || 
                  selected.originalType === "PAYMENT_APPROVED" || 
                  selected.title?.includes("تم قبول الدفع") || 
                  selected.title?.includes("تم قبولك نهائياً")) && (
                  <Button 
                    variant="default" 
                    className={`flex-1 bg-blue-600 text-white hover:bg-blue-700 ${radiusClass}`} 
                    onClick={() => handleDownloadCertificate(selected.relatedEntityId!)}
                    disabled={isDownloadingCert}
                  >
                    {isDownloadingCert ? (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    ) : (
                      <span className="ml-2">📄</span>
                    )}
                    شهادة التسجيل
                  </Button>
                )}
                
                <Button variant="outline" className={`flex-1 ${radiusClass}`} onClick={() => setSelected(null)}>
                  إغلاق
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
