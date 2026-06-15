"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Loader2, X } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatNumber } from "@/lib/utils"

type RejectActionType = "payment" | "enrollment"

type RejectionActionModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  actionType: RejectActionType
  studentName: string
  courseName: string
  amount?: number
  paymentStatus?: string
  requestDate?: string
  currentStatusLabel?: string
  requireReason?: boolean
  onConfirm: (reason: string) => Promise<void>
}

function paymentBadge(status?: string) {
  const s = String(status || "").toUpperCase()
  if (s === "APPROVED") return <Badge className="rounded-[6.5px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">مؤكد</Badge>
  if (s === "PENDING_REVIEW") return <Badge className="rounded-[6.5px] bg-amber-100 text-amber-700 hover:bg-amber-100">بانتظار الاعتماد</Badge>
  if (s === "REJECTED") return <Badge className="rounded-[6.5px] bg-rose-100 text-rose-700 hover:bg-rose-100">مرفوض</Badge>
  return <Badge className="rounded-[6.5px] bg-blue-100 text-blue-700 hover:bg-blue-100">بانتظار الدفع</Badge>
}

export function RejectionActionModal({
  open,
  onOpenChange,
  actionType,
  studentName,
  courseName,
  amount,
  paymentStatus,
  requestDate,
  currentStatusLabel,
  requireReason = false,
  onConfirm,
}: RejectionActionModalProps) {
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setReason("")
      setError("")
      setSubmitting(false)
    }
  }, [open])

  const title = actionType === "payment" ? "رفض سند الدفع" : "رفض طلب التسجيل"
  const description =
    actionType === "payment"
      ? "سيبقى تسجيل الطالب قائمًا، وسيتم إشعاره بسبب الرفض ليتمكن من رفع سند جديد."
      : "سيتم رفض طلب التسجيل الحالي وإشعار الطالب بسبب الرفض. يمكن للطالب تعديل بياناته ثم إرسال طلب تسجيل جديد."

  const alreadyRejected = actionType === "payment" && String(paymentStatus || "").toUpperCase() === "REJECTED"

  const submit = async () => {
    if (requireReason && !reason.trim()) {
      setError("يرجى كتابة سبب الرفض حتى يتمكن الطالب من معرفة المشكلة.")
      return
    }

    try {
      setSubmitting(true)
      setError("")
      await onConfirm(reason.trim())
      onOpenChange(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "تعذر تنفيذ عملية الرفض")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        overlayClassName="bg-black/60"
        className="w-[95vw] rounded-[6.5px] border border-slate-200 bg-white p-5 text-right sm:max-w-[560px] [&>button[data-dialog-close='default']]:hidden"
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute left-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-[6.5px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="إغلاق"
          disabled={submitting}
        >
          <X className="h-4 w-4" />
        </button>

        <DialogHeader className="text-right">
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">{title}</DialogTitle>
          <DialogDescription className="text-right text-slate-600">{description}</DialogDescription>
        </DialogHeader>

        <div className="rounded-[6.5px] border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <p><span className="text-slate-500">اسم الطالب:</span> {studentName || "-"}</p>
            <p><span className="text-slate-500">اسم الدورة:</span> {courseName || "-"}</p>
            {actionType === "payment" ? (
              <>
                <p><span className="text-slate-500">المبلغ:</span> {formatNumber(Number(amount || 0))} ر.ي</p>
                <div className="inline-flex items-center gap-2">
                  <span className="text-slate-500">حالة الدفع:</span>
                  {paymentBadge(paymentStatus)}
                </div>
              </>
            ) : (
              <>
                <p><span className="text-slate-500">تاريخ الطلب:</span> {requestDate || "-"}</p>
                <p><span className="text-slate-500">الحالة الحالية:</span> {currentStatusLabel || "-"}</p>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-900">سبب الرفض</label>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={
              actionType === "enrollment"
                ? "مثال: رقم الجوال غير صحيح، البريد الإلكتروني غير واضح، أو بيانات الطالب غير مكتملة"
                : "مثال: السند غير واضح، المبلغ غير مطابق، أو بيانات التحويل ناقصة"
            }
            className="min-h-[110px] w-full rounded-[6.5px] border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-blue-400"
            disabled={submitting}
          />
          {alreadyRejected ? (
            <p className="rounded-[6.5px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              هذا السند مرفوض بالفعل. اطلب من الطالب إعادة رفع سند جديد بدل إعادة رفضه.
            </p>
          ) : null}
          {error ? (
            <p className="rounded-[6.5px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-start">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="h-10 w-full rounded-[6.5px] border-slate-200 sm:w-auto"
          >
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={submitting || alreadyRejected}
            className="h-10 w-full rounded-[6.5px] bg-rose-600 text-white hover:bg-rose-700 sm:w-auto"
          >
            {submitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
            {submitting ? (actionType === "enrollment" ? "جاري رفض الطلب..." : "جاري الرفض...") : "تأكيد الرفض"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
