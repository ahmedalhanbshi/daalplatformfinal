"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle, XCircle, Clock, MapPin, Calendar, User, Loader2, Eye, List, ExternalLink, Download, Mail, Phone, AlertCircle } from "lucide-react"
import { formatDate, formatNumber, formatTime, getFileUrl } from "@/lib/utils"
import { instituteService } from "@/lib/institute-service"
import { toast } from "sonner"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

const DAY_LABELS: Record<string, string> = {
  SUNDAY: "الأحد",
  MONDAY: "الاثنين",
  TUESDAY: "الثلاثاء",
  WEDNESDAY: "الأربعاء",
  THURSDAY: "الخميس",
  FRIDAY: "الجمعة",
  SATURDAY: "السبت",
}

const SESSION_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: "مجدولة", className: "bg-blue-100 text-blue-800" },
  COMPLETED: { label: "مكتملة", className: "bg-green-100 text-green-800" },
  CANCELLED: { label: "ملغاة", className: "bg-red-100 text-red-800" },
  IN_PROGRESS: { label: "جارية", className: "bg-yellow-100 text-yellow-800" },
}

function formatArabicDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "d MMMM yyyy", { locale: ar })
  } catch {
    return dateStr
  }
}

function formatArabicDateTime(dateStr: string) {
  try {
    const d = new Date(dateStr)
    return {
      date: format(d, "d MMMM yyyy", { locale: ar }),
      time: format(d, "hh:mm a", { locale: ar }),
    }
  } catch {
    return { date: dateStr, time: "" }
  }
}

export default function InstituteRoomBookings() {
  const [bookings, setBookings] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedBooking, setSelectedBooking] = useState<any | null>(null)
  const [actionDialog, setActionDialog] = useState<{ open: boolean; type: "APPROVED" | "REJECTED" | null }>({
    open: false,
    type: null
  })
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; booking: any | null }>({
    open: false,
    booking: null
  })
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; booking: any | null }>({
    open: false,
    booking: null
  })
  const [notes, setNotes] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [bookingsData, roomsData] = await Promise.all([
        instituteService.getRoomBookings(),
        instituteService.getHalls()
      ])
      setBookings(bookingsData)
      setRooms(roomsData)
    } catch (error) {
      toast.error("فشل في تحميل البيانات")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleApproveBooking = (booking: any) => {
    setSelectedBooking(booking)
    setActionDialog({ open: true, type: "APPROVED" })
  }

  const handleRejectBooking = (booking: any) => {
    setSelectedBooking(booking)
    setActionDialog({ open: true, type: "REJECTED" })
  }

  const executeAction = async () => {
    if (!selectedBooking || !actionDialog.type) return

    try {
      setActionLoading(true)
      await instituteService.updateRoomBookingStatus(selectedBooking.id, {
        status: actionDialog.type,
        notes: actionDialog.type === "REJECTED" ? notes : undefined,
      })

      toast.success(actionDialog.type === "APPROVED" ? "تم قبول الحجز بنجاح" : "تم رفض الحجز")

      setActionDialog({ open: false, type: null })
      setSelectedBooking(null)
      setNotes("")

      fetchData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "حدث خطأ أثناء تنفيذ الإجراء")
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenSlipInNewTab = async (slipUrl: string, payerName?: string) => {
    try {
      const response = await fetch(slipUrl, { credentials: "include" })
      if (!response.ok) throw new Error("OPEN_FAILED")
      const blob = await response.blob()
      const imageUrl = URL.createObjectURL(blob)
      const safeName = (payerName || "بدون اسم").replace(/[\\/:*?\"<>|]/g, "_").trim()
      const pageTitle = `رسوم دفع - ${safeName}`
      const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${pageTitle}</title>
  <style>
    body { margin: 0; background: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    img { max-width: 96vw; max-height: 96vh; object-fit: contain; border-radius: 6.5px; box-shadow: 0 10px 28px rgba(0,0,0,.35); }
  </style>
</head>
<body>
  <img src="${imageUrl}" alt="${pageTitle}" />
</body>
</html>`
      const pageBlob = new Blob([html], { type: "text/html;charset=utf-8" })
      const pageUrl = URL.createObjectURL(pageBlob)
      window.open(pageUrl, "_blank", "noopener,noreferrer")

      setTimeout(() => {
        URL.revokeObjectURL(imageUrl)
        URL.revokeObjectURL(pageUrl)
      }, 60_000)
    } catch {
      toast.error("تعذر فتح الإيصال")
    }
  }

  const handleDownloadSlip = async (slipUrl: string, payerName?: string) => {
    try {
      const response = await fetch(slipUrl, { credentials: "include" })
      if (!response.ok) throw new Error("DOWNLOAD_FAILED")

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const safeName = (payerName || "بدون اسم").replace(/[\\/:*?\"<>|]/g, "_").trim()
      const ext = blob.type.includes("png") ? "png" : blob.type.includes("jpeg") ? "jpg" : "jpg"
      const fileName = `رسوم دفع - ${safeName}.${ext}`

      const link = document.createElement("a")
      link.href = objectUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      toast.error("تعذر تحميل الإيصال")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-800">مقبول</Badge>
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-800">مرفوض</Badge>
      case "PENDING_APPROVAL":
        return <Badge className="bg-orange-100 text-orange-800">قيد المراجعة</Badge>
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800">قيد المراجعة</Badge>
      case "PENDING_PAYMENT":
        return <Badge className="bg-blue-100 text-blue-800">في انتظار الدفع</Badge>
      case "CANCELLED":
        return <Badge className="bg-gray-100 text-gray-800">ملغى</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>جميع الطلبات</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الدورة</TableHead>
                <TableHead>الطلب بواسطة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>القاعة المقترحة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    لا توجد طلبات حجز حالياً
                  </TableCell>
                </TableRow>
              ) : (
                [...bookings].sort((a, b) => {
                  const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0
                  const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0
                  return bd - ad
                }).map((booking) => {
                  const { date, time } = formatArabicDateTime(booking.createdAt)
                  return (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.course?.title || "غير محدد"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {booking.requestedBy?.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <Calendar className="h-3 w-3 text-gray-500" />
                            <span>{date}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{time}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {booking.room?.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {getStatusBadge(booking.status)}
                          {booking.payments && booking.payments.length > 0 && (() => {
                            const latestPayment = [...booking.payments]
                              .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
                            if (!latestPayment?.depositSlipImage) return null
                            const slipUrl = getFileUrl(latestPayment.depositSlipImage)
                            if (!slipUrl) return null
                            return (
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenSlipInNewTab(slipUrl, paymentDialog.booking?.requestedBy?.name)}
                                  className="rounded-[6.5px] border-blue-300 text-blue-700 hover:bg-blue-50"
                                >
                                  <Eye className="h-4 w-4 ml-1" />
                                  فتح السند
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownloadSlip(slipUrl, booking?.requestedBy?.name)}
                                  className="rounded-[6.5px] border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                >
                                  <Download className="h-4 w-4 ml-1" />
                                  تنزيل السند
                                </Button>
                              </div>
                            )
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDetailsDialog({ open: true, booking })}
                            className="w-full text-purple-700 border-purple-300 hover:bg-purple-50"
                          >
                            <List className="h-4 w-4 mr-1 ml-1" />
                            عرض تفاصيل الحجز
                          </Button>

                          {booking.status === "PENDING_APPROVAL" || booking.status === "PENDING_PAYMENT" ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApproveBooking(booking)}
                                className="bg-green-600 hover:bg-green-700 w-full"
                              >
                                <CheckCircle className="h-4 w-4 mr-1 ml-1" />
                                قبول
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectBooking(booking)}
                                className="border-red-300 text-red-600 hover:bg-red-50 w-full"
                              >
                                <XCircle className="h-4 w-4 mr-1 ml-1" />
                                رفض
                              </Button>
                            </>
                          ) : (
                            <div className="text-sm text-gray-500">
                              {booking.status === "APPROVED" && booking.approvedBy && (
                                <span>بواسطة: {booking.approvedBy.name}</span>
                              )}
                              {(booking.notes || booking.rejectionReason) && (
                                <p className="mt-1 text-xs">{booking.notes || booking.rejectionReason}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ==================== Action Dialog (Approve / Reject) ==================== */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && !actionLoading && setActionDialog({ open: false, type: null })}>
        <DialogContent
          dir="rtl"
          className="w-[calc(100%-32px)] max-w-[460px] rounded-[6.5px] [&_[data-dialog-close='default']]:hidden"
        >
          <DialogHeader className="w-full text-right">
            <DialogTitle className="w-full text-right">{actionDialog.type === "APPROVED" ? "قبول طلب الحجز" : "رفض طلب الحجز"}</DialogTitle>
          </DialogHeader>

          {actionDialog.type === "APPROVED" ? (
            <div className="space-y-4 text-right">
              <div className="flex items-start gap-3 rounded-[6.5px] border border-emerald-100 bg-emerald-50/40 p-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">هل أنت متأكد من قبول طلب حجز القاعة؟</p>
                  <p className="text-xs text-slate-600">سيتم اعتماد الطلب وإشعار مقدم الطلب بالقبول.</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button onClick={executeAction} className="rounded-[6.5px] bg-green-600 hover:bg-green-700" disabled={actionLoading}>
                  {actionLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  تأكيد القبول
                </Button>
                <Button variant="outline" className="rounded-[6.5px]" onClick={() => setActionDialog({ open: false, type: null })} disabled={actionLoading}>
                  إلغاء
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">سبب الرفض</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="اكتب سبب رفض الطلب..."
                  className="mt-1 resize-none"
                  rows={3}
                  disabled={actionLoading}
                />
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <Button variant="outline" className="rounded-[6.5px]" onClick={() => setActionDialog({ open: false, type: null })} disabled={actionLoading}>
                  إلغاء
                </Button>
                <Button onClick={executeAction} className="rounded-[6.5px] bg-red-600 hover:bg-red-700" disabled={actionLoading}>
                  {actionLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  تأكيد الرفض
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== Payment Dialog ==================== */}
      <Dialog open={paymentDialog.open} onOpenChange={(open) => !open && setPaymentDialog({ open: false, booking: null })}>
        <DialogContent dir="rtl" className="sm:max-w-[425px] rounded-[6.5px] [&>button]:left-4 [&>button]:right-auto">
          <DialogHeader>
            <DialogTitle className="w-full text-right">تفاصيل الدفع</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pr-2">
            {paymentDialog.booking && paymentDialog.booking.payments && paymentDialog.booking.payments.length > 0 ? (
              [...paymentDialog.booking.payments]
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((payment: any, index: number) => (
                  <div key={payment.id} className={`p-4 rounded-[6.5px] space-y-2 text-sm border ${index === 0 ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">المبلغ المطلوب:</span>
                      </div>
                      <span className="font-bold text-lg">{payment.amount} {payment.currency}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">الحالة:</span>
                      <Badge variant={payment.status === 'APPROVED' ? 'default' : payment.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                        {payment.status === 'APPROVED' ? 'مقبول' : payment.status === 'REJECTED' ? 'مرفوض' : 'قيد المراجعة'}
                      </Badge>
                    </div>
                    {payment.notes && (
                      <div className="mt-2 pt-2 border-t text-gray-600">
                        <span className="font-medium text-gray-700 block mb-1">الملاحظات:</span>
                        {payment.notes}
                      </div>
                    )}
                    {payment.depositSlipImage && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="font-medium text-gray-700 block mb-2">الإيصال:</span>
                        {(() => {
                          const slipUrl = getFileUrl(payment.depositSlipImage)
                          if (!slipUrl) return null
                          return (
                            <>
                              <img
                                src={slipUrl}
                                alt="Deposit Slip"
                                className="max-w-full h-auto rounded-[6.5px] border"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                              <div className="mt-3 flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-[6.5px] text-blue-700 border-blue-300 hover:bg-blue-50"
                                  onClick={() => handleOpenSlipInNewTab(slipUrl)}
                                >
                                  <ExternalLink className="h-4 w-4 ml-1" />
                                  فتح
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-[6.5px] text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                  onClick={() => handleDownloadSlip(slipUrl, paymentDialog.booking?.requestedBy?.name)}
                                >
                                  <Download className="h-4 w-4 ml-1" />
                                  تحميل
                                </Button>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    )}
                    {payment.rejectionReason && (
                      <div className="mt-2 pt-2 border-t text-red-600 bg-red-50 p-2 rounded-[6.5px]">
                        <span className="font-medium block mb-1">سبب الرفض:</span>
                        {payment.rejectionReason}
                      </div>
                    )}
                  </div>
                ))
            ) : (
              <div className="text-center p-4 text-gray-500">لا توجد تفاصيل دفع متاحة</div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" className="rounded-[6.5px]" onClick={() => setPaymentDialog({ open: false, booking: null })}>
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== Booking Details Dialog ==================== */}
      <Dialog open={detailsDialog.open} onOpenChange={(open) => !open && setDetailsDialog({ open: false, booking: null })}>
        <DialogContent
          dir="rtl"
          className="sm:max-w-[820px] max-h-[85vh] overflow-hidden rounded-[6.5px] p-0 [&>button]:left-4 [&>button]:right-auto"
        >
          <div className="flex h-full max-h-[85vh] flex-col">
            <DialogHeader className="sticky top-0 z-10 border-b bg-white px-5 py-4">
              <DialogTitle className="w-full text-right text-lg font-bold text-slate-900">تفاصيل الحجز</DialogTitle>
            </DialogHeader>

            {detailsDialog.booking && (() => {
              const b = detailsDialog.booking
              const trainerName = b.requestedBy?.name || "غير محدد"
              const trainerEmail = b.requestedBy?.email || "غير متوفر"
              const trainerPhone = b.requestedBy?.phone || "غير متوفر"
              const trainerAvatar = b.requestedBy?.image || b.requestedBy?.avatar || b.requestedBy?.profileImage
              const trainerInitial = trainerName.trim().charAt(0) || "م"
              const sessions = b.sessions || []
              const matchedRoom = rooms.find((r: any) => r.id === b.roomId || r.id === b.room?.id) || null
              const resolvedRoom = matchedRoom || b.room || {}
              const roomName = resolvedRoom.name || b.roomName || "غير محدد"
              const roomType = resolvedRoom.type || resolvedRoom.category || resolvedRoom.hallType || "غير محدد"
              const roomCapacityValue = resolvedRoom.capacity ?? resolvedRoom.maxCapacity
              const roomCapacity = typeof roomCapacityValue === "number" ? `${roomCapacityValue}` : "غير محدد"
              const roomPriceValue = resolvedRoom.pricePerHour ?? resolvedRoom.hourlyPrice ?? resolvedRoom.price
              const roomPricePerHour = roomPriceValue
                ? `${formatNumber(Number(roomPriceValue))} ر.ي`
                : "غير محدد"
              const fallbackTopic = b.purpose || b.course?.title || "غير محدد"
              const hasCourseBooking = Boolean(b.course?.title?.trim())
              const bookingReasonText = hasCourseBooking
                ? `هذا الحجز مرتبط بالدورة: ${b.course.title}`
                : "هذا طلب حجز مباشر للقاعة"
              const uniqueDaysCount = new Set(
                sessions.map((session: any) => format(new Date(session.startTime), "yyyy-MM-dd"))
              ).size
              const sessionsCount = sessions.length
              const totalHours = sessions.reduce((sum: number, session: any) => {
                const start = new Date(session.startTime).getTime()
                const end = new Date(session.endTime).getTime()
                if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return sum
                return sum + (end - start) / (1000 * 60 * 60)
              }, 0)
              const normalizedTotalHours = Number.isInteger(totalHours) ? `${totalHours}` : totalHours.toFixed(1)
              const roomPriceNumeric = Number(roomPriceValue || 0)
              const finalTotalPrice =
                Number(b.totalPrice) > 0
                  ? Number(b.totalPrice)
                  : roomPriceNumeric > 0
                    ? totalHours * roomPriceNumeric
                    : 0

              return (
                <>
                  <div className="flex-1 overflow-y-auto px-5 py-4">
                    <div className="space-y-4">
                      <section className="rounded-[6.5px] border border-slate-200 bg-white p-4">
                        <h3 className="mb-3 text-sm font-bold text-slate-900">معلومات المدرب</h3>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <div className="shrink-0">
                            {trainerAvatar ? (
                              <img
                                src={trainerAvatar}
                                alt={trainerName}
                                className="h-14 w-14 rounded-[6.5px] border border-slate-200 object-cover"
                              />
                            ) : (
                              <div className="flex h-14 w-14 items-center justify-center rounded-[6.5px] bg-blue-100 text-xl font-bold text-blue-700">
                                {trainerInitial}
                              </div>
                            )}
                          </div>
                          <div className="grid flex-1 grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                            <p className="font-semibold text-slate-900">{trainerName}</p>
                            <a
                              href={`mailto:${trainerEmail}`}
                              className="inline-flex items-center gap-1.5 font-semibold text-slate-900 hover:text-blue-700 break-all"
                            >
                              <Mail className="h-4 w-4 text-slate-500" />
                              <span>{trainerEmail}</span>
                            </a>
                            <a
                              href={`https://wa.me/${String(trainerPhone).replace(/[^\d]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 font-semibold text-slate-900 hover:text-green-700"
                            >
                              <Phone className="h-4 w-4 text-slate-500" />
                              <span>{trainerPhone}</span>
                            </a>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-[6.5px] border border-slate-200 bg-white p-4">
                        <h3 className="mb-3 text-sm font-bold text-slate-900">معلومات القاعة</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                          <div>
                            <p className="text-xs text-slate-500">اسم القاعة</p>
                            <p className="font-semibold text-slate-900">{roomName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">نوع القاعة</p>
                            <p className="font-semibold text-slate-900">{roomType}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">السعة</p>
                            <p className="font-semibold text-slate-900">{roomCapacity}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">السعر / ساعة</p>
                            <p className="font-semibold text-slate-900">{roomPricePerHour}</p>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-[6.5px] border border-slate-200 bg-white p-4">
                        <h3 className="mb-3 text-sm font-bold text-slate-900">تفاصيل الحجز</h3>
                        <div className="mb-3 rounded-[6.5px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          <span className="font-semibold text-slate-800">سبب الحجز:</span>{" "}
                          <span className="text-slate-700">{bookingReasonText}</span>
                        </div>
                        {sessions.length > 0 ? (
                          <>
                            <div className="overflow-x-auto rounded-[6.5px] border border-slate-200">
                              <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-50">
                                  <TableHead className="text-right">#</TableHead>
                                  <TableHead className="text-right">التاريخ</TableHead>
                                  <TableHead className="text-right">اليوم</TableHead>
                                  <TableHead className="text-right">من</TableHead>
                                  <TableHead className="text-right">إلى</TableHead>
                                  <TableHead className="text-right">الحالة</TableHead>
                                  <TableHead className="text-right">الغرض / الموضوع</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sessions.map((session: any, idx: number) => {
                                  const statusInfo = SESSION_STATUS_LABELS[session.status] ?? { label: session.status, className: "bg-gray-100 text-gray-700" }
                                  const sessionDate = new Date(session.startTime)
                                  const dayLabel = DAY_LABELS[format(sessionDate, "EEEE").toUpperCase()] || format(sessionDate, "EEEE", { locale: ar })
                                  return (
                                    <TableRow key={session.id} className="hover:bg-slate-50">
                                      <TableCell className="text-sm text-slate-500">{idx + 1}</TableCell>
                                      <TableCell className="text-sm font-medium text-slate-900">{formatArabicDate(session.startTime)}</TableCell>
                                      <TableCell className="text-sm text-slate-700">{dayLabel}</TableCell>
                                      <TableCell className="text-sm text-slate-700">{formatTime(session.startTime)}</TableCell>
                                      <TableCell className="text-sm text-slate-700">{formatTime(session.endTime)}</TableCell>
                                      <TableCell>
                                        <Badge className={`border-transparent text-xs ${statusInfo.className}`}>{statusInfo.label}</Badge>
                                      </TableCell>
                                      <TableCell className="text-sm text-slate-700">{session.topic || fallbackTopic}</TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                              </Table>
                            </div>

                            <div className="mt-2 grid grid-cols-2 gap-2 rounded-[6.5px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm sm:grid-cols-4">
                              <div className="text-slate-700">عدد الأيام: <span className="font-semibold text-slate-900">{uniqueDaysCount}</span></div>
                              <div className="text-slate-700">عدد الجلسات: <span className="font-semibold text-slate-900">{sessionsCount}</span></div>
                              <div className="text-slate-700">إجمالي الساعات: <span className="font-semibold text-slate-900">{normalizedTotalHours}</span></div>
                              <div className="text-slate-700 sm:text-left">
                                الإجمالي النهائي: <span className="font-bold text-slate-900">{formatNumber(finalTotalPrice)} ر.ي</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="rounded-[6.5px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                            لا توجد جلسات مسجلة لهذا الحجز
                          </div>
                        )}
                      </section>
                    </div>
                  </div>

                  <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 border-t bg-white px-5 py-3">
                    {b.payments && b.payments.length > 0 && (() => {
                      const latestPayment = [...b.payments]
                        .sort((a: any, c: any) => new Date(c.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
                      if (!latestPayment?.depositSlipImage) return null
                      const slipUrl = getFileUrl(latestPayment.depositSlipImage)
                      if (!slipUrl) return null
                      return (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-[6.5px] border-blue-300 text-blue-700 hover:bg-blue-50"
                            onClick={() => handleOpenSlipInNewTab(slipUrl, b?.requestedBy?.name)}
                          >
                            <Eye className="h-4 w-4 ml-1" />
                            فتح السند
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-[6.5px] border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleDownloadSlip(slipUrl, b?.requestedBy?.name)}
                          >
                            <Download className="h-4 w-4 ml-1" />
                            تنزيل السند
                          </Button>
                        </>
                      )
                    })()}
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-[6.5px]"
                      onClick={() => setDetailsDialog({ open: false, booking: null })}
                    >
                      إغلاق
                    </Button>
                  </div>
                </>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


