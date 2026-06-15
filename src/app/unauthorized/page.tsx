import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShieldAlert } from "lucide-react"

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-600">
        <ShieldAlert className="w-10 h-10" />
      </div>
      
      <h1 className="text-3xl font-bold text-gray-900 mb-2">غير مصرح لك بالوصول</h1>
      <p className="text-gray-600 max-w-md mb-8">
        عذراً، لا تملك الصلاحيات اللازمة للوصول إلى هذه الصفحة. يرجى التأكد من تسجيل الدخول بالحساب الصحيح.
      </p>

      <div className="flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/">
            الصفحة الرئيسية
          </Link>
        </Button>
        <Button asChild>
          <Link href="/auth/login">
            تسجيل الدخول
          </Link>
        </Button>
      </div>
    </div>
  )
}
