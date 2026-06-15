"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MapPin,
  Clock,
  X,
  CheckCircle,
  AlertCircle,
  Filter,
  Loader2,
  Upload,
  Eye,
  Building2,
  ListChecks,
  CheckCircle2,
  XCircle,
  FileClock,
  BookOpen,
  Info,
} from "lucide-react"
import { trainerService } from "@/lib/trainer-service"
import { toast } from "sonner"

export default function TrainerRoomBookingsPage() {
  const radiusClass = "rounded-[6.5px]"
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")

  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentFile, setPaymentFile] = useState<File | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)

  const [showViewPaymentDialog, setShowViewPaymentDialog] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const data = await trainerService.getRoomBookings()
      setBookings(data)
    } catch {
      toast.error("فشل في تحميل طلبات الحجز")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredBookings = bookings.filter((booking) => {
    if (filter === "all") return true
    if (filter === "pending") return ["PENDING", "PENDING_APPROVAL", "PENDING_PAYMENT"].includes(booking.status)
    if (filter === "approved") return booking.status === "APPROVED"
    if (filter === "rejected") return booking.status === "REJECTED"
    if (filter === "cancelled") return booking.status === "CANCELLED"
    return true
  }).sort((a, b) => {
    const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return bd - ad
  })

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "مقبول"
      case "REJECTED":
        return "مرفوض"
      case "PENDING":
      case "PENDING_APPROVAL":
        return "بانتظار الموافقة"
      case "PENDING_PAYMENT":
        return "بانتظار الدفع"
      case "CANCELLED":
        return "ملغى"
      default:
        return status || "غير معروف"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "text-green-700 border-green-200 bg-green-50"
      case "REJECTED":
        return "text-red-700 border-red-200 bg-red-50"
      case "PENDING":
      case "PENDING_APPROVAL":
        return "text-amber-700 border-amber-200 bg-amber-50"
      case "PENDING_PAYMENT":
        return "text-blue-700 border-blue-200 bg-blue-50"
      case "CANCELLED":
        return "text-slate-700 border-slate-200 bg-slate-50"
      default:
        return "text-slate-700 border-slate-200 bg-slate-50"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="h-3.5 w-3.5" />
      case "REJECTED":
        return <X className="h-3.5 w-3.5" />
      case "PENDING":
      case "PENDING_APPROVAL":
      case "PENDING_PAYMENT":
        return <Clock className="h-3.5 w-3.5" />
      case "CANCELLED":
        return <AlertCircle className="h-3.5 w-3.5" />
      default:
        return null
    }
  }

  const handleCancelBooking = (booking: any) => {
    setSelectedBooking(booking)
    setShowCancelDialog(true)
  }

  const confirmCancellation = async () => {
    if (!selectedBooking) return
    try {
      setCancelLoading(true)
      await trainerService.cancelBooking(selectedBooking.courseId, selectedBooking.id)
      toast.success("تم إلغاء طلب الحجز بنجاح")
      setShowCancelDialog(false)
      setSelectedBooking(null)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || "فشل في إلغاء الطلب")
    } finally {
      setCancelLoading(false)
    }
  }

  const handlePaymentSubmit = async () => {
    if (!selectedBooking || !paymentFile) {
      toast.error("الرجاء اختيار ملف الإيصال")
      return
    }

    try {
      setPaymentLoading(true)
      await trainerService.resubmitBookingPayment(selectedBooking.courseId, selectedBooking.id, paymentFile)
      toast.success("تم إرسال الإيصال بنجاح")
      setShowPaymentDialog(false)
      setSelectedBooking(null)
      setPaymentFile(null)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || "فشل في إرسال الإيصال")
    } finally {
      setPaymentLoading(false)
    }
  }

  const pendingBookings = bookings.filter((b) => ["PENDING", "PENDING_APPROVAL", "PENDING_PAYMENT"].includes(b.status))
  const approvedBookings = bookings.filter((b) => b.status === "APPROVED")
  const rejectedBookings = bookings.filter((b) => b.status === "REJECTED")

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center py-20" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 bg-slate-50/60 px-4 pb-8 pt-6 sm:px-6" dir="rtl">
      <div className="space-y-1 text-right">
        <h1 className="text-3xl font-bold text-slate-900">طلبات حجز القاعات</h1>
        <p className="text-slate-600">إدارة طلبات حجز القاعات لدروس الدورات التدريبية</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard radiusClass={radiusClass} title="قيد المعالجة" value={pendingBookings.length} icon={<FileClock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-100" />
        <StatsCard radiusClass={radiusClass} title="مقبولة" value={approvedBookings.length} icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} iconBg="bg-green-100" />
        <StatsCard radiusClass={radiusClass} title="مرفوضة" value={rejectedBookings.length} icon={<XCircle className="h-4 w-4 text-red-600" />} iconBg="bg-red-100" />
        <StatsCard radiusClass={radiusClass} title="إجمالي الطلبات" value={bookings.length} icon={<Building2 className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-100" />
      </div>

      <Card className={`border-slate-200 bg-white shadow-sm ${radiusClass}`}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-slate-700">
              <Filter className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-semibold">تصفية الطلبات</span>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className={`h-10 w-full border-slate-200 text-right sm:w-[230px] ${radiusClass}`}>
                <SelectValue placeholder="جميع الطلبات" />
              </SelectTrigger>
              <SelectContent className={radiusClass}>
                <SelectItem value="all">جميع الطلبات</SelectItem>
                <SelectItem value="pending">قيد المعالجة</SelectItem>
                <SelectItem value="approved">مقبولة</SelectItem>
                <SelectItem value="rejected">مرفوضة</SelectItem>
                <SelectItem value="cancelled">ملغاة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className={`border-slate-200 bg-white shadow-sm ${radiusClass}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-right text-lg">قائمة طلبات الحجز</CardTitle>
          <CardDescription className="text-right">جميع طلبات حجز القاعات المرتبطة بدوراتك</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredBookings.length === 0 ? (
            <div className="py-12 text-center">
              <MapPin className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <h3 className="mb-1 text-lg font-semibold text-slate-900">لا توجد طلبات حجز</h3>
              <p className="text-sm text-slate-500">{filter === "all" ? "لم تقم بطلب حجز أي قاعة بعد" : "لا توجد طلبات في هذه الحالة"}</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="h-11 text-right font-semibold text-slate-700">الدورة</TableHead>
                      <TableHead className="h-11 text-right font-semibold text-slate-700">القاعة المطلوبة</TableHead>
                      <TableHead className="h-11 text-right font-semibold text-slate-700">الحالة</TableHead>
                      <TableHead className="h-11 text-right font-semibold text-slate-700">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow key={booking.id} className="h-16">
                        <TableCell className="text-right align-middle">
                          <span className="text-sm font-semibold text-slate-900">{booking.course?.title || "دورة غير محددة"}</span>
                        </TableCell>
                        <TableCell className="text-right align-middle">
                          {booking.room ? (
                            <Link href={`/trainer/halls/${booking.room.id}`} className="inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-900">
                              <MapPin className="h-4 w-4 text-slate-500" />
                              <span className="font-medium">{booking.room.name}</span>
                            </Link>
                          ) : (
                            <span className="text-slate-500">غير محدد</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right align-middle">
                          <div className="flex flex-col items-start gap-1">
                            <Badge variant="outline" className={`inline-flex items-center gap-1 border ${getStatusColor(booking.status)} ${radiusClass}`}>
                              {getStatusIcon(booking.status)}
                              {getStatusLabel(booking.status)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle">
                          <div className="flex flex-wrap items-center justify-start gap-2">
                            {booking.payments && booking.payments.length > 0 ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className={`h-8 border-blue-300 px-3 text-blue-700 hover:bg-blue-50 ${radiusClass}`}
                                onClick={() => {
                                  setSelectedBooking(booking)
                                  setShowViewPaymentDialog(true)
                                }}
                              >
                                <Eye className="ml-1 h-3.5 w-3.5" />
                                عرض الدفع
                              </Button>
                            ) : null}

                            {booking.status === "PENDING_PAYMENT" ? (
                              <Button
                                variant="default"
                                size="sm"
                                className={`h-8 bg-blue-600 px-3 hover:bg-blue-700 ${radiusClass}`}
                                onClick={() => {
                                  setSelectedBooking(booking)
                                  setShowPaymentDialog(true)
                                }}
                              >
                                <Upload className="ml-1 h-3.5 w-3.5" />
                                رفع الإيصال
                              </Button>
                            ) : null}

                            {booking.status === "PENDING" || booking.status === "PENDING_APPROVAL" ? (
                              <Button variant="outline" size="sm" className={`h-8 border-red-300 px-3 text-red-600 hover:bg-red-50 ${radiusClass}`} onClick={() => handleCancelBooking(booking)}>
                                <X className="ml-1 h-3.5 w-3.5" />
                                إلغاء الطلب
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredBookings.map((booking) => (
                  <div key={booking.id} className={`border border-slate-200 bg-white p-3 ${radiusClass}`}>
                    <div className="mb-2 text-right text-sm font-semibold text-slate-900">{booking.course?.title || "دورة غير محددة"}</div>
                    <div className="mb-2 text-right">
                      {booking.room ? (
                        <Link href={`/trainer/halls/${booking.room.id}`} className="inline-flex items-center gap-1.5 text-sm text-blue-700">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          {booking.room.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-500">غير محدد</span>
                      )}
                    </div>
                    <div className="mb-3 text-right">
                      <Badge variant="outline" className={`inline-flex items-center gap-1 border ${getStatusColor(booking.status)} ${radiusClass}`}>
                        {getStatusIcon(booking.status)}
                        {getStatusLabel(booking.status)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center justify-start gap-2">
                      {booking.payments && booking.payments.length > 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-8 border-blue-300 px-3 text-blue-700 hover:bg-blue-50 ${radiusClass}`}
                          onClick={() => {
                            setSelectedBooking(booking)
                            setShowViewPaymentDialog(true)
                          }}
                        >
                          <Eye className="ml-1 h-3.5 w-3.5" />
                          عرض الدفع
                        </Button>
                      ) : null}

                      {booking.status === "PENDING_PAYMENT" ? (
                        <Button
                          variant="default"
                          size="sm"
                          className={`h-8 bg-blue-600 px-3 hover:bg-blue-700 ${radiusClass}`}
                          onClick={() => {
                            setSelectedBooking(booking)
                            setShowPaymentDialog(true)
                          }}
                        >
                          <Upload className="ml-1 h-3.5 w-3.5" />
                          رفع الإيصال
                        </Button>
                      ) : null}

                      {booking.status === "PENDING" || booking.status === "PENDING_APPROVAL" ? (
                        <Button variant="outline" size="sm" className={`h-8 border-red-300 px-3 text-red-600 hover:bg-red-50 ${radiusClass}`} onClick={() => handleCancelBooking(booking)}>
                          <X className="ml-1 h-3.5 w-3.5" />
                          إلغاء الطلب
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className={`border-slate-200 bg-white shadow-sm ${radiusClass}`}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-900">
              <BookOpen className="h-4 w-4 text-blue-600" />
              طلب حجز قاعة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 bg-blue-500" />يتم طلب الحجز أثناء إنشاء الدورة واختيار النوع &quot;حضوري&quot;.</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 bg-blue-500" />إذا كانت القاعة مدفوعة، سيُطلب رفع إيصال الدفع للقبول النهائي.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className={`border-slate-200 bg-white shadow-sm ${radiusClass}`}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-900">
              <Info className="h-4 w-4 text-blue-600" />
              الدلالات والحالة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 bg-amber-500" />بانتظار الموافقة: قيد مراجعة الطلب المبدئي.</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 bg-blue-500" />بانتظار الدفع: تم القبول مبدئيًا ويتطلب إيصال دفع.</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 bg-red-500" />مرفوض: تم رفض الحجز وسيظهر السبب.</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 bg-green-500" />مقبول: تم اعتماد الحجز ويمكنك استخدامه في الدورة.</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent dir="rtl" className={`border-slate-200 p-6 ${radiusClass}`}>
          <DialogHeader>
            <DialogTitle className="text-right">تأكيد إلغاء الطلب</DialogTitle>
            <DialogDescription className="text-right">
              هل أنت متأكد من رغبتك في إلغاء طلب حجز القاعة لدرس &ldquo;{selectedBooking?.sessions?.[0]?.topic || selectedBooking?.sessions?.[0]?.title || selectedBooking?.course?.title}&rdquo;؟ هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" className={radiusClass} onClick={() => setShowCancelDialog(false)} disabled={cancelLoading}>تراجع</Button>
            <Button variant="destructive" className={radiusClass} onClick={confirmCancellation} disabled={cancelLoading}>
              {cancelLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "تأكيد الإلغاء"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showPaymentDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowPaymentDialog(false)
            setSelectedBooking(null)
            setPaymentFile(null)
          }
        }}
      >
        <DialogContent dir="rtl" className={`border-slate-200 p-6 ${radiusClass}`}>
          <DialogHeader>
            <DialogTitle className="text-right">تأكيد الدفع</DialogTitle>
            <DialogDescription className="text-right">الرجاء إرفاق صورة إيصال الدفع للحجز. يجب أن يكون الإيصال واضحًا ومقروءًا.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex w-full items-center justify-center">
              <label htmlFor="dropzone-file" className={`flex h-32 w-full cursor-pointer flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:bg-slate-50 ${radiusClass}`}>
                <div className="flex flex-col items-center justify-center pb-6 pt-5">
                  <Upload className="mb-2 h-8 w-8 text-slate-500" />
                  <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">انقر للرفع</span> أو اسحب الملف هنا</p>
                  <p className="text-xs text-slate-500">JPEG, PNG, JPG</p>
                </div>
                <input
                  id="dropzone-file"
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) setPaymentFile(e.target.files[0])
                  }}
                />
              </label>
            </div>
            {paymentFile ? <div className={`bg-blue-50 p-2 text-center text-sm text-blue-700 ${radiusClass}`}>الملف المحدد: {paymentFile.name}</div> : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className={radiusClass} onClick={() => setShowPaymentDialog(false)} disabled={paymentLoading}>إلغاء</Button>
            <Button onClick={handlePaymentSubmit} disabled={paymentLoading || !paymentFile} className={`bg-blue-600 hover:bg-blue-700 ${radiusClass}`}>
              {paymentLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "تأكيد واستمرار"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showViewPaymentDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowViewPaymentDialog(false)
            setSelectedBooking(null)
          }
        }}
      >
        <DialogContent dir="rtl" className={`sm:max-w-[425px] border-slate-200 p-6 ${radiusClass}`}>
          <DialogHeader>
            <DialogTitle className="text-right">تفاصيل الدفع</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
            {selectedBooking && selectedBooking.payments && selectedBooking.payments.length > 0 ? (
              selectedBooking.payments.map((payment: any, index: number) => (
                <div key={payment.id} className={`space-y-2 border p-4 text-sm ${radiusClass} ${index === 0 ? "border-blue-200 bg-blue-50 shadow-sm" : "bg-slate-50"}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">المبلغ:</span>
                      {index === 0 ? <Badge variant="default" className={`h-5 bg-blue-600 px-1.5 text-[10px] ${radiusClass}`}>الأحدث</Badge> : <Badge variant="outline" className={`h-5 px-1.5 text-[10px] ${radiusClass}`}>سابق</Badge>}
                    </div>
                    <span className="text-lg font-bold">{payment.amount} {payment.currency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">الحالة:</span>
                    <Badge variant={payment.status === "APPROVED" ? "default" : payment.status === "REJECTED" ? "destructive" : "secondary"} className={radiusClass}>
                      {payment.status === "APPROVED" ? "مقبول" : payment.status === "REJECTED" ? "مرفوض" : "قيد المراجعة"}
                    </Badge>
                  </div>
                  {payment.notes ? (
                    <div className="mt-2 border-t pt-2 text-gray-600">
                      <span className="mb-1 block font-medium text-gray-700">الملاحظات:</span>
                      {payment.notes}
                    </div>
                  ) : null}
                  {payment.depositSlipImage ? (
                    <div className="mt-2 border-t pt-2">
                      <span className="mb-2 block font-medium text-gray-700">صورة الإيصال:</span>
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}${payment.depositSlipImage}`}
                        alt="Deposit Slip"
                        className={`h-auto max-w-full border ${radiusClass}`}
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = "none"
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">لا توجد تفاصيل دفع متاحة</div>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" className={radiusClass} onClick={() => setShowViewPaymentDialog(false)}>إغلاق</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatsCard({
  title,
  value,
  icon,
  iconBg,
  radiusClass,
}: {
  title: string
  value: number
  icon: React.ReactNode
  iconBg: string
  radiusClass: string
}) {
  return (
    <Card className={`border-slate-200 bg-white shadow-sm ${radiusClass}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="text-right">
            <p className="mb-1 text-xs font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
          </div>
          <div className={`flex h-9 w-9 items-center justify-center ${iconBg} ${radiusClass}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

