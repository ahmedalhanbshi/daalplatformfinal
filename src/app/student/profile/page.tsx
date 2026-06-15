"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User as UserIcon, Mail, Phone, Eye, EyeOff, Loader2, Camera, Edit3, Lock, ShieldCheck, UserCircle2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getFileUrl, isValidEmail, PROFILE_IMAGE_MAX_SIZE_BYTES, PROFILE_IMAGE_MAX_SIZE_MB } from "@/lib/utils"
import { authService } from "@/lib/auth-service"
import { toast } from "sonner"

export default function StudentProfilePage() {
  const { user: authUser, updateUser } = useAuth()
  const [user, setUser] = useState({
    name: "",
    email: "",
    phone: "",
    avatar: "",
  })
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [isChangingPw, setIsChangingPw] = useState(false)
  const [activeTab, setActiveTab] = useState("personal")
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (authUser) {
      setUser({
        name: authUser.name || "",
        email: authUser.email || "",
        phone: authUser.phone || "",
        avatar: authUser.avatar || "",
      })
    }
  }, [authUser])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > PROFILE_IMAGE_MAX_SIZE_BYTES) {
        toast.error(`حجم الصورة يجب ألا يتجاوز ${PROFILE_IMAGE_MAX_SIZE_MB}MB`)
        e.target.value = ""
        return
      }
      setSelectedAvatar(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    if (user.email && !isValidEmail(user.email)) {
      toast.error("صيغة البريد الإلكتروني غير صحيحة")
      return
    }

    try {
      setIsSaving(true)
      const formData = new FormData()
      formData.append("name", user.name)
      formData.append("phone", user.phone)
      formData.append("email", user.email)
      if (selectedAvatar) {
        formData.append("avatar", selectedAvatar)
      }

      const updatedUserData = await authService.updateProfile(formData)
      updateUser(updatedUserData)
      toast.success("تم تحديث الملف الشخصي بنجاح")
      setIsEditing(false)
      setSelectedAvatar(null)
      setAvatarPreview(null)
    } catch (error: any) {
      toast.error("فشل في تحديث الملف الشخصي")
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      toast.error("يرجى ملء جميع الحقول")
      return
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("كلمة المرور الجديدة وتأكيدها غير متطابقين")
      return
    }
    if (pwForm.newPassword.length < 8) {
      toast.error("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل")
      return
    }
    try {
      setIsChangingPw(true)
      await authService.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      toast.success("تم تغيير كلمة المرور بنجاح")
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل في تغيير كلمة المرور")
    } finally {
      setIsChangingPw(false)
    }
  }

  const infoCards = [
    {
      key: "name",
      label: "الاسم الكامل",
      value: user.name || "غير مضاف",
      icon: UserIcon,
      valueClassName: "text-slate-900",
    },
    {
      key: "email",
      label: "البريد الإلكتروني",
      value: user.email || "غير مضاف",
      icon: Mail,
      valueClassName: "text-slate-900 break-all",
    },
    {
      key: "phone",
      label: "رقم الهاتف",
      value: user.phone || "غير مضاف",
      icon: Phone,
      valueClassName: user.phone ? "text-slate-900" : "text-slate-500",
      dir: user.phone ? "ltr" : "rtl",
    },
    {
      key: "role",
      label: "نوع الحساب",
      value: "طالب",
      icon: ShieldCheck,
      valueClassName: "text-slate-900",
    },
  ] as const

  const renderPersonalInfo = () => (
    <Card className="rounded-[6.5px] border border-slate-200 bg-transparent shadow-sm">
      <CardHeader className="space-y-0 p-4 sm:p-5" dir="rtl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-right">
            <CardTitle className="text-xl font-bold text-slate-900">المعلومات الشخصية</CardTitle>
            <CardDescription className="mt-1 text-slate-500">راجع بيانات حسابك وقم بتحديثها عند الحاجة</CardDescription>
          </div>
          <Button
            onClick={() => setIsEditing(true)}
            className="hidden h-10 rounded-[6.5px] bg-blue-600 px-4 text-white hover:bg-blue-700 sm:inline-flex sm:w-auto"
          >
            <Edit3 className="ml-2 h-4 w-4" />
            تعديل الملف الشخصي
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 pt-0 sm:space-y-5 sm:p-5 sm:pt-0">
        <div className="rounded-[6.5px] border border-slate-200 bg-slate-50 p-4 sm:p-5" dir="rtl">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:text-right">
            <Avatar className="h-16 w-16 shrink-0 border border-slate-200 bg-blue-50 text-blue-600">
              <AvatarImage src={avatarPreview || getFileUrl(user.avatar)} alt={user.name} />
              <AvatarFallback className="bg-blue-50 text-lg font-bold text-blue-700">{user.name?.charAt(0) || "؟"}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <h3 className="text-lg font-bold text-slate-900">{user.name || "غير محدد"}</h3>
                <Badge className="rounded-[6.5px] bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">طالب</Badge>
              </div>
              <div className="mt-1 flex items-center justify-center gap-2 text-sm text-slate-500 sm:justify-start" dir="rtl">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="break-all">{user.email || "غير مضاف"}</span>
              </div>
              <div className="mt-1 flex items-center justify-center gap-2 text-sm text-slate-500 sm:justify-start" dir="rtl">
                <Phone className="h-4 w-4 text-blue-600" />
                {user.phone ? <span dir="ltr">{user.phone}</span> : <span>غير مضاف</span>}
              </div>
            </div>

            {isEditing && (
              <div className="w-full sm:w-auto">
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 w-full rounded-[6.5px] border-slate-200"
                >
                  <Camera className="ml-2 h-4 w-4" />
                  تغيير الصورة
                </Button>
              </div>
            )}
          </div>
        </div>

        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            className="h-10 w-full rounded-[6.5px] bg-blue-600 px-4 text-white hover:bg-blue-700 sm:hidden"
          >
            <Edit3 className="ml-2 h-4 w-4" />
            تعديل الملف الشخصي
          </Button>
        )}

        {!isEditing ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4" dir="rtl">
              {infoCards.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.key} className="rounded-[6.5px] border border-slate-200 bg-transparent p-4 text-right sm:p-5" dir="rtl">
                    <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                      <Icon className="h-4 w-4 text-blue-600" />
                      <span>{item.label}</span>
                    </div>
                    <p className={`text-base font-semibold ${item.valueClassName}`} dir={(item as { dir?: "ltr" | "rtl" }).dir || "rtl"}>
                      {item.value}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="rounded-[6.5px] border border-blue-100 bg-blue-50 p-3 text-right text-sm text-slate-600">
              <span className="sm:hidden">ملاحظة: قد تظهر بيانات التواصل لمنشئ الدورة عند التسجيل.</span>
              <span className="hidden sm:inline">ملاحظة: الاسم، الصورة، البريد الإلكتروني ورقم الهاتف قد تظهر لمنشئ الدورة عند التسجيل.</span>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="block text-right text-sm text-slate-600">
                  الاسم الكامل
                </Label>
                <div className="relative">
                  <UserIcon className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="name"
                    value={user.name}
                    onChange={(e) => setUser({ ...user, name: e.target.value })}
                    className="h-11 rounded-[6.5px] border-slate-200 pr-10 text-right"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="block text-right text-sm text-slate-600">
                  البريد الإلكتروني
                </Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    onChange={(e) => setUser({ ...user, email: e.target.value })}
                    className="h-11 rounded-[6.5px] border-slate-200 pr-10 text-right"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="phone" className="block text-right text-sm text-slate-600">
                  رقم الهاتف
                </Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="phone"
                    value={user.phone}
                    onChange={(e) => setUser({ ...user, phone: e.target.value })}
                    className="h-11 rounded-[6.5px] border-slate-200 pr-10 text-right"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setSelectedAvatar(null)
                  setAvatarPreview(null)
                  if (authUser) {
                    setUser({
                      name: authUser.name || "",
                      email: authUser.email || "",
                      phone: authUser.phone || "",
                      avatar: authUser.avatar || "",
                    })
                  }
                }}
                className="h-10 rounded-[6.5px] border-slate-200"
              >
                إلغاء
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="h-10 rounded-[6.5px] bg-blue-600 hover:bg-blue-700">
                {isSaving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                حفظ التغييرات
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )

  const renderPasswordChange = () => (
    <Card className="rounded-[6.5px] border border-slate-200 bg-transparent shadow-sm">
      <CardHeader className="text-right" dir="rtl">
        <CardTitle className="text-xl font-bold text-slate-900">تغيير كلمة المرور</CardTitle>
        <CardDescription className="text-slate-500">تأكد من استخدام كلمة مرور قوية وغير مكررة</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="current-password" className="block text-right text-sm text-slate-600">
            كلمة المرور الحالية
          </Label>
          <div className="relative">
            <Input id="current-password" type={showPassword ? "text" : "password"} value={pwForm.currentPassword} onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))} className="h-11 rounded-[6.5px] border-slate-200 pl-10 text-right" dir="ltr" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password" className="block text-right text-sm text-slate-600">
            كلمة المرور الجديدة
          </Label>
          <div className="relative">
            <Input id="new-password" type={showNewPassword ? "text" : "password"} value={pwForm.newPassword} onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))} className="h-11 rounded-[6.5px] border-slate-200 pl-10 text-right" dir="ltr" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="block text-right text-sm text-slate-600">
            تأكيد كلمة المرور الجديدة
          </Label>
          <div className="relative">
            <Input id="confirm-password" type={showConfirmPassword ? "text" : "password"} value={pwForm.confirmPassword} onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))} className="h-11 rounded-[6.5px] border-slate-200 pl-10 text-right" dir="ltr" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
            </Button>
          </div>
        </div>

        <div className="pt-2">
          <Button onClick={handlePasswordChange} disabled={isChangingPw} className="h-10 rounded-[6.5px] bg-blue-600 px-6 text-white hover:bg-blue-700">
            {isChangingPw ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" />جاري التحديث...</> : "تحديث كلمة المرور"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  if (!authUser) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 pb-8 pt-1 sm:px-6 sm:pt-1" dir="rtl">
      <div className="space-y-4 sm:space-y-5 text-right">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4" dir="rtl">
          <div className="mb-4">
        <TabsList
          dir="rtl"
          className="flex h-10 w-full flex-row rounded-[6.5px] border border-slate-200 bg-slate-100 p-1"
        >
          <TabsTrigger
            value="personal"
            className="flex flex-1 items-center justify-center gap-2 rounded-[6.5px] text-sm text-slate-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
          >
            <UserCircle2 className="h-4 w-4" />
            المعلومات الشخصية
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="flex flex-1 items-center justify-center gap-2 rounded-[6.5px] text-sm text-slate-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
          >
            <Lock className="h-4 w-4" />
            كلمة المرور
          </TabsTrigger>
        </TabsList>
          </div>

        <TabsContent value="personal" className="mt-0 outline-none">
          {renderPersonalInfo()}
        </TabsContent>

        <TabsContent value="security" className="mt-0 outline-none">
          {renderPasswordChange()}
        </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

