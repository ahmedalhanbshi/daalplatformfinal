"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FieldErrors, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Mail, Lock, Phone, User, Building, FileText, Briefcase, GraduationCap, MapPin, BadgeCheck, FileBadge, AlertCircle, Loader2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { UserRole } from "@/types"
import { useAuth } from "@/contexts/auth-context"

const PASSWORD_MESSAGE = "كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم"
const REQUIRED_MESSAGE = "هذا الحقل مطلوب"

const registerSchema = z
  .object({
    name: z.string().trim().min(1, REQUIRED_MESSAGE),
    email: z
      .string()
      .trim()
      .min(1, REQUIRED_MESSAGE)
      .email("البريد الإلكتروني غير صالح"),
    phone: z
      .string()
      .trim()
      .min(8, "رقم الهاتف يجب أن يتكون من 8 أرقام على الأقل")
      .max(15, "رقم الهاتف يجب أن لا يتجاوز 15 رقماً")
      .regex(/^\+?[0-9]+$/, "يجب أن يحتوي رقم الهاتف على أرقام فقط"),
    role: z.string().min(1, REQUIRED_MESSAGE),
    license: z.string().trim().optional(),
    proof: z.string().optional(),
    address: z.string().trim().optional(),
    password: z
      .string()
      .min(1, REQUIRED_MESSAGE)
      .refine((v) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(v), PASSWORD_MESSAGE),
    confirmPassword: z.string().min(1, REQUIRED_MESSAGE),
    acceptTerms: z.boolean().refine((v) => v === true, REQUIRED_MESSAGE),
  })
  .superRefine((data, ctx) => {
    if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "كلمتا المرور غير متطابقتين",
      })
    }

    if (data.role === "INSTITUTE_ADMIN") {
      if (!data.license?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["license"], message: REQUIRED_MESSAGE })
      }
      if (!data.address?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["address"], message: REQUIRED_MESSAGE })
      }
    }
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const curveClass = "rounded-[6.5px]"
  const router = useRouter()
  const { register: registerUser, isLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")

  const [cvFile, setCvFile] = useState<File | null>(null)
  const [certificatesFiles, setCertificatesFiles] = useState<File[]>([])
  const [licenseDocumentFile, setLicenseDocumentFile] = useState<File | null>(null)

  const requiredLabelClass = "after:content-['*'] after:mr-1 after:text-red-500"
  const invalidLabelClass = "text-red-600"
  const normalLabelClass = "text-slate-900 text-right block"
  const normalInputClass = "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
  const invalidFieldClass = "border-red-500 focus:border-red-500 focus:ring-red-100 focus-visible:ring-red-100"
  const errorTextClass = "mt-1 text-xs text-red-600 text-right"

  const roleRef = useRef<HTMLButtonElement>(null)
  const proofButtonRef = useRef<HTMLButtonElement>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError: setFieldError,
    clearErrors,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "",
      license: "",
      proof: "",
      address: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
    shouldFocusError: true,
  })

  const role = watch("role") as UserRole | ""

  const onInvalid = (formErrors: FieldErrors<RegisterFormValues>) => {
    const instituteSpecificFields: (keyof RegisterFormValues)[] =
      role === "INSTITUTE_ADMIN" ? ["license", "proof", "address"] : []

    const order: (keyof RegisterFormValues)[] = [
      "name",
      "email",
      "phone",
      "role",
      ...instituteSpecificFields,
      "password",
      "confirmPassword",
      "acceptTerms",
    ]

    const firstInvalid = order.find((key) => formErrors[key])
    if (!firstInvalid) return

    if (firstInvalid === "role") {
      roleRef.current?.focus()
      roleRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }

    if (firstInvalid === "proof") {
      proofButtonRef.current?.focus()
      proofButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }

    if (firstInvalid === "acceptTerms") {
      const termsEl = document.getElementById("terms")
      termsEl?.focus()
      termsEl?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }

    const el = document.getElementById(firstInvalid)
    if (el instanceof HTMLElement) {
      el.focus()
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  const onValid = async (data: RegisterFormValues) => {
    setError("")

    if (data.role === "INSTITUTE_ADMIN" && !licenseDocumentFile) {
      setFieldError("proof", { type: "manual", message: REQUIRED_MESSAGE })
      proofButtonRef.current?.focus()
      proofButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }

    try {
      const submitData = new FormData()
      submitData.append("name", data.name)
      submitData.append("email", data.email)
      submitData.append("password", data.password)
      submitData.append("phone", data.phone)
      submitData.append("role", data.role)

      if (data.role === "TRAINER") {
        if (cvFile) submitData.append("cv", cvFile)
        certificatesFiles.forEach((file) => submitData.append("certificates", file))
      } else if (data.role === "INSTITUTE_ADMIN") {
        if (licenseDocumentFile) submitData.append("licenseDocument", licenseDocumentFile)
      }

      const success = await registerUser(submitData)
      if (success) {
        router.push("/auth/login?registered=true")
      } else {
        setError("فشل إنشاء الحساب. الرجاء المحاولة مرة أخرى")
      }
    } catch (err: unknown) {
      const serverMessage =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setError(serverMessage || "حدث خطأ أثناء التسجيل")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className={`w-full max-w-md ${curveClass}`}>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
          <CardDescription>انضم إلى منصة حجز الدورات</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className={`${normalLabelClass} ${requiredLabelClass} ${errors.name ? invalidLabelClass : ""}`}>
                {role === "INSTITUTE_ADMIN" ? "اسم المعهد/المؤسسة" : "الاسم الكامل"}
              </Label>
              <div className="relative">
                {role === "INSTITUTE_ADMIN" ? <Building className="absolute right-3 top-3 h-4 w-4 text-gray-400" /> : <User className="absolute right-3 top-3 h-4 w-4 text-gray-400" />}
                <Input
                  id="name"
                  type="text"
                  placeholder={role === "INSTITUTE_ADMIN" ? "أدخل اسم المعهد" : "أدخل اسمك الكامل"}
                  className={`pr-10 ${curveClass} ${normalInputClass} ${errors.name ? invalidFieldClass : ""}`}
                  {...register("name")}
                />
              </div>
              {errors.name && <p className={errorTextClass}>{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className={`${normalLabelClass} ${requiredLabelClass} ${errors.email ? invalidLabelClass : ""}`}>البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="أدخل بريدك الإلكتروني"
                  className={`pr-10 ${curveClass} ${normalInputClass} ${errors.email ? invalidFieldClass : ""}`}
                  {...register("email")}
                />
              </div>
              {errors.email && <p className={errorTextClass}>{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className={`${normalLabelClass} ${requiredLabelClass} ${errors.phone ? invalidLabelClass : ""}`}>رقم الهاتف</Label>
              <div className="relative">
                <Phone className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  id="phone" 
                  type="tel" 
                  dir="ltr"
                  placeholder="أدخل رقم هاتفك" 
                  className={`pr-10 text-right ${curveClass} ${normalInputClass} ${errors.phone ? invalidFieldClass : ""}`} 
                  {...register("phone", {
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/[^\d+]/g, '')
                    }
                  })} 
                />
              </div>
              {errors.phone && <p className={errorTextClass}>{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className={`${normalLabelClass} ${requiredLabelClass} ${errors.role ? invalidLabelClass : ""}`}>نوع الحساب</Label>
              <Select
                value={role}
                onValueChange={(value) => {
                  setValue("role", value, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
                  if (value) clearErrors("role")
                  if (value !== "INSTITUTE_ADMIN") {
                    clearErrors(["license", "address", "proof"])
                    setValue("license", "")
                    setValue("address", "")
                  }
                }}
              >
                <SelectTrigger ref={roleRef} className={`${curveClass} ${normalInputClass} ${errors.role ? invalidFieldClass : ""}`}>
                  <SelectValue placeholder="اختر نوع الحساب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">طالب</SelectItem>
                  <SelectItem value="TRAINER">مدرب</SelectItem>
                  <SelectItem value="INSTITUTE_ADMIN">معهد</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && <p className={errorTextClass}>{errors.role.message}</p>}
            </div>

            {role === "TRAINER" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 border-r-2 border-primary/20 pr-4 my-4">
                <div className="space-y-2">
                  <Label htmlFor="specialization">التخصص</Label>
                  <div className="relative">
                    <Briefcase className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="specialization" placeholder="مثال: تطوير الويب، إدارة أعمال..." className={`pr-10 ${curveClass}`} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">نبذة عن المدرب</Label>
                  <Textarea id="bio" placeholder="تحدث باختصار عن خبراتك ومهاراتك..." className={`min-h-[100px] ${curveClass}`} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cv">السيرة الذاتية (CV)</Label>
                  <div className={`border-2 border-dashed ${curveClass} p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors`}>
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-600">ارفع ملف السيرة الذاتية (PDF)</span>
                      {cvFile && <span className="text-sm text-primary font-medium">{cvFile.name}</span>}
                      <Input id="cv" type="file" accept=".pdf" className="hidden" onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
                      <Button type="button" variant="secondary" size="sm" onClick={() => document.getElementById("cv")?.click()}>اختر ملف</Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certificates">الشهادات</Label>
                  <div className={`border-2 border-dashed ${curveClass} p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors`}>
                    <div className="flex flex-col items-center gap-2">
                      <GraduationCap className="h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-600">ارفع صور الشهادات (يمكن اختيار أكثر من ملف)</span>
                      {certificatesFiles.length > 0 && <span className="text-sm text-primary font-medium">{certificatesFiles.length} ملف محدد</span>}
                      <Input id="certificates" type="file" multiple accept="image/*,.pdf" className="hidden" onChange={(e) => setCertificatesFiles(Array.from(e.target.files || []))} />
                      <Button type="button" variant="secondary" size="sm" onClick={() => document.getElementById("certificates")?.click()}>اختر ملفات</Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {role === "INSTITUTE_ADMIN" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 border-r-2 border-primary/20 pr-4 my-4">
                <div className="space-y-2">
                  <Label htmlFor="license" className={`${normalLabelClass} ${requiredLabelClass} ${errors.license ? invalidLabelClass : ""}`}>رقم السجل التجاري / الترخيص</Label>
                  <div className="relative">
                    <FileBadge className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="license" placeholder="أدخل رقم السجل التجاري" className={`pr-10 ${curveClass} ${normalInputClass} ${errors.license ? invalidFieldClass : ""}`} {...register("license")} />
                  </div>
                  {errors.license && <p className={errorTextClass}>{errors.license.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proof" className={`${normalLabelClass} ${requiredLabelClass} ${errors.proof ? invalidLabelClass : ""}`}>إثبات الكيان</Label>
                  <div className={`border-2 border-dashed ${curveClass} p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors ${errors.proof ? "border-red-500" : "border-slate-200"}`}>
                    <div className="flex flex-col items-center gap-2">
                      <BadgeCheck className="h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-600">صورة السجل أو الترخيص (إجباري)</span>
                      {licenseDocumentFile && <span className="text-sm text-primary font-medium">{licenseDocumentFile.name}</span>}
                      <Input
                        id="proof"
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          setLicenseDocumentFile(e.target.files?.[0] || null)
                          if (e.target.files?.[0]) clearErrors("proof")
                        }}
                      />
                      <Button ref={proofButtonRef} type="button" variant="secondary" size="sm" onClick={() => document.getElementById("proof")?.click()}>اختر ملف</Button>
                    </div>
                  </div>
                  {errors.proof && <p className={errorTextClass}>{errors.proof.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className={`${normalLabelClass} ${requiredLabelClass} ${errors.address ? invalidLabelClass : ""}`}>العنوان</Label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="address" placeholder="المدينة، الحي، الشارع" className={`pr-10 ${curveClass} ${normalInputClass} ${errors.address ? invalidFieldClass : ""}`} {...register("address")} />
                  </div>
                  {errors.address && <p className={errorTextClass}>{errors.address.message}</p>}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className={`${normalLabelClass} ${requiredLabelClass} ${errors.password ? invalidLabelClass : ""}`}>كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="أدخل كلمة مرور قوية"
                  className={`pr-10 ${curveClass} ${normalInputClass} ${errors.password ? invalidFieldClass : ""}`}
                  {...register("password")}
                />
                <Button type="button" variant="ghost" size="sm" className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                </Button>
              </div>
              {errors.password ? (
                <p className={errorTextClass}>{errors.password.message}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1 text-right">{PASSWORD_MESSAGE}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className={`${normalLabelClass} ${requiredLabelClass} ${errors.confirmPassword ? invalidLabelClass : ""}`}>تأكيد كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="أعد إدخال كلمة المرور"
                  className={`pr-10 ${curveClass} ${normalInputClass} ${errors.confirmPassword ? invalidFieldClass : ""}`}
                  {...register("confirmPassword")}
                />
                <Button type="button" variant="ghost" size="sm" className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                </Button>
              </div>
              {errors.confirmPassword && <p className={errorTextClass}>{errors.confirmPassword.message}</p>}
            </div>

            <div className={`flex items-center space-x-2 space-x-reverse rounded-[6.5px] p-2 ${errors.acceptTerms ? "border border-red-500" : ""}`}>
              <Checkbox
                id="terms"
                checked={watch("acceptTerms")}
                onCheckedChange={(checked) => {
                  const accepted = checked === true
                  setValue("acceptTerms", accepted, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
                  if (accepted) clearErrors("acceptTerms")
                }}
              />
              <Label htmlFor="terms" className={`text-sm ${normalLabelClass} ${requiredLabelClass} ${errors.acceptTerms ? invalidLabelClass : ""}`}>
                أوافق على <Link href="/terms" className="text-primary hover:underline">الشروط والأحكام</Link> و <Link href="/privacy" className="text-primary hover:underline">سياسة الخصوصية</Link>
              </Label>
            </div>
            {errors.acceptTerms && <p className={errorTextClass}>{errors.acceptTerms.message}</p>}

            <Button type="submit" className={`w-full ${curveClass}`} size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري إنشاء الحساب...
                </>
              ) : "إنشاء الحساب"}
            </Button>
          </form>

          <div className="text-center text-sm">
            لديك حساب بالفعل؟ <Link href="/auth/login" className="text-primary hover:underline">تسجيل الدخول</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
