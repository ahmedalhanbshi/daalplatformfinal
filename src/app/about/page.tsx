"use client"

import { usePlatform } from "@/contexts/platform-context"
import { PLATFORM_NAME } from "@/lib/brand"
import { Card, CardContent } from "@/components/ui/card"
import { Info, Sparkles } from "lucide-react"
import { Footer } from "@/components/layout/footer"

export default function AboutPage() {
  const { settings } = usePlatform()
  const siteName = settings?.general.siteName || PLATFORM_NAME
  const siteDesc = settings?.general.siteDescription || "منصة تعليمية عربية لإدارة الدورات والتسجيل والمتابعة بكل سهولة."

  return (
    <>
      <div className="min-h-screen bg-slate-50 py-16" dir="rtl">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-10 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-6 shadow-sm">
              <Sparkles className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              عن {siteName}
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              تعرف أكثر على رؤيتنا وأهدافنا والخدمات التي نقدمها
            </p>
          </div>

          <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
            <div className="h-2 w-full bg-gradient-to-l from-blue-600 via-indigo-500 to-cyan-400" />
            <CardContent className="p-8 md:p-12">
              <div className="flex items-center gap-3 mb-6">
                <Info className="h-6 w-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-slate-900">من نحن</h2>
              </div>
              <div className="prose prose-slate prose-lg max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-p:leading-relaxed prose-a:text-blue-600 hover:prose-a:text-blue-700">
                <p className="whitespace-pre-wrap text-lg leading-loose text-slate-700">
                  {siteDesc}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  )
}
