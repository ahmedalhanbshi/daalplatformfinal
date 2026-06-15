"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, CheckCircle, Users, Megaphone, Clock, Loader2, ExternalLink, ShieldAlert, Building, UserCheck } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { notificationService, NotificationItem } from "@/lib/notification-service"
import { useNotifications } from "@/contexts/notification-context"
import { NotificationMessage } from "@/components/notifications/notification-message"
import { toast } from "sonner"
import Link from "next/link"

export default function AdminNotificationsPage() {
  const radiusClass = "rounded-[6.5px]"
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all")
  const [selected, setSelected] = useState<NotificationItem | null>(null)
  const { refreshUnreadCount, clearUnread } = useNotifications()

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
      case "new_trainer_application":
        return <UserCheck className="h-5 w-5" />
      case "new_institute_application":
        return <Building className="h-5 w-5" />
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
      case "new_trainer_application":
        return "text-blue-600 bg-blue-100"
      case "new_institute_application":
        return "text-indigo-600 bg-indigo-100"
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
      case "new_trainer_application":
        return "طلب مدرب جديد"
      case "new_institute_application":
        return "طلب معهد جديد"
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

  return (
    <div className="mx-auto w-full max-w-[980px] px-4 pb-8 pt-3 sm:px-6 sm:pt-4" dir="rtl">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">إشعارات النظام</h1>
        <p className="text-sm text-slate-500">متابعة طلبات التسجيل والتنبيهات الهامة الخاصة بالمنصة.</p>
      </div>

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
                  <SelectItem value="new_trainer_application">طلبات المدربين</SelectItem>
                  <SelectItem value="new_institute_application">طلبات المعاهد</SelectItem>
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
                        {notification.actionUrl && <ExternalLink className="h-3 w-3 text-indigo-500 opacity-60" />}
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
                {selected.actionUrl && (
                  <Button asChild className={`flex-1 bg-indigo-600 text-white hover:bg-indigo-700 ${radiusClass}`}>
                    <Link href={selected.actionUrl}>
                      <ExternalLink className="ml-2 h-4 w-4" />
                      الانتقال للتفاصيل
                    </Link>
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
