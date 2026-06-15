"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useState, Suspense } from "react"
export const dynamic = "force-dynamic"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Lock, CheckCircle, Loader2 } from "lucide-react"
import { authService } from "@/lib/auth-service"
import { toast } from "sonner"

function ResetPasswordPageContent() {
  const searchParams = useSearchParams()
  const urlCode = searchParams.get('code') || ""
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [step, setStep] = useState<'verify' | 'success'>('verify')
  const [code, setCode] = useState(urlCode)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const finalCode = code || urlCode
    if (!finalCode || finalCode.length < 4) {
      toast.error("خطأ", {
        description: "يرجى إدخال رمز التحقق بشكل صحيح"
      })
      return
    }

    if (password !== confirmPassword) {
      toast.error("خطأ", {
        description: "كلمات المرور غير متطابقة"
      })
      return
    }

    if (password.length < 8) {
      toast.error("خطأ", {
        description: "يجب أن تكون كلمة المرور 8 أحرف على الأقل"
      })
      return
    }

    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      toast.error("خطأ", {
        description: "يجب أن تحتوي كلمة المرور على حرف كبير، حرف صغير، ورقم واحد على الأقل"
      })
      return
    }

    setLoading(true)
    try {
      await authService.resetPassword(code, password)
      setStep('success')
    } catch (error: any) {
      toast.error("فش�„ إعادة التعيين", {
        description: error.response?.data?.message || "الرمز غير صحيح أو منتهي الصلاحية"
      })
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">تم إعادة تعيين كلمة المرور</CardTitle>
            <CardDescription>
              تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" asChild>
              <Link href="/auth/login">
                تسجيل الدخول
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">إعادة تعيين كلمة المرور</CardTitle>
          <CardDescription>
            أدخل رمز التحقق المرسل إلى بريدك الإلكتروني ورقم �‡اتف�ƒ وكلمة المرور الجديدة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {!urlCode && (
              <div className="space-y-2 text-right">
                <Label htmlFor="code">رمز التحقق</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="أدخل رمز التحقق"
                  className="text-center text-lg tracking-widest"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  dir="ltr"
                  required
                />
              </div>
            )}

            <div className="space-y-2 text-right">
              <Label htmlFor="password">كلمة المرور الجديدة</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="أدخل كلمة المرور الجديدة"
                  className="pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2 text-right">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="أعد إدخال كلمة المرور"
                  className="pr-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  dir="ltr"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري إعادة التعيين...
                </>
              ) : (
                "إعادة تعيين كلمة المرور"
              )}
            </Button>
          </form>

          <div className="text-center text-sm mt-4">
            لم تستلم الرمز؟{" "}
            <Link href="/auth/forgot-password" className="text-primary hover:underline">
              إعادة إرسال الرمز
            </Link>
          </div>

          <div className="text-center text-sm">
            تذكرت كلمة المرور؟{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              تسجيل الدخول
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>}>
      <ResetPasswordPageContent />
    </Suspense>
  )
}

