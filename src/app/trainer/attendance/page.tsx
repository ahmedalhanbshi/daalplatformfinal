import Link from "next/link"
import { CalendarDays, Clock3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TrainerAttendancePage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-5xl items-center justify-center px-4 py-10" dir="rtl">
      <Card className="w-full max-w-2xl rounded-[6.5px] border-slate-200 shadow-sm">
        <CardHeader className="text-right">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <CalendarDays className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">سجل الحضور</CardTitle>
          <CardDescription className="text-slate-600">
            هذه الصفحة قيد التجهيز حالياً، وسيتم تفعيل إدارة الحضور لاحقاً ضمن نفس الثيم والهيكل.
          </CardDescription>
        </CardHeader>

        <CardContent className="text-right">
          <div className="rounded-[6.5px] border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-slate-500" />
              <span>لا توجد إجراءات حالياً في هذا المسار.</span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button variant="outline" asChild className="rounded-[6.5px]">
              <Link href="/trainer/dashboard">العودة للوحة التحكم</Link>
            </Button>
            <Button asChild className="rounded-[6.5px]">
              <Link href="/trainer/courses">الانتقال إلى الدورات</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
