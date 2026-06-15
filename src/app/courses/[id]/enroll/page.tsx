"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Stepper } from "@/components/ui/stepper"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, CreditCard, AlertCircle, ArrowRight, ArrowLeft } from "lucide-react"
import { Course } from "@/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDate, getFileUrl } from "@/lib/utils"

// Mock course data
const mockCourse: Course = {
  id: "1",
  title: "تعلم React من الصفر",
  description: "دورة شاملة في تعلم React.js مع مشاريع عملية",
  shortDescription: "تعلم React من الصفر مع مشاريع عملية",
  trainerId: "1",
  trainer: {
    id: "1",
    name: "أحمد محمد",
    email: "ahmed@example.com",
    role: 'TRAINER' as const,
    status: 'active',
    avatar: "",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  price: 29900,
  duration: 40,
  startDate: new Date("2025-02-01"),
  endDate: new Date("2025-03-15"),
  maxStudents: 50,
  enrolledStudents: 23,
  rating: 4.8,
  reviewCount: 156,
  status: 'active',
  deliveryType: "online",
  category: "تطوير الويب",
  tags: ["React", "JavaScript", "Frontend"],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
}

// Mock user data
const mockUser = {
  id: "1",
  name: "أحمد محمد",
  email: "ahmed@example.com",
  phone: "+966501234567",
  role: 'student' as const,
}

const enrollmentSteps = ["مراجعة الطلب", "طريقة الدفع", "التأكيد"]

type EnrollmentStep = 0 | 1 | 2

export default function EnrollmentPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  const [currentStep, setCurrentStep] = useState<EnrollmentStep>(0)
  const [paymentMethod, setPaymentMethod] = useState<'card'>('card')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [transactionId, setTransactionId] = useState<string>('')

  const course = mockCourse // In real app, fetch based on courseId

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep((currentStep + 1) as EnrollmentStep)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((currentStep - 1) as EnrollmentStep)
    }
  }

  const handlePayment = async () => {
    setIsProcessing(true)

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Mock success/failure
    const success = Math.random() > 0.1 // 90% success rate
    setIsProcessing(false)

    if (success) {
      setIsSuccess(true)
      setTransactionId(`TXN${Date.now()}`)
      setCurrentStep(2)
    } else {
      // Handle failure - could show error state
      alert('فشل في معالجة الدفع. يرجى المحاولة مرة أخرى.')
    }
  }

  const canProceedToPayment = () => {
    return true // Assume card payment is always valid
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card>
            <CardHeader>
              <CardTitle>مراجعة الطلب</CardTitle>
              <CardDescription>تأكد من صحة البيانات قبل المتابعة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Course Summary */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">تفاصيل الدورة</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">اسم الدورة:</span>
                    <span className="font-medium">{course.title}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">المدرب:</span>
                    <div className="flex items-center flex-row-reverse gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={course.trainer.avatar ? getFileUrl(course.trainer.avatar) : undefined} />
                        <AvatarFallback>{course.trainer.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{course.trainer.name}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">المدة:</span>
                    <span>{course.duration} ساعة</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">تاريخ البداية:</span>
                    <span>{formatDate(course.startDate)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">السعر:</span>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {new Intl.NumberFormat('en-US').format(course.price)} ريال يمني
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Student Information */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">بيانات الطالب</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">الاسم:</span>
                    <span>{mockUser.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">البريد الإلكتروني:</span>
                    <span>{mockUser.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">رقم الهاتف:</span>
                    <span>{mockUser.phone}</span>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  بالضغط على &ldquo;التالي&rdquo;، أنت توافق على{" "}
                  <Link href="/terms" className="text-primary hover:underline">
                    شروط الخدمة
                  </Link>{" "}
                  وسياسة الإلغاء والاسترداد.
                </p>
              </div>
            </CardContent>
          </Card>
        )

      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>طريقة الدفع</CardTitle>
              <CardDescription>اختر طريقة الدفع المناسبة لك</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={paymentMethod}
                onValueChange={(value: 'card') => setPaymentMethod(value)}
              >


                {/* Card Payment */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center gap-3 cursor-pointer flex-1">
                      <CreditCard className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <div className="font-medium">بطاقة الائتمان/الخصم</div>
                        <div className="text-sm text-gray-600">
                          آمن وسريع من خلال بوابة الدفع
                        </div>
                      </div>
                    </Label>
                  </div>
                  {paymentMethod === 'card' && (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="card-number">رقم البطاقة</Label>
                          <Input
                            id="card-number"
                            placeholder="1234 5678 9012 3456"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="expiry">تاريخ الانتهاء</Label>
                          <Input
                            id="expiry"
                            placeholder="MM/YY"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cvv">CVV</Label>
                          <Input
                            id="cvv"
                            placeholder="123"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="name">اسم صاحب البطاقة</Label>
                          <Input
                            id="name"
                            placeholder="الاسم الكامل"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </RadioGroup>

              {/* Order Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">ملخص الطلب</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>سعر الدورة:</span>
                    <span>{new Intl.NumberFormat('en-US').format(course.price)} ريال يمني</span>
                  </div>
                  <div className="flex justify-between">
                    <span>رسوم المعالجة:</span>
                    <span>0 ريال يمني</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>المجموع:</span>
                    <span>{new Intl.NumberFormat('en-US').format(course.price)} ريال يمني</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 2:
        return (
          <Card>
            <CardHeader className="text-center">
              {isSuccess ? (
                <>
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <CardTitle className="text-green-700">تم التسجيل بنجاح!</CardTitle>
                  <CardDescription>
                    تم تسجيلك في الدورة ومعالجة الدفع بنجاح
                  </CardDescription>
                </>
              ) : (
                <>
                  <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <CardTitle className="text-red-700">فشل في المعالجة</CardTitle>
                  <CardDescription>
                    حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى
                  </CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {isSuccess && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">رقم العملية:</p>
                  <p className="font-mono text-lg font-semibold">{transactionId}</p>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                {isSuccess ? (
                  <>
                    <Button asChild>
                      <Link href={`/student/courses/${courseId}`}>
                        عرض الدورة
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/student/my-courses">
                        الانتقال إلى دوراتي
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => setCurrentStep(1)}>
                      إعادة المحاولة
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/courses/${courseId}`}>
                        العودة للدورة
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            التسجيل في الدورة
          </h1>
          <p className="text-gray-600">
            {course.title}
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <Stepper steps={enrollmentSteps} currentStep={currentStep} />
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        {currentStep < 2 && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              السابق
            </Button>

            <Button
              onClick={currentStep === 1 ? handlePayment : handleNext}
              disabled={currentStep === 1 && !canProceedToPayment()}
            >
              {currentStep === 1 ? (
                isProcessing ? (
                  "جاري المعالجة..."
                ) : (
                  "إتمام الدفع"
                )
              ) : (
                <>
                  التالي
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
