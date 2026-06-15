"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, ArrowRight, Loader2, KeyRound } from "lucide-react"
import { authService } from "@/lib/auth-service"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !email.includes('@')) {
      toast.error("خطأ", {
        description: "يرجى إدخال بريد إلكتروني صحيح"
      })
      return
    }

    setLoading(true)
    try {
      await authService.forgotPassword(email)
      setStep('verify')
      toast.success("تم إرسال رمز التحقق", {
        description: "يرجى التحقق من بريدك الإلكتروني"
      })
    } catch (error: any) {
      toast.error("حدث خطأ", {
        description: error.response?.data?.message || "فش�„ إرسال رمز التحقق. يرجى المحاولة لاحقاً."
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!code || code.length < 4) {
      toast.error("خطأ", {
        description: "يرجى إدخال رمز التحقق بشكل صحيح"
      })
      return
    }

    setLoading(true)
    try {
      await authService.verifyResetCode(code)
      // Redirect to reset password page with the code
      router.push(`/auth/reset-password?code=${code}`)
    } catch (error: any) {
      toast.error("فش�„ التحقق", {
        description: error.response?.data?.message || "رمز التحقق غير صحيح أو منتهي الصلاحية"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {step === 'request' ? 'نسيت كلمة المرور؟' : 'تأكيد الرمز'}
          </CardTitle>
          <CardDescription>
            {step === 'request' 
              ? 'أدخل بريدك الإلكتروني وسنرسل لك رمز إعادة التعيين' 
              : 'أدخل رمز التحقق المكون من 6 أرقام المرسل إلى بريدك الإلكتروني'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 'request' ? (
            <form onSubmit={handleSubmitEmail}>
              <div className="space-y-4">
                <div className="space-y-2 text-right">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="أدخل بريدك الإلكتروني"
                      className="pr-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      dir="ltr"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100 mt-6 text-right">
                <Button
                  className="w-full"
                  size="lg"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      إرسال رمز إعادة التعيين
                      <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                    </>
                  )}
                </Button>

                <div className="text-center text-sm text-gray-600">
                  تذكرت كلمة المرور؟{" "}
                  <Link href="/auth/login" className="text-primary font-bold hover:underline">
                    تسجيل الدخول
                  </Link>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode}>
              <div className="space-y-4">
                <div className="space-y-2 text-right">
                  <Label htmlFor="code">رمز التحقق</Label>
                  <div className="relative">
                    <KeyRound className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="code"
                      type="text"
                      placeholder="أدخل الرمز (6 أرقام)"
                      className="pr-10 text-center text-lg tracking-widest font-bold"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      dir="ltr"
                      required
                      maxLength={6}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100 mt-6 text-right">
                <Button
                  className="w-full"
                  size="lg"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      جاري التحقق...
                    </>
                  ) : (
                    <>
                      تحقق واستمرار
                      <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                    </>
                  )}
                </Button>

                <div className="text-center text-sm text-gray-600">
                  لم يصلك الرمز؟{" "}
                  <button 
                    type="button" 
                    onClick={() => setStep('request')} 
                    className="text-primary font-bold hover:underline"
                  >
                    أعد المحاولة
                  </button>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
