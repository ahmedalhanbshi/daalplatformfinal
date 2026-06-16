"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useEffect, useState } from "react"
import Image from "next/image"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MapPin, ImageIcon, Loader2, Users, X } from "lucide-react"
import { toast } from "sonner"
import { trainerService } from "@/lib/trainer-service"
import { getFileUrl } from "@/lib/utils"

function resolveImage(src: string | null | undefined): string {
  if (!src) return "/images/course-web.png"
  return getFileUrl(src) || "/images/course-web.png"
}

export interface HallDetailsModalProps {
  isOpen: boolean
  onClose: (isOpen: boolean) => void
  hallId: string | null
}

export function HallDetailsModal({ isOpen, onClose, hallId }: HallDetailsModalProps) {
  const [hallData, setHallData] = useState<any>(null)
  const [isLoadingHall, setIsLoadingHall] = useState(false)
  const [hallImageError, setHallImageError] = useState(false)

  useEffect(() => {
    if (isOpen && hallId) {
      const fetchHall = async () => {
        try {
          setIsLoadingHall(true)
          setHallImageError(false)
          setHallData(null)
          // Using trainerService because it is used for public exploration as well
          const data = await trainerService.getHallById(hallId)
          setHallData(data)
        } catch (err: any) {
          toast.error(err.message || "فش�„ تحميل بيانات القاعة")
          onClose(false)
        } finally {
          setIsLoadingHall(false)
        }
      }
      fetchHall()
    } else if (!isOpen) {
      setHallData(null)
    }
  }, [isOpen, hallId, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md overflow-hidden rounded-[12px] p-0 shadow-2xl [&>button[data-dialog-close='default']]:hidden" dir="rtl">
        <DialogHeader className="sr-only">
          <DialogTitle>معلومات القاعة التدريبية</DialogTitle>
        </DialogHeader>

        {isLoadingHall && (
          <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>جاري تحميل بيانات القاعة...</span>
          </div>
        )}

        {hallData && !isLoadingHall && (
          <div className="flex flex-col text-right" dir="rtl">
            <div className="relative h-48 w-full bg-slate-100">
              {hallData.image && !hallImageError ? (
                <Image src={resolveImage(hallData.image)} alt={hallData.name} fill className="object-cover" unoptimized onError={() => setHallImageError(true)} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300">
                  <ImageIcon className="h-12 w-12" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 right-4 text-white"><h3 className="mb-0 text-xl font-bold">{hallData.name}</h3></div>
              <DialogClose className="absolute left-4 top-4 rounded-full bg-black/20 p-2 text-white transition-colors hover:bg-black/40"><X className="h-4 w-4" /></DialogClose>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="mb-1 text-[10px] text-slate-500">نوع القاعة</p><p className="text-sm font-bold text-slate-900">{hallData.type || "-"}</p></div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="mb-1 text-[10px] text-slate-500">السعة الاستيعابية</p><p className="text-sm font-bold text-slate-900">{hallData.capacity} مقعد</p></div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3"><div className="rounded-lg bg-blue-50 p-2 text-blue-600"><MapPin className="h-4 w-4" /></div><div><p className="mb-0.5 text-[10px] text-slate-500">الموقع</p><p className="text-sm leading-relaxed text-slate-700">{hallData.location || "الموقع غير محدد بدقة"}</p></div></div>
                {hallData.instituteName && <div className="flex items-start gap-3"><div className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><Users className="h-4 w-4" /></div><div className="flex flex-col"><p className="mb-0.5 text-[10px] text-slate-500">الجهة المالكة</p><p className="text-sm font-bold text-slate-900">{hallData.instituteName}</p></div></div>}
                {hallData.description && <p className="text-xs leading-relaxed text-slate-500">{hallData.description}</p>}
              </div>

              <div className="flex gap-3 pt-2 text-right" dir="rtl">
                {hallData.locationUrl && (
                  <Button variant="outline" className="h-11 rounded-full border-slate-200" asChild>
                    <a href={hallData.locationUrl} target="_blank" rel="noopener noreferrer">خرائط جوجل</a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

