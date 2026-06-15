"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Mail, Phone, Shield, Lock, Save } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/page-header"
import { useAuth } from "@/contexts/auth-context"
import { authService } from "@/lib/auth-service"
import { toast } from "sonner"
import { useEffect, useRef } from "react"
import { Camera } from "lucide-react"
import { isValidEmail, PROFILE_IMAGE_MAX_SIZE_BYTES, PROFILE_IMAGE_MAX_SIZE_MB } from "@/lib/utils"

export default function AdminProfilePage() {
    const { user, updateUser } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string>("")

    // state for profile form
    const [profileForm, setProfileForm] = useState({
        name: "",
        email: "",
        phone: "",
        avatar: ""
    })

    // Initialize form when user data is available
    useEffect(() => {
        if (user) {
            setProfileForm({
                name: user.name || "",
                email: user.email || "",
                phone: user.phone || "",
                avatar: user.avatar || ""
            })
            // Reset preview when user data changes (e.g. after update)
            setPreviewUrl("")
            setSelectedFile(null)
        }
    }, [user])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > PROFILE_IMAGE_MAX_SIZE_BYTES) {
                toast.error(`حجم الصورة يجب ألا يتجاوز ${PROFILE_IMAGE_MAX_SIZE_MB}MB`)
                e.target.value = ""
                return
            }
            setSelectedFile(file)
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
        }
    }

    const triggerFileInput = () => {
        fileInputRef.current?.click()
    }

    // Mock state for password form
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    })

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (profileForm.email && !isValidEmail(profileForm.email)) {
            toast.error("صيغة البريد الإلكتروني غير صحيحة")
            return
        }
        setIsLoading(true)
        try {
            const formData = new FormData()
            formData.append('name', profileForm.name)
            formData.append('phone', profileForm.phone)
            formData.append('email', profileForm.email)
            
            if (selectedFile) {
                formData.append('avatar', selectedFile)
            }

            const updatedUser = await authService.updateProfile(formData)
            updateUser(updatedUser)
            toast.success("تم تحديث الملف الشخصي بنجاح")
        } catch (error: any) {
            toast.error(error.response?.data?.message || "فشل تحديث الملف الشخصي")
        } finally {
            setIsLoading(false)
        }
    }

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error("كلمات المرور غير متطابقة")
            return
        }
        setIsLoading(true)
        try {
            await authService.changePassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            })
            setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
            toast.success("تم تغيير كلمة المرور بنجاح")
        } catch (error: any) {
            toast.error(error.response?.data?.message || "فشل تغيير كلمة المرور")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="الملف الشخصي"
                description="إدارة معلومات حسابك الشخصي وإعدادات الأمان"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Summary Card */}
                <Card className="md:col-span-1">
                    <CardHeader className="text-center relative">
                        <div className="mx-auto mb-4 relative group">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={previewUrl || (profileForm.avatar ? (profileForm.avatar.startsWith('http') ? profileForm.avatar : `http://localhost:5001${profileForm.avatar}`) : "")} />
                                <AvatarFallback className="text-2xl">{profileForm.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <button 
                                onClick={triggerFileInput}
                                className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                title="تغيير الصورة"
                            >
                                <Camera className="h-4 w-4" />
                            </button>
                            <input 
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </div>
                        <CardTitle>{profileForm.name}</CardTitle>
                        <CardDescription className="flex items-center justify-center gap-1 mt-1">
                            <Shield className="h-3 w-3" />
                            مسؤول النظام
                        </CardDescription>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-4"
                            onClick={triggerFileInput}
                        >
                            تغيير الصورة الشخصية
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 text-sm text-right" dir="rtl">
                            <div className="flex items-center gap-2 text-gray-600 justify-end">
                                <span>{profileForm.email}</span>
                                <Mail className="h-4 w-4" />
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 justify-end">
                                <span>{profileForm.phone}</span>
                                <Phone className="h-4 w-4" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Settings Tabs */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>إعدادات الحساب</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="general" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-8">
                                <TabsTrigger value="general">المعلومات الأساسية</TabsTrigger>
                                <TabsTrigger value="security">الأمان وكلمة المرور</TabsTrigger>
                            </TabsList>

                            <TabsContent value="general">
                                <form onSubmit={handleProfileUpdate} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">الاسم الكامل</Label>
                                        <div className="relative">
                                            <User className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="name"
                                                className="pr-9"
                                                value={profileForm.name}
                                                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">البريد الإلكتروني</Label>
                                        <div className="relative">
                                            <Mail className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="email"
                                                type="email"
                                                className="pr-9"
                                                value={profileForm.email}
                                                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">رقم الهاتف</Label>
                                        <div className="relative">
                                            <Phone className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="phone"
                                                className="pr-9"
                                                value={profileForm.phone}
                                                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading ? "جاري الحفظ..." : "حفظ التغييرات"}
                                        <Save className="mr-2 h-4 w-4" />
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="security">
                                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="current-password">كلمة المرور الحالية</Label>
                                        <div className="relative">
                                            <Lock className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="current-password"
                                                type="password"
                                                className="pr-9"
                                                value={passwordForm.currentPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                                        <div className="relative">
                                            <Lock className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="new-password"
                                                type="password"
                                                className="pr-9"
                                                value={passwordForm.newPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                                        <div className="relative">
                                            <Lock className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="confirm-password"
                                                type="password"
                                                className="pr-9"
                                                value={passwordForm.confirmPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading ? "جاري التحديث..." : "تحديث كلمة المرور"}
                                        <Save className="mr-2 h-4 w-4" />
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

