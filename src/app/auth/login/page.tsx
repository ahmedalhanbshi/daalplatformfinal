"use client"

import { useState, useEffect, Suspense } from "react"
export const dynamic = "force-dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react"

function sanitizeLoginErrorMessage(message?: string): string {
  const fallback = "حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقًا"
  if (!message) return fallback

  const lowered = message.toLowerCase()
  if (
    lowered.includes("prisma") ||
    lowered.includes("findunique") ||
    lowered.includes("database server") ||
    lowered.includes("can't reach database server")
  ) {
    return fallback
  }

  return message
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, user, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)

  // Check if user just registered
  const registered = searchParams.get("registered")
  useEffect(() => {
    if (registered === "true") {
      setSuccessMessage("تم إنشاء حسابك بنجاح! يرجى تسجيل الدخول")
    }
  }, [registered])

  // Role-based redirection after successful login
  useEffect(() => {
    if (user && !authLoading) {
      const redirectTarget = searchParams.get("redirect")
      const isSafeInternalRedirect =
        typeof redirectTarget === "string" &&
        redirectTarget.startsWith("/") &&
        !redirectTarget.startsWith("//")

      if (isSafeInternalRedirect) {
        router.push(redirectTarget)
        return
      }

      // Redirect based on user role from backend
      switch (user.role) {
        case "STUDENT":
          router.push("/student/dashboard")
          break
        case "TRAINER":
          router.push("/trainer/dashboard")
          break
        case "INSTITUTE_ADMIN":
          router.push("/institute/dashboard")
          break
        case "PLATFORM_ADMIN":
          router.push("/admin/dashboard")
          break
        default:
          router.push("/")
      }
    }
  }, [user, authLoading, router, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      await login(formData.email, formData.password)
      // Redirect will be handled by useEffect when user state updates
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message?: string }).message === "string"
          ? (err as { message?: string }).message
          : undefined
      setError(sanitizeLoginErrorMessage(message))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="h-[calc(100vh-72px)] overflow-hidden bg-slate-50 px-4"
      dir="rtl"
      style={{ backgroundImage: "radial-gradient(circle at top, rgba(37,99,235,0.08), transparent 45%)" }}
    >
      <div className="flex h-full items-center justify-center -translate-y-2">
        <Card className="mx-auto w-[calc(100%-32px)] max-w-[500px] rounded-[6.5px] border border-[#e2e8f0] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <CardHeader className="px-5 pb-4 pt-6 text-right md:px-8 md:pt-8">
          <CardTitle className="text-3xl font-extrabold text-slate-900">تسجيل الدخول</CardTitle>
          <CardDescription className="pt-1 text-sm text-slate-500">أدخل بيانات حسابك للمتابعة</CardDescription>
        </CardHeader>

        <CardContent className="px-5 pb-6 md:px-8 md:pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {successMessage && (
              <Alert className="border-green-200 bg-green-50 text-green-900">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2 text-right">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                البريد الإلكتروني
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                dir="rtl"
                className="h-11 rounded-[6.5px] border-slate-300 text-right placeholder:text-right focus-visible:ring-2 focus-visible:ring-[#2563eb]/40 focus-visible:ring-offset-0"
                required
              />
            </div>

            <div className="space-y-2 text-right">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  كلمة المرور
                </Label>
                <Link href="/auth/forgot-password" className="text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] hover:underline">
                  نسيت كلمة المرور؟
                </Link>
              </div>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  dir="rtl"
                  className="h-11 rounded-[6.5px] border-slate-300 pl-11 text-right placeholder:text-right focus-visible:ring-2 focus-visible:ring-[#2563eb]/40 focus-visible:ring-offset-0"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label="إظهار أو إخفاء كلمة المرور"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="h-[46px] w-full rounded-[6.5px] bg-[#2563eb] text-base font-semibold text-white hover:bg-[#1d4ed8]" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                "دخول"
              )}
            </Button>
          </form>

        </CardContent>

        <CardFooter className="flex justify-center px-5 pb-7 pt-0 text-center md:px-8">
          <p className="text-sm text-slate-500">
            ليس لديك حساب؟{" "}
            <Link href="/auth/register" className="font-semibold text-[#2563eb] hover:text-[#1d4ed8] hover:underline">
              إنشاء حساب جديد
            </Link>
          </p>
        </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}
