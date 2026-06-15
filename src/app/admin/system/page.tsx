"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Settings, Mail, Save, FileText, Loader2, Eye, EyeOff } from "lucide-react"
import { settingsService, SystemSettings } from "@/lib/settings-service"
import { usePlatform } from "@/contexts/platform-context"
import { getFileUrl } from "@/lib/utils"
import { toast } from "sonner"

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden rounded-[12px] border border-slate-200 shadow-sm">
      <CardHeader className="p-6 pb-4">
        <div className="w-full flex flex-row items-center justify-start gap-3 text-right" dir="rtl">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            {icon}
          </div>
          <CardTitle className="text-lg font-bold text-slate-900">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-6 pt-0">{children}</CardContent>
    </Card>
  )
}

export default function AdminSystem() {
  const { refreshSettings } = usePlatform()
  const [loading, setLoading] = useState(true)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const [generalSettings, setGeneralSettings] = useState({
    siteName: "",
    siteDescription: "",
    siteLogo: "",
    contactEmail: "",
    supportPhone: "",
    maintenanceMode: "false",
    maintenanceMessage: "",
    maintenanceEndTime: "",
    maintenanceHardMode: false,
    registrationEnabled: "true",
  })

  const [emailSettings, setEmailSettings] = useState({
    fromName: "",
    fromEmail: "",
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPassword: "",
  })

  const [legalSettings, setLegalSettings] = useState({
    termsContent: "",
    termsUpdatedAt: "",
    privacyContent: "",
    privacyUpdatedAt: "",
  })

  const [savingGeneral, setSavingGeneral] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingLegal, setSavingLegal] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    settingsService
      .getSettings()
      .then((data: SystemSettings) => {
        if (data.general) {
          setGeneralSettings({
            siteName: data.general.siteName || "",
            siteDescription: data.general.siteDescription || "",
            siteLogo: data.general.siteLogo || "",
            contactEmail: data.general.contactEmail || "",
            supportPhone: data.general.supportPhone || "",
            maintenanceMode: data.general.maintenanceMode || "false",
            maintenanceMessage: data.general.maintenanceMessage || "",
            maintenanceEndTime: data.general.maintenanceEndTime || "",
            maintenanceHardMode: false,
            registrationEnabled: data.general.registrationEnabled || "true",
          })
        }
        if (data.email) {
          setEmailSettings({
            fromName: data.email.fromName || "",
            fromEmail: data.email.fromEmail || "",
            smtpHost: data.email.smtpHost || "",
            smtpPort: data.email.smtpPort || "587",
            smtpUser: data.email.smtpUser || "",
            smtpPassword: data.email.smtpPassword || "",
          })
        }
        if (data.legal) {
          setLegalSettings({
            termsContent: data.legal.termsContent || "",
            termsUpdatedAt: data.legal.termsUpdatedAt || "",
            privacyContent: data.legal.privacyContent || "",
            privacyUpdatedAt: data.legal.privacyUpdatedAt || "",
          })
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = useCallback(
    async (section: string, values: Record<string, string>, setSaving: (s: boolean) => void) => {
      setSaving(true)
      try {
        await settingsService.saveSection(section, values)
        toast.success("تم حفظ الإعدادات بنجاح")
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "فشل حفظ الإعدادات")
      } finally {
        setSaving(false)
      }
    },
    []
  )

  const handleSaveGeneral = async () => {
    setSavingGeneral(true)
    try {
      const { maintenanceMode, maintenanceMessage, maintenanceEndTime, maintenanceHardMode, ...rest } = generalSettings

      await settingsService.saveSection("general", rest as Record<string, string>)
      await settingsService.updateMaintenanceMode({
        maintenanceMode,
        maintenanceMessage,
        maintenanceEndTime,
        hardMode: maintenanceHardMode,
      })

      toast.success("تم حفظ الإعدادات بنجاح")
      await refreshSettings()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل حفظ الإعدادات")
    } finally {
      setSavingGeneral(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    try {
      const { logoUrl } = await settingsService.uploadSiteLogo(file)
      setGeneralSettings((prev) => ({ ...prev, siteLogo: logoUrl }))
      await refreshSettings()
      toast.success("تم رفع الشعار بنجاح")
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل رفع الشعار")
    } finally {
      setUploadingLogo(false)
      if (e.target) e.target.value = ""
    }
  }

  const handleRemoveLogo = async () => {
    setUploadingLogo(true)
    try {
      await settingsService.removeSiteLogo()
      setGeneralSettings((prev) => ({ ...prev, siteLogo: "" }))
      await refreshSettings()
      toast.success("تمت إزالة الشعار واستعادة الشعار الافتراضي")
    } catch {
      toast.error("فشل إزالة الشعار")
    } finally {
      setUploadingLogo(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="mr-3 text-muted-foreground">جارٍ تحميل الإعدادات...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="w-full text-right">
        <h1 className="text-3xl font-bold text-gray-900">إعدادات النظام</h1>
        <p className="mt-2 text-gray-600">إدارة إعدادات المنصة والتكاملات</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6" dir="rtl">
        <TabsList className="grid w-full grid-cols-3 gap-2 rounded-[12px] bg-slate-100 p-1">
          <TabsTrigger value="general" className="rounded-[10px] px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
            عام
          </TabsTrigger>
          <TabsTrigger value="email" className="rounded-[10px] px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
            البريد
          </TabsTrigger>
          <TabsTrigger value="legal" className="rounded-[10px] px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
            المحتوى القانوني
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <SectionCard title="الإعدادات العامة" icon={<Settings className="h-5 w-5" />}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2 text-right">
                <Label htmlFor="siteName" className="block text-right font-medium text-slate-700">
                  اسم المنصة
                </Label>
                <Input
                  id="siteName"
                  value={generalSettings.siteName}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
                  className="h-11 rounded-[12px] text-right"
                />
              </div>

              <div className="space-y-2 text-right">
                <Label htmlFor="contactEmail" className="block text-right font-medium text-slate-700">
                  بريد التواصل
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={generalSettings.contactEmail}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, contactEmail: e.target.value })}
                  className="h-11 rounded-[12px] text-right"
                />
              </div>

              <div className="space-y-2 text-right">
                <Label htmlFor="supportPhone" className="block text-right font-medium text-slate-700">
                  رقم الدعم
                </Label>
                <Input
                  id="supportPhone"
                  value={generalSettings.supportPhone}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, supportPhone: e.target.value })}
                  className="h-11 rounded-[12px] text-right"
                />
              </div>

              <div className="space-y-2 text-right md:col-span-2 xl:col-span-3">
                <Label htmlFor="siteDescription" className="block text-right font-medium text-slate-700">
                  وصف المنصة
                </Label>
                <Textarea
                  id="siteDescription"
                  rows={3}
                  value={generalSettings.siteDescription}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, siteDescription: e.target.value })}
                  className="min-h-[110px] rounded-[12px] text-right"
                />
              </div>
            </div>

            <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="text-right">
                  <h3 className="text-base font-bold text-slate-900">شعار المنصة (اللوجو)</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    هذا الشعار سيظهر في جميع صفحات المنصة. يُفضل استخدام صورة PNG بخلفية شفافة.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[12px] border border-slate-200 bg-white p-1 shadow-sm">
                    {generalSettings.siteLogo ? (
                      <img
                        src={getFileUrl(generalSettings.siteLogo)}
                        alt="شعار المنصة"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-center text-[10px] text-slate-500">الافتراضي</span>
                    )}
                  </div>

                  <label
                    htmlFor="logoUpload"
                    className={`inline-flex h-10 cursor-pointer items-center justify-center rounded-[12px] px-4 text-sm font-medium text-white transition ${
                      uploadingLogo ? "cursor-not-allowed bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {uploadingLogo ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                    رفع شعار جديد
                    <input id="logoUpload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                  </label>

                  <Button
                    variant="outline"
                    onClick={handleRemoveLogo}
                    disabled={uploadingLogo}
                    className="h-10 rounded-[12px] border-slate-300 px-4"
                  >
                    الافتراضي
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center justify-end gap-3">
                <Switch
                  id="maintenanceMode"
                  checked={generalSettings.maintenanceMode === "true"}
                  onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, maintenanceMode: String(checked) })}
                />
                <Label htmlFor="maintenanceMode" className="font-bold text-base text-slate-800">
                  وضع الصيانة
                </Label>
              </div>

              {generalSettings.maintenanceMode === "true" && (
                <div className="mt-5 space-y-5 border-t border-slate-200 pt-5">
                  <div className="space-y-2 text-right">
                    <Label htmlFor="maintenanceMessage" className="block text-right font-medium text-slate-700">
                      رسالة الصيانة
                    </Label>
                    <Textarea
                      id="maintenanceMessage"
                      placeholder="المنصة تحت الصيانة حالياً، يرجى المحاولة لاحقاً."
                      value={generalSettings.maintenanceMessage}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, maintenanceMessage: e.target.value })}
                      rows={2}
                      className="rounded-[12px] text-right"
                    />
                  </div>

                  <div className="space-y-2 text-right">
                    <Label htmlFor="maintenanceEndTime" className="block text-right font-medium text-slate-700">
                      وقت الانتهاء المتوقع (اختياري)
                    </Label>
                    <Input
                      id="maintenanceEndTime"
                      placeholder="مثال: غداً الساعة 8 صباحاً"
                      value={generalSettings.maintenanceEndTime}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, maintenanceEndTime: e.target.value })}
                      className="h-11 rounded-[12px] text-right"
                    />
                  </div>

                  <div className="flex items-start justify-end gap-3 pt-1">
                    <div className="text-right">
                      <Label htmlFor="maintenanceHardMode" className="block text-right font-medium text-slate-800">
                        إنهاء الجلسات النشطة فوراً (Hard Mode)
                      </Label>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        سيتم تسجيل خروج جميع الطلاب والمدربين إجبارياً فور الحفظ.
                      </p>
                    </div>
                    <Switch
                      id="maintenanceHardMode"
                      checked={generalSettings.maintenanceHardMode}
                      onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, maintenanceHardMode: checked })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveGeneral} disabled={savingGeneral} className="h-11 rounded-[12px] px-5">
                {savingGeneral ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
                {savingGeneral ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <SectionCard title="إعدادات البريد الإلكتروني" icon={<Mail className="h-5 w-5" />}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-2 text-right">
                <Label htmlFor="fromName" className="block text-right font-medium text-slate-700">
                  اسم المرسل
                </Label>
                <Input
                  id="fromName"
                  value={emailSettings.fromName}
                  onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                  className="h-11 rounded-[12px] text-right"
                />
              </div>

              <div className="space-y-2 text-right">
                <Label htmlFor="fromEmail" className="block text-right font-medium text-slate-700">
                  بريد المرسل
                </Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={emailSettings.fromEmail}
                  onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                  className="h-11 rounded-[12px] text-right"
                />
              </div>

              <div className="space-y-2 text-right">
                <Label htmlFor="smtpHost" className="block text-right font-medium text-slate-700">
                  SMTP Host
                </Label>
                <Input
                  id="smtpHost"
                  value={emailSettings.smtpHost}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="h-11 rounded-[12px] text-right"
                />
              </div>

              <div className="space-y-2 text-right">
                <Label htmlFor="smtpPort" className="block text-right font-medium text-slate-700">
                  SMTP Port
                </Label>
                <Input
                  id="smtpPort"
                  value={emailSettings.smtpPort}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: e.target.value })}
                  className="h-11 rounded-[12px] text-right"
                />
              </div>

              <div className="space-y-2 text-right">
                <Label htmlFor="smtpUser" className="block text-right font-medium text-slate-700">
                  SMTP User
                </Label>
                <Input
                  id="smtpUser"
                  value={emailSettings.smtpUser}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                  className="h-11 rounded-[12px] text-right"
                />
              </div>

              <div className="space-y-2 text-right">
                <Label htmlFor="smtpPassword" className="block text-right font-medium text-slate-700">
                  SMTP Password
                </Label>
                <div className="relative">
                  <Input
                    id="smtpPassword"
                    type={showPassword ? "text" : "password"}
                    value={emailSettings.smtpPassword}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
                    placeholder="اتركه فارغاً للإبقاء على الحالي"
                    className="h-11 rounded-[12px] pl-10 text-right"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => handleSave("email", emailSettings, setSavingEmail)}
                disabled={savingEmail}
                className="h-11 rounded-[12px] px-5"
              >
                {savingEmail ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
                {savingEmail ? "جارٍ الحفظ..." : "حفظ إعدادات البريد"}
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="legal" className="space-y-6">
          <div className="space-y-5">
            <SectionCard title="الشروط والأحكام" icon={<FileText className="h-5 w-5" />}>
              <div className="space-y-2 text-right">
                <Label htmlFor="termsContent" className="block text-right font-medium text-slate-700">
                  محتوى الشروط والأحكام
                </Label>
                <p className="text-xs leading-6 text-slate-500">
                  استخدم <code>##</code> قبل النص لجعله عنواناً رئيسياً. استخدم <code>-</code> قبل الأسطر لإنشاء قائمة نقطية.
                </p>
                <Textarea
                  id="termsContent"
                  rows={16}
                  value={legalSettings.termsContent}
                  onChange={(e) => setLegalSettings({ ...legalSettings, termsContent: e.target.value })}
                  placeholder="اكتب محتوى الشروط والأحكام هنا..."
                  className="min-h-[320px] rounded-[12px] text-right font-mono text-sm leading-7"
                />
              </div>
            </SectionCard>

            <SectionCard title="سياسة الخصوصية" icon={<FileText className="h-5 w-5" />}>
              <div className="space-y-2 text-right">
                <Label htmlFor="privacyContent" className="block text-right font-medium text-slate-700">
                  محتوى سياسة الخصوصية
                </Label>
                <p className="text-xs leading-6 text-slate-500">
                  استخدم <code>##</code> قبل النص لجعله عنواناً رئيسياً. استخدم <code>-</code> قبل الأسطر لإنشاء قائمة نقطية.
                </p>
                <Textarea
                  id="privacyContent"
                  rows={16}
                  value={legalSettings.privacyContent}
                  onChange={(e) => setLegalSettings({ ...legalSettings, privacyContent: e.target.value })}
                  placeholder="اكتب محتوى سياسة الخصوصية هنا..."
                  className="min-h-[320px] rounded-[12px] text-right font-mono text-sm leading-7"
                />
              </div>
            </SectionCard>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  const today = new Date().toLocaleDateString("ar-EG-u-nu-latn", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                  const updatedSettings = {
                    ...legalSettings,
                    termsUpdatedAt: today,
                    privacyUpdatedAt: today,
                  }
                  setLegalSettings(updatedSettings)
                  handleSave("legal", updatedSettings, setSavingLegal)
                }}
                disabled={savingLegal}
                className="h-11 rounded-[12px] px-5"
              >
                {savingLegal ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
                {savingLegal ? "جارٍ الحفظ..." : "حفظ المحتوى القانوني"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

