"use client"

import Link from "next/link"
import Image from "next/image"
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getFileUrl } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { PLATFORM_NAME } from "@/lib/brand"
import { usePlatform } from "@/contexts/platform-context"

export function Footer() {
  const { settings } = usePlatform()
  const siteName = settings?.general.siteName || PLATFORM_NAME
  const siteDesc =
    settings?.general.siteDescription ||
    "منصتك الأولى للتعلم الإلكتروني وتطوير المهارات. نجمع بين أفضل الخبراء وأحدث التقنيات لنقدم تجربة تعليمية مميزة."
  const email = settings?.general.contactEmail || "info@coursebooking.com"
  const phone = settings?.general.supportPhone || "+966 50 000 0000"
  return (
    <footer className="bg-gray-900 text-gray-300 pt-16 pb-8 border-t border-gray-800" dir="rtl">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          {/* Brand Column */}
          <div className="flex flex-col items-start text-right">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative w-12 h-12">
                <Image
                  src={getFileUrl(settings?.general?.siteLogo) || "/images/logo.png"}
                  alt={siteName}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <span className="font-extrabold text-2xl text-white">{siteName}</span>
            </div>
            <p className="mb-4 max-w-sm text-sm leading-7 text-gray-400">{siteDesc}</p>
            <div className="mt-2 mb-6">
              <Link href="/about" className="inline-block text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                من نحن
              </Link>
            </div>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6">تواصل معنا</h3>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <a href={`mailto:${email}`} className="cursor-pointer hover:text-white transition-colors">
                  {email}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <a
                  href={`https://wa.me/${phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer hover:text-white transition-colors"
                  dir="ltr"
                >
                  {phone}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <p>© {new Date().getFullYear()} {siteName}. جميع الحقوق محفوظة.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-white transition-colors">
              الشروط والأحكام
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              سياسة الخصوصية
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
