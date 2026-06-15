"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, Lock, User, Moon, Shield } from "lucide-react"

export default function TrainerSettingsPage() {
  const [loading, setLoading] = useState(false)

  const handleSave = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          إعدادات المدرب
        </h1>
        <p className="text-muted-foreground mt-2">
          تحكم في إعدادات حسابك وتفضيلاتك الشخصية
        </p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-[600px] h-12">
          <TabsTrigger value="account" className="gap-2">
            <User className="h-4 w-4" />
            الحساب
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            الإشعارات
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Moon className="h-4 w-4" />
            المظهر
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2">
            <Shield className="h-4 w-4" />
            الخصوصية
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>معلومات الحساب</CardTitle>
              <CardDescription>قم بتحديث معلومات الاتصال والبيانات الشخصية الخاصة بك</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input defaultValue="فاطمة علي" />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input defaultValue="fatima@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>المسمى الوظيفي</Label>
                  <Input defaultValue="مدربة تطوير ويب" />
                </div>
                <div className="space-y-2">
                  <Label>نبذة تعريفية</Label>
                  <Input defaultValue="خبيرة في تطوير الواجهات..." />
                </div>
              </div>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Other tabs similar to student but adapted if needed */}
         <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>تفضيلات الإشعارات</CardTitle>
              <CardDescription>تحكم في الإشعارات التي تود استلامها</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="student-messages" className="flex flex-col space-y-1">
                  <span>رسائل الطلاب</span>
                  <span className="font-normal text-xs text-muted-foreground">تلقي إشعارات عند استلام رسائل جديدة من الطلاب</span>
                </Label>
                <Switch id="student-messages" defaultChecked />
              </div>
              <Button onClick={handleSave} disabled={loading}>
                حفظ التفضيلات
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Simplified for demo */}
      </Tabs>
    </div>
  )
}
