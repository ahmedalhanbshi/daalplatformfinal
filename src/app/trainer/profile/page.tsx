"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { User, Mail, Phone, Eye, EyeOff, Loader2, Camera, X, Plus, ShieldCheck, Pencil, Trash2, CreditCard, Lock, Edit, Sparkles, Tag, Landmark, Wallet, Hash } from "lucide-react"
import { toast } from "sonner"
import { trainerService } from "@/lib/trainer-service"
import { useAuth } from "@/contexts/auth-context"
import { getFileUrl, isValidEmail, PROFILE_IMAGE_MAX_SIZE_BYTES, PROFILE_IMAGE_MAX_SIZE_MB } from "@/lib/utils"

type ProfileData = {
    id: string
    name: string
    email: string
    phone: string
    avatar: string | null
    role: string
    status: string
    createdAt: string
    bio: string
    cvUrl: string | null
    specialties: string[]
    verificationStatus: string | null
}

export default function TrainerProfilePage() {
    const { updateUser } = useAuth()
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [activeTab, setActiveTab] = useState("personal")

    // Editable fields mirror
    const [form, setForm] = useState({ name: "", phone: "", bio: "", specialties: [] as string[], email: "" })
    const [newSpecialty, setNewSpecialty] = useState("")
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string>("")
    const [avatarCacheKey, setAvatarCacheKey] = useState<number>(Date.now())
    const avatarInputRef = useRef<HTMLInputElement>(null)

    // Password change
    const [showCurrentPw, setShowCurrentPw] = useState(false)
    const [showNewPw, setShowNewPw] = useState(false)
    const [showConfirmPw, setShowConfirmPw] = useState(false)
    const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
    const [isChangingPw, setIsChangingPw] = useState(false)

    // Bank Account States
    const [bankAccounts, setBankAccounts] = useState<any[]>([])
    const [isBankAccountsLoading, setIsBankAccountsLoading] = useState(true)
    const [isBankModalOpen, setIsBankModalOpen] = useState(false)
    const [isSavingBank, setIsSavingBank] = useState(false)
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
    const [accountToDeleteId, setAccountToDeleteId] = useState<string | null>(null)
    const [isDeletingBank, setIsDeletingBank] = useState(false)
    const [bankForm, setBankForm] = useState({
        bankName: "",
        accountName: "",
        accountNumber: "",
        iban: "",
        isActive: true
    })
    const [errors, setErrors] = useState<{ bankName?: string; accountName?: string; accountNumber?: string; iban?: string }>({})

    const fetchBankAccounts = async () => {
        try {
            setIsBankAccountsLoading(true)
            const accounts = await trainerService.getBankAccounts()
            setBankAccounts(accounts || [])
        } catch (error) {
            console.error("Failed to fetch bank accounts", error)
            toast.error("فشل في تحميل الحسابات البنكية")
        } finally {
            setIsBankAccountsLoading(false)
        }
    }

    const maskIban = (iban: string) => {
        if (!iban) return ""
        const clean = iban.replace(/\s+/g, '')
        if (clean.length <= 4) return iban
        const prefix = clean.substring(0, 2).toUpperCase()
        const last4 = clean.slice(-4)
        return `${prefix}**** **** ${last4}`
    }

    const validateBankForm = () => {
        const newErrors: typeof errors = {}
        if (!bankForm.bankName.trim()) {
            newErrors.bankName = "اسم البنك مطلوب"
        }
        if (!bankForm.accountName.trim()) {
            newErrors.accountName = "اسم صاحب الحساب مطلوب"
        }
        if (!bankForm.accountNumber.trim()) {
            newErrors.accountNumber = "رقم الحساب مطلوب"
        }
        if (bankForm.iban.trim()) {
            if (!bankForm.iban.trim().toUpperCase().startsWith("SA")) {
                newErrors.iban = "يجب أن يبدأ الآيبان بـ SA"
            } else if (bankForm.iban.trim().length < 15) {
                newErrors.iban = "صيغة الآيبان غير صالحة"
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const openBankModal = (account?: any) => {
        setErrors({})
        if (account) {
            setEditingAccountId(account.id)
            setBankForm({
                bankName: account.bankName,
                accountName: account.accountName,
                accountNumber: account.accountNumber,
                iban: account.iban || "",
                isActive: account.isActive
            })
        } else {
            setEditingAccountId(null)
            setBankForm({
                bankName: "",
                accountName: "",
                accountNumber: "",
                iban: "",
                isActive: true
            })
        }
        setIsBankModalOpen(true)
    }

    const handleBankFormChange = (field: string, value: any) => {
        setBankForm(prev => ({ ...prev, [field]: value }))
        if (errors[field as keyof typeof errors]) {
            setErrors(prev => ({ ...prev, [field]: undefined }))
        }
    }


    const handleSaveBankAccount = async () => {
        if (!validateBankForm()) {
            toast.error("يرجى تصحيح الأخطاء قبل الحفظ")
            return
        }

        try {
            setIsSavingBank(true)
            if (editingAccountId) {
                await trainerService.updateBankAccount(editingAccountId, bankForm)
                toast.success("تم تحديث الحساب البنكي بنجاح")
            } else {
                await trainerService.addBankAccount(bankForm)
                toast.success("تم إضافة الحساب البنكي بنجاح")
            }
            setIsBankModalOpen(false)
            fetchBankAccounts()
        } catch (error: any) {
            console.error("Error saving bank account:", error)
            toast.error(error.message || "حدث خطأ أثناء حفظ الحساب البنكي")
        } finally {
            setIsSavingBank(false)
        }
    }

    const confirmDeleteBankAccount = async () => {
        if (!accountToDeleteId) return

        try {
            setIsDeletingBank(true)
            await trainerService.deleteBankAccount(accountToDeleteId)
            toast.success("تم حذف الحساب البنكي بنجاح")
            fetchBankAccounts()
            setAccountToDeleteId(null)
        } catch (error: any) {
            console.error("Error deleting bank account:", error)
            toast.error(error.message || "حدث خطأ أثناء حذف الحساب البنكي")
        } finally {
            setIsDeletingBank(false)
        }
    }

    // Load profile
    useEffect(() => {
        const load = async () => {
            try {
                const data = await trainerService.getProfile()
                setProfile(data)
                setForm({ name: data.name, phone: data.phone ?? "", bio: data.bio ?? "", specialties: data.specialties ?? [], email: data.email ?? "" })
            } catch (err: any) {
                toast.error(err?.response?.data?.message || "فشل في تحميل الملف الشخصي")
            } finally {
                setLoading(false)
            }
        }
        load()
        fetchBankAccounts()
    }, [])

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > PROFILE_IMAGE_MAX_SIZE_BYTES) {
                toast.error(`حجم الصورة يجب ألا يتجاوز ${PROFILE_IMAGE_MAX_SIZE_MB}MB`)
                e.target.value = ""
                return
            }
            setAvatarFile(file)
            setAvatarPreview(URL.createObjectURL(file))
        }
    }

    const startEditing = () => {
        if (!profile) return
        setForm({ name: profile.name, phone: profile.phone, bio: profile.bio, specialties: [...profile.specialties], email: profile.email })
        setAvatarFile(null)
        setAvatarPreview("")
        setIsEditing(true)
    }

    const cancelEditing = () => {
        setIsEditing(false)
        setAvatarFile(null)
        setAvatarPreview("")
    }

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error("الاسم مطلوب"); return }
        if (form.email && !isValidEmail(form.email)) {
            toast.error("صيغة البريد الإلكتروني غير صحيحة")
            return
        }
        try {
            setIsSaving(true)
            const updated = await trainerService.updateProfile({
                name: form.name,
                phone: form.phone,
                email: form.email,
                bio: form.bio,
                specialties: form.specialties,
                avatar: avatarFile ?? undefined,
            })
            setProfile(updated)
            setIsEditing(false)
            setAvatarFile(null)
            setAvatarPreview("")
            setAvatarCacheKey(Date.now()) // bust browser cache for avatar
            // Sync auth context so header avatar/name update immediately
            updateUser({ name: updated.name, avatar: updated.avatar ?? undefined })
            toast.success("تم تحديث الملف الشخصي بنجاح")
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "فشل في تحديث الملف الشخصي")
        } finally {
            setIsSaving(false)
        }
    }

    const handlePasswordChange = async () => {
        if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
            toast.error("يرجى ملء جميع الحقول"); return
        }
        if (pwForm.newPassword !== pwForm.confirmPassword) {
            toast.error("كلمة المرور الجديدة وتأكيدها غير متطابقين"); return
        }
        if (pwForm.newPassword.length < 8) {
            toast.error("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل"); return
        }
        try {
            setIsChangingPw(true)
            await trainerService.changePassword(pwForm.currentPassword, pwForm.newPassword)
            toast.success("تم تغيير كلمة المرور بنجاح")
            setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "فشل في تغيير كلمة المرور")
        } finally {
            setIsChangingPw(false)
        }
    }

    const addSpecialty = () => {
        const s = newSpecialty.trim()
        if (s && !form.specialties.includes(s)) {
            setForm(prev => ({ ...prev, specialties: [...prev.specialties, s] }))
            setNewSpecialty("")
        }
    }

    const removeSpecialty = (s: string) =>
        setForm(prev => ({ ...prev, specialties: prev.specialties.filter(x => x !== s) }))

    const profileAvatarSrc = profile?.avatar ? getFileUrl(profile.avatar) : undefined
    const avatarSrc = avatarPreview || (profileAvatarSrc ? `${profileAvatarSrc}?t=${avatarCacheKey}` : "")

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="flex h-96 items-center justify-center text-gray-500">
                تعذّر تحميل الملف الشخصي
            </div>
        )
    }

    const verificationLabel = profile.verificationStatus === "APPROVED" ? "موثق" : profile.verificationStatus === "REJECTED" ? "مرفوض" : "قيد المراجعة"

        return (
        <div className="mx-auto max-w-6xl space-y-6 text-right" dir="rtl">
            <div className="space-y-1">
                <h1 className="text-3xl font-extrabold text-[#0F172A]">الملف الشخصي</h1>
                <p className="text-sm text-[#64748B]">الرئيسية &gt; الملف الشخصي</p>
            </div>

            <Card className="rounded-2xl border border-[#E5EAF3] bg-white shadow-sm">
                <CardContent className="p-5 sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex w-full flex-col gap-2 sm:flex-row sm:gap-3 lg:order-2 lg:w-auto lg:flex-col">
                            {isEditing ? (
                                <>
                                    <Button onClick={handleSave} disabled={isSaving} className="h-10 bg-[#2563EB] text-white hover:bg-[#1d4ed8]">
                                        {isSaving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Edit className="ml-2 h-4 w-4" />}
                                        حفظ التغييرات
                                    </Button>
                                    <Button variant="outline" onClick={cancelEditing} disabled={isSaving} className="h-10 border-[#E5EAF3] bg-white text-[#0F172A]">
                                        إلغاء التعديل
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button onClick={startEditing} className="h-10 bg-[#2563EB] text-white hover:bg-[#1d4ed8]">
                                        <Edit className="ml-2 h-4 w-4" />
                                        تعديل الملف الشخصي
                                    </Button>
                                </>
                            )}
                        </div>

                        <div className="flex flex-col-reverse items-center gap-4 text-right sm:flex-row-reverse sm:items-center lg:order-1">
                            <div className="space-y-2 text-center sm:text-right">
                                <h2 className="text-2xl font-extrabold text-[#0F172A]">{profile.name}</h2>
                                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                    <Badge className="border-0 bg-[#FEF3C7] text-[#B45309] hover:bg-[#FEF3C7]">مدرب</Badge>
                                    {profile.verificationStatus && (
                                        <Badge className="border-0 bg-[#DCFCE7] text-[#166534] hover:bg-[#DCFCE7]">
                                            <ShieldCheck className="ml-1 h-3.5 w-3.5" />
                                            {verificationLabel}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-[#64748B] sm:justify-start">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Mail className="h-4 w-4" />
                                        {profile.email || "غير متوفر"}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5" dir="rtl">
                                        <Phone className="h-4 w-4" />
                                        <span>{profile.phone || "غير متوفر"}</span>
                                    </span>
                                </div>
                            </div>

                            <div className="relative">
                                <Avatar
                                    className={`h-[110px] w-[110px] border border-[#E5EAF3] ${isEditing ? "cursor-pointer" : ""}`}
                                    onClick={() => isEditing && avatarInputRef.current?.click()}
                                >
                                    <AvatarImage src={avatarSrc} alt={profile.name} />
                                    <AvatarFallback className="bg-[#EFF6FF] text-xl font-bold text-[#2563EB]">
                                        {profile.name.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={() => avatarInputRef.current?.click()}
                                        className="absolute -bottom-1 -left-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E5EAF3] bg-white text-[#2563EB] shadow-sm"
                                    >
                                        <Camera className="h-4 w-4" />
                                    </button>
                                )}
                                <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="mb-3 flex justify-end">
                    <TabsList dir="rtl" className="h-auto w-auto justify-start overflow-x-auto rounded-xl border border-[#E5EAF3] bg-[#F8FAFC] p-1">
                        <TabsTrigger dir="rtl" value="personal" className="h-11 min-w-[170px] rounded-lg text-[#64748B] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:shadow-sm">
                            <User className="ml-2 h-4 w-4" />
                            المعلومات الشخصية
                        </TabsTrigger>
                        <TabsTrigger dir="rtl" value="banks" className="h-11 min-w-[170px] rounded-lg text-[#64748B] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:shadow-sm">
                            <CreditCard className="ml-2 h-4 w-4" />
                            الحسابات البنكية
                        </TabsTrigger>
                        <TabsTrigger dir="rtl" value="security" className="h-11 min-w-[150px] rounded-lg text-[#64748B] data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:shadow-sm">
                            <Lock className="ml-2 h-4 w-4" />
                            كلمة المرور
                        </TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="personal" className="mt-4">
                    <Card className="rounded-2xl border border-[#E5EAF3] bg-white shadow-sm">
                        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between" dir="rtl">
                            <div className="text-right">
                                <CardTitle className="text-xl font-bold text-[#0F172A]">المعلومات الشخصية</CardTitle>
                                <CardDescription className="mt-1 text-sm text-[#64748B]">إدارة معلومات حسابك الشخصي</CardDescription>
                            </div>
                            <Button variant="outline" onClick={isEditing ? cancelEditing : startEditing} className="h-9 border-[#E5EAF3] bg-white text-[#334155]">
                                <Pencil className="ml-2 h-4 w-4" />
                                تعديل المعلومات
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" dir="rtl">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-right text-[#334155]">الاسم الكامل</Label>
                                    <div className="relative">
                                        <User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                                        <Input id="name" dir="rtl" value={isEditing ? form.name : profile.name} onChange={e => setForm({ ...form, name: e.target.value })} disabled={!isEditing} className="h-11 rounded-lg border-[#E5EAF3] bg-[#F8FAFC] pr-9 text-right text-[#0F172A]" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-right text-[#334155]">البريد الإلكتروني</Label>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                                        <Input id="email" dir="rtl" type="email" value={isEditing ? form.email : profile.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!isEditing} className="h-11 rounded-lg border-[#E5EAF3] bg-[#F8FAFC] pr-9 text-right text-[#0F172A]" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-right text-[#334155]">رقم الهاتف</Label>
                                    <div className="relative">
                                        <Phone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                                        <Input id="phone" dir="rtl" value={isEditing ? form.phone : profile.phone} onChange={e => setForm({ ...form, phone: e.target.value })} disabled={!isEditing} className="h-11 rounded-lg border-[#E5EAF3] bg-[#F8FAFC] pr-9 text-right text-[#0F172A] placeholder:text-right" placeholder="+966XXXXXXXXX" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-right text-[#334155]">حالة الحساب</Label>
                                    <div className="flex h-11 items-center rounded-lg border border-[#E5EAF3] bg-[#F8FAFC] px-3">
                                        <Badge className="border-0 bg-[#DCFCE7] text-[#16A34A] hover:bg-[#DCFCE7]">{profile.status === "active" ? "نشط" : profile.status}</Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bio" className="text-right text-[#334155]">نبذة عني</Label>
                                <div className="relative">
                                    <Edit className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#94A3B8]" />
                                    <Textarea
                                        id="bio"
                                        dir="rtl"
                                        value={isEditing ? form.bio : profile.bio}
                                        onChange={e => setForm({ ...form, bio: e.target.value })}
                                        disabled={!isEditing}
                                        rows={4}
                                        className="min-h-[120px] rounded-lg border-[#E5EAF3] bg-[#F8FAFC] pl-9 text-right text-[#0F172A] placeholder:text-right placeholder:text-[#94A3B8]"
                                        placeholder="اكتب نبذة مختصرة عن خبراتك ومهاراتك..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-3" dir="rtl">
                                <Label className="text-right text-[#334155]">التخصصات</Label>
                                {(isEditing ? form.specialties : profile.specialties).length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {(isEditing ? form.specialties : profile.specialties).map(s => (
                                            <Badge key={s} className="border border-[#E5EAF3] bg-white px-3 py-1 text-[#334155]">
                                                {s}
                                                {isEditing && (
                                                    <button type="button" onClick={() => removeSpecialty(s)} className="mr-1">
                                                        <X className="h-3 w-3 text-gray-500 hover:text-red-500" />
                                                    </button>
                                                )}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-[#E5EAF3] bg-[#F8FAFC] p-5 text-center">
                                        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#2563EB]">
                                            <Tag className="h-5 w-5" />
                                        </div>
                                        <p className="font-semibold text-[#0F172A]">لا توجد تخصصات مضافة</p>
                                        <p className="mt-1 text-sm text-[#64748B]">إضافة تخصصات يساعد الطلاب على العثور عليك بسهولة</p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="mt-3 border-[#E5EAF3] bg-white text-[#2563EB]"
                                            onClick={() => {
                                                if (!isEditing) setIsEditing(true)
                                                setTimeout(() => {
                                                    const el = document.getElementById("new-specialty-input")
                                                    el?.focus()
                                                }, 0)
                                            }}
                                        >
                                            <Plus className="ml-1 h-4 w-4" />
                                            إضافة تخصص
                                        </Button>
                                    </div>
                                )}

                                {isEditing && (
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Input
                                            id="new-specialty-input"
                                            dir="rtl"
                                            placeholder="أضف تخصص جديد..."
                                            value={newSpecialty}
                                            onChange={e => setNewSpecialty(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSpecialty() } }}
                                            className="h-11 rounded-lg border-[#E5EAF3] bg-[#F8FAFC] text-right placeholder:text-right"
                                        />
                                        <Button type="button" variant="outline" onClick={addSpecialty} className="h-11 border-[#E5EAF3] bg-white text-[#2563EB]">
                                            <Plus className="ml-1 h-4 w-4" />
                                            إضافة
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {profile.cvUrl && (
                                <div className="space-y-2">
                                    <Label>السيرة الذاتية</Label>
                                    <a
                                        href={getFileUrl(profile.cvUrl) || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm text-[#2563EB] hover:underline"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        عرض السيرة الذاتية
                                    </a>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="mt-4">
                    <Card className="rounded-2xl border border-[#E5EAF3] bg-white shadow-sm">
                        <CardHeader>
                            <CardTitle>تغيير كلمة المرور</CardTitle>
                            <CardDescription>تأكد من استخدام كلمة مرور قوية وآمنة (8 أحرف على الأقل)</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="current-password">كلمة المرور الحالية</Label>
                                <div className="relative">
                                    <Input
                                        id="current-password"
                                        type={showCurrentPw ? "text" : "password"}
                                        value={pwForm.currentPassword}
                                        onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                                        className="pl-10"
                                        placeholder="أدخل كلمة المرور الحالية"
                                    />
                                    <Button type="button" variant="ghost" size="sm" className="absolute left-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowCurrentPw(!showCurrentPw)}>
                                        {showCurrentPw ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                                <div className="relative">
                                    <Input
                                        id="new-password"
                                        type={showNewPw ? "text" : "password"}
                                        value={pwForm.newPassword}
                                        onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                                        className="pl-10"
                                        placeholder="أدخل كلمة المرور الجديدة"
                                    />
                                    <Button type="button" variant="ghost" size="sm" className="absolute left-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowNewPw(!showNewPw)}>
                                        {showNewPw ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">تأكيد كلمة المرور الجديدة</Label>
                                <div className="relative">
                                    <Input
                                        id="confirm-password"
                                        type={showConfirmPw ? "text" : "password"}
                                        value={pwForm.confirmPassword}
                                        onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                                        className="pl-10"
                                        placeholder="أعد تأكيد كلمة المرور"
                                    />
                                    <Button type="button" variant="ghost" size="sm" className="absolute left-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowConfirmPw(!showConfirmPw)}>
                                        {showConfirmPw ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                                    </Button>
                                </div>
                                {pwForm.newPassword && pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                                    <p className="text-xs text-red-500">كلمتا المرور غير متطابقتين</p>
                                )}
                            </div>

                            <Button onClick={handlePasswordChange} disabled={isChangingPw} className="mt-2 bg-[#2563EB] text-white hover:bg-[#1d4ed8]">
                                {isChangingPw ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" />جاري التغيير...</> : "تغيير كلمة المرور"}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="banks" className="mt-4">
                    <Card className="rounded-2xl border border-[#E5EAF3] bg-white shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between p-6 pb-4 border-b border-[#E5EAF3]" dir="rtl">
                            <div className="space-y-1 text-right">
                                <CardTitle className="text-xl font-bold text-[#0F172A]">الحسابات البنكية</CardTitle>
                                <CardDescription className="text-sm text-[#64748B]">
                                    إدارة الحسابات البنكية الخاصة بك لاستقبال المدفوعات
                                </CardDescription>
                            </div>
                            <Button 
                                onClick={() => openBankModal()} 
                                className="h-10 rounded-xl bg-[#2563EB] text-white hover:bg-[#1d4ed8] px-4 font-semibold text-sm flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                <span>إضافة حساب جديد</span>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6">
                            {isBankAccountsLoading ? (
                                <div className="flex h-32 items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
                                </div>
                            ) : bankAccounts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center border-2 border-dashed border-[#D8E0EC] bg-[#F8FAFC] rounded-xl p-10 text-center">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-[#2563EB] mb-4">
                                        <Landmark className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-lg font-bold text-[#0F172A] mb-1">
                                        لا توجد حسابات بنكية مضافة بعد
                                    </h3>
                                    <p className="text-sm text-[#64748B] mb-6 max-w-sm">
                                        أضف حسابك البنكي لاستقبال مدفوعات الدورات بسهولة
                                    </p>
                                    <Button 
                                        onClick={() => openBankModal()} 
                                        className="h-10 rounded-xl bg-[#2563EB] text-white hover:bg-[#1d4ed8] px-5 font-semibold text-sm flex items-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span>إضافة حساب بنكي</span>
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {bankAccounts.map((account) => (
                                        <div 
                                            key={account.id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white border border-[#E5EAF3] rounded-xl gap-4 hover:shadow-sm transition-all"
                                            dir="rtl"
                                        >
                                            {/* Right: Bank info */}
                                            <div className="flex items-center gap-4 text-right">
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#2563EB]">
                                                    <Landmark className="h-6 w-6" />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-bold text-[#0F172A] text-base">{account.bankName}</span>
                                                    </div>
                                                    <div className="text-sm text-[#64748B] font-medium">
                                                        {account.accountName}
                                                    </div>
                                                    <div className="text-sm font-mono text-[#334155] tracking-wider" dir="ltr">
                                                        {maskIban(account.iban || account.accountNumber)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Left: Badge and Actions */}
                                            <div className="flex items-center gap-3 self-end sm:self-center">
                                
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openBankModal(account)}
                                                    className="text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A] h-9 w-9 rounded-lg border border-[#E5EAF3]"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setAccountToDeleteId(account.id)}
                                                    className="text-red-500 hover:bg-red-50 hover:text-red-600 h-9 w-9 rounded-lg border border-[#E5EAF3]"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs><Dialog open={isBankModalOpen} onOpenChange={setIsBankModalOpen}>
                <DialogContent dir="rtl" style={{ borderRadius: '6.5px' }} className="sm:max-w-[460px] p-6 gap-6 [&>button[data-dialog-close='default']]:hidden border border-gray-100/80 shadow-2xl">
                    <DialogClose asChild>
                        <button className="absolute left-4 top-4 rounded-full p-2 text-red-500 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all">
                            <X className="h-4 w-4" />
                        </button>
                    </DialogClose>
                    
                    <DialogHeader className="text-right flex flex-col gap-1 items-start w-full">
                        <DialogTitle className="text-2xl font-bold text-gray-900 tracking-tight">
                            {editingAccountId ? "تعديل حساب بنكي" : "إضافة حساب بنكي"}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500 font-normal">
                            أدخل تفاصيل الحساب البنكي لاستقبال التحويلات.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-5 py-2">
                        {/* Bank Name */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="bankName" className="text-right text-sm font-semibold text-gray-700">
                                اسم البنك <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="bankName"
                                    value={bankForm.bankName}
                                    onChange={(e) => handleBankFormChange("bankName", e.target.value)}
                                    placeholder="مثال: بنك الرياض، البنك الأهلي"
                                    style={{ borderRadius: '6.5px' }}
                                    className={`h-12 pl-12 pr-4 text-right border ${errors.bankName ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'} focus:ring-1 outline-none transition-all placeholder:text-gray-400 font-medium`}
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <Landmark className="h-5 w-5" />
                                </div>
                            </div>
                            {errors.bankName && <p className="text-right text-xs text-red-500 mt-1">{errors.bankName}</p>}
                        </div>

                        {/* Account Owner Name */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="accountName" className="text-right text-sm font-semibold text-gray-700">
                                اسم صاحب الحساب <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="accountName"
                                    value={bankForm.accountName}
                                    onChange={(e) => handleBankFormChange("accountName", e.target.value)}
                                    placeholder="الاسم كما يظهر في البنك"
                                    style={{ borderRadius: '6.5px' }}
                                    className={`h-12 pl-12 pr-4 text-right border ${errors.accountName ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'} focus:ring-1 outline-none transition-all placeholder:text-gray-400 font-medium`}
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <User className="h-5 w-5" />
                                </div>
                            </div>
                            {errors.accountName && <p className="text-right text-xs text-red-500 mt-1">{errors.accountName}</p>}
                        </div>

                        {/* Account Number */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="accountNumber" className="text-right text-sm font-semibold text-gray-700">
                                رقم الحساب <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="accountNumber"
                                    value={bankForm.accountNumber}
                                    onChange={(e) => handleBankFormChange("accountNumber", e.target.value)}
                                    placeholder="أدخل رقم الحساب"
                                    style={{ borderRadius: '6.5px' }}
                                    className={`h-12 pl-12 pr-4 text-right border ${errors.accountNumber ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'} focus:ring-1 outline-none transition-all placeholder:text-gray-400 font-medium`}
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <CreditCard className="h-5 w-5" />
                                </div>
                            </div>
                            {errors.accountNumber && <p className="text-right text-xs text-red-500 mt-1">{errors.accountNumber}</p>}
                        </div>

                        {/* IBAN */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="iban" className="text-right text-sm font-semibold text-gray-700">
                                الأيبان (IBAN)
                            </Label>
                            <div className="relative">
                                <Input
                                    id="iban"
                                    value={bankForm.iban}
                                    onChange={(e) => handleBankFormChange("iban", e.target.value)}
                                    placeholder="SA..."
                                    style={{ borderRadius: '6.5px' }}
                                    className={`h-12 pl-12 pr-4 text-right border ${errors.iban ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'} focus:ring-1 outline-none transition-all placeholder:text-gray-400 font-medium`}
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <Hash className="h-5 w-5" />
                                </div>
                            </div>
                            {errors.iban && <p className="text-right text-xs text-red-500 mt-1">{errors.iban}</p>}
                        </div>

                    </div>

                    <DialogFooter className="flex flex-row items-center justify-end gap-3 mt-4 w-full">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsBankModalOpen(false)}
                            style={{ borderRadius: '6.5px' }}
                            className="h-12 px-6 border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 active:scale-95 transition-all font-semibold"
                        >
                            إلغاء
                        </Button>
                        <Button
                            onClick={handleSaveBankAccount}
                            disabled={isSavingBank}
                            style={{ borderRadius: '6.5px' }}
                            className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/10 active:scale-95 transition-all"
                        >
                            {isSavingBank ? "جاري الحفظ..." : "حفظ الحساب"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!accountToDeleteId}
                onOpenChange={(open) => {
                    if (!open && !isDeletingBank) setAccountToDeleteId(null)
                }}
            >
                <DialogContent
                    dir="rtl"
                    className="max-w-md rounded-[6.5px] border border-slate-200 bg-white p-0 shadow-xl [&>[data-dialog-close=default]]:hidden"
                >
                    <div className="p-5 text-right">
                        <DialogHeader className="space-y-2 text-right">
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1 text-right">
                                    <DialogTitle className="text-lg font-bold text-slate-900">حذف الحساب البنكي</DialogTitle>
                                    <DialogDescription className="text-sm leading-6 text-slate-600">
                                        هل أنت متأكد من حذف هذا الحساب البنكي؟ لا يمكن التراجع عن هذا الإجراء بعد الحذف.
                                    </DialogDescription>
                                </div>
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6.5px] bg-red-50 text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="mt-5 flex items-center justify-start gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-9 rounded-[6.5px] px-4"
                                onClick={() => setAccountToDeleteId(null)}
                                disabled={isDeletingBank}
                            >
                                إلغاء
                            </Button>
                            <Button
                                type="button"
                                className="h-9 rounded-[6.5px] bg-red-600 px-4 text-white hover:bg-red-700"
                                onClick={confirmDeleteBankAccount}
                                disabled={isDeletingBank}
                            >
                                {isDeletingBank ? "جاري الحذف..." : "حذف الحساب البنكي"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

