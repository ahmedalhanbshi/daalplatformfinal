"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, CheckCircle, Calendar, Megaphone, Clock, Loader2, UserPlus, Info, ExternalLink } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { notificationService, NotificationItem } from "@/lib/notification-service"
import { useNotifications } from "@/contexts/notification-context"
import { NotificationMessage } from "@/components/notifications/notification-message"
import { toast } from "sonner"
import Link from "next/link"

export default function InstituteNotificationsPage() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>("all")
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

    useEffect(() => { fetchNotifications() }, [fetchNotifications])

    const openNotification = async (notification: NotificationItem) => {
        setSelected(notification)
        if (!notification.isRead) {
            try {
                await notificationService.markAsRead(notification.id)
                setNotifications(prev =>
                    prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
                )
                refreshUnreadCount()
            } catch { /* silent */ }
        }
    }

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'booking': return <Calendar className="h-5 w-5" />
            case 'enrollment': return <UserPlus className="h-5 w-5" />
            case 'announcement': 
            case 'announcement_general':
            case 'announcement_event':
            case 'announcement_maintenance':
            case 'announcement_urgent': return <Megaphone className="h-5 w-5" />
            case 'session': return <Clock className="h-5 w-5" />
            default: return <Info className="h-5 w-5" />
        }
    }

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'booking': return 'text-blue-600 bg-blue-100'
            case 'enrollment': return 'text-green-600 bg-green-100'
            case 'announcement': 
            case 'announcement_general': return 'text-purple-600 bg-purple-100'
            case 'announcement_urgent': return 'text-red-600 bg-red-100'
            case 'announcement_maintenance': return 'text-orange-600 bg-orange-100'
            case 'announcement_event': return 'text-blue-600 bg-blue-100'
            case 'session': return 'text-orange-600 bg-orange-100'
            default: return 'text-gray-600 bg-gray-100'
        }
    }

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'booking': return 'حجز'
            case 'enrollment': return 'تسجيل'
            case 'announcement': 
            case 'announcement_general': return 'إعلان'
            case 'announcement_urgent': return 'عاجل'
            case 'announcement_maintenance': return 'صيانة'
            case 'announcement_event': return 'فعالية'
            case 'session': return 'درس'
            default: return type
        }
    }

    const filteredNotifications = notifications.filter(n =>
        filter === "all" ? true : filter === "unread" ? !n.isRead : (filter === "announcement" ? n.type?.startsWith("announcement") : n.type === filter)
    )

    const markAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead()
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
            clearUnread()
        } catch { toast.error("تعذّر تحديث الإشعارات") }
    }

    const unreadCount = notifications.filter(n => !n.isRead).length

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-3 rounded-xl">
                        <Bell className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">الإشعارات</h1>
                        <p className="text-gray-600 text-sm">متابعة حجوزات القاعات وتسجيلات الطلاب والإعلانات</p>
                    </div>
                </div>
                {unreadCount > 0 && (
                    <Button onClick={markAllAsRead}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        تحديد الكل كمقروء ({unreadCount})
                    </Button>
                )}
            </div>

            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <span className="font-medium">تصفية:</span>
                        <Select value={filter} onValueChange={setFilter}>
                            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">جميع الإشعارات</SelectItem>
                                <SelectItem value="unread">غير المقروءة</SelectItem>
                                <SelectItem value="booking">الحجوزات</SelectItem>
                                <SelectItem value="enrollment">التسجيلات</SelectItem>
                                <SelectItem value="announcement">الإعلانات</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3">
                {loading ? (
                    <Card><CardContent className="pt-6 flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </CardContent></Card>
                ) : filteredNotifications.length === 0 ? (
                    <Card><CardContent className="pt-6 text-center py-10 text-muted-foreground">
                        <Bell className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                        <p>{filter === "unread" ? "جميع الإشعارات مقروءة" : "لا توجد إشعارات جديدة"}</p>
                    </CardContent></Card>
                ) : filteredNotifications.map((notification) => (
                    <Card
                        key={notification.id}
                        className={`cursor-pointer transition-all hover:shadow-md hover:border-blue-300 ${!notification.isRead ? 'bg-blue-50/50 border-blue-100' : ''}`}
                        onClick={() => openNotification(notification)}
                    >
                        <CardContent className="p-4 flex items-start gap-4">
                            <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                                {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className={`font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'} flex items-center gap-2`}>
                                        {notification.title}
                                        {notification.actionUrl && (
                                            <ExternalLink className="h-3 w-3 text-emerald-500 opacity-60" />
                                        )}
                                    </h3>
                                    <Badge variant="outline" className="text-xs">{getTypeLabel(notification.type)}</Badge>
                                    {!notification.isRead && <div className="h-2 w-2 bg-blue-500 rounded-full ml-auto" />}
                                </div>
                                <NotificationMessage message={notification.message} />
                                <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDate(new Date(notification.createdAt))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Notification Detail Dialog */}
            <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    {selected && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`p-2 rounded-full ${getNotificationColor(selected.type)}`}>
                                        {getNotificationIcon(selected.type)}
                                    </div>
                                    <div>
                                        <DialogTitle className="text-right">{selected.title}</DialogTitle>
                                        <Badge variant="outline" className="text-xs mt-1">{getTypeLabel(selected.type)}</Badge>
                                    </div>
                                </div>
                            </DialogHeader>
                            <div className="space-y-4">
                                <NotificationMessage message={selected.message} isFull={true} />
                                <div className="flex items-center gap-2 text-sm text-gray-500 border-y py-3">
                                    <Clock className="h-4 w-4" />
                                    {formatDate(new Date(selected.createdAt))}
                                    <span className="mr-auto">
                                        <Badge className="bg-green-100 text-green-700">
                                            <CheckCircle className="h-3 w-3 ml-1" />
                                            مقروء
                                        </Badge>
                                    </span>
                                </div>
                            </div>
                            <DialogFooter className="mt-2 flex gap-3 sm:flex-row flex-col">
                                {selected.actionUrl && (
                                    <Button asChild className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                                        <Link href={selected.actionUrl}>
                                            <ExternalLink className="ml-2 h-4 w-4" />
                                            الانتقال للتفاصيل
                                        </Link>
                                    </Button>
                                )}
                                <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>
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
