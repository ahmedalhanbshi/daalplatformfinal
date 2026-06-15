"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
export const dynamic = "force-dynamic"
import { MapPin, Users, Wifi, Projector, Monitor, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { HallImage } from "@/components/halls/HallImage"
import { trainerService } from "@/lib/trainer-service"

const hallTypes = ["الكل", "قاعة محاضرات", "قاعة اجتماعات", "معمل", "ورشة عمل"]
const capacityOptions = ["كل السعات", "حتى 20", "21 - 40", "41 - 60", "أكثر من 60"]
const locationOptions = ["كل المواقع", "الدور الأرضي", "الدور الأول", "الدور الثاني", "الجناح الشرقي", "الجناح الغربي"]

type TrainerHallsPageProps = {
  hideTitle?: boolean
  basePath?: string
  actionLabel?: string
  onSelectHall?: (hallId: string) => void
  hallsData?: RawHall[]
  stickyHeader?: boolean
}

type RawHall = {
  id: string
  name: string
  type?: string | null
  location?: string | null
  capacity?: number | null
  pricePerHour?: number | string | null
  image?: string | null
  facilities?: string[] | null
  description?: string | null
}

type HallView = {
  id: string
  name: string
  type: string
  location: string
  capacity: number
  hourlyRate: number
  image?: string | null
  features: string[]
  description: string
}

function normalizeText(value?: string | null, fallback = "") {
  const text = (value || "").replace(/\uFFFD/g, "").trim()
  return text || fallback
}

function normalizeHall(raw: RawHall): HallView {
  return {
    id: raw.id,
    name: normalizeText(raw.name, "قاعة بدون اسم"),
    type: normalizeText(raw.type, "قاعة محاضرات"),
    location: normalizeText(raw.location, "غير محدد"),
    capacity: Number(raw.capacity || 0),
    hourlyRate: Number(raw.pricePerHour || 0),
    image: raw.image,
    features: Array.isArray(raw.facilities) ? raw.facilities : [],
    description: normalizeText(raw.description, "لا يوجد وصف"),
  }
}

function parseCapacityRange(option: string) {
  if (option === "حتى 20") return { min: 0, max: 20 }
  if (option === "21 - 40") return { min: 21, max: 40 }
  if (option === "41 - 60") return { min: 41, max: 60 }
  if (option === "أكثر من 60") return { min: 61, max: Infinity }
  return null
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11 min-w-[150px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function TrainerHallsPageContent({
  hideTitle = true,
  basePath = "/trainer/halls",
  actionLabel = "عرض التفاصيل",
  onSelectHall,
  hallsData,
  stickyHeader = false,
}: TrainerHallsPageProps) {
  const searchParams = useSearchParams()
  const query = (searchParams.get("q") || "").trim().toLowerCase()
  const isSelectMode = searchParams.get("mode") === "select"
  const effectiveActionLabel = isSelectMode ? "اختيار القاعة" : actionLabel

  const [selectedType, setSelectedType] = useState("الكل")
  const [selectedCapacity, setSelectedCapacity] = useState("كل السعات")
  const [selectedLocation, setSelectedLocation] = useState("كل المواقع")

  const [dbHalls, setDbHalls] = useState<HallView[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (hallsData) {
      setDbHalls(hallsData.map(normalizeHall))
      return
    }

    let cancelled = false
    const fetchHalls = async () => {
      try {
        setLoading(true)
        const responseData = await trainerService.getHalls()
        if (!cancelled) {
          const mapped = (responseData as RawHall[]).map(normalizeHall)
          setDbHalls(mapped)
        }
      } catch (error) {
        console.error("Failed to fetch halls", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchHalls()
    return () => {
      cancelled = true
    }
  }, [hallsData])

  const sourceHalls = hallsData ? hallsData.map(normalizeHall) : dbHalls

  const filteredHalls = useMemo(() => {
    return sourceHalls.filter((hall) => {
      const matchesSearch =
        !query || hall.name.toLowerCase().includes(query) || hall.description.toLowerCase().includes(query)

      const matchesType = selectedType === "الكل" || hall.type === selectedType
      const matchesLocation = selectedLocation === "كل المواقع" || hall.location.includes(selectedLocation)

      const range = parseCapacityRange(selectedCapacity)
      const matchesCapacity = !range || (hall.capacity >= range.min && hall.capacity <= range.max)

      return matchesSearch && matchesType && matchesLocation && matchesCapacity
    })
  }, [query, selectedType, selectedLocation, selectedCapacity, sourceHalls])

  const handleSelectHall = (hall: HallView) => {
    if (isSelectMode) {
      if (typeof window === "undefined") return
      const message = {
        type: "hall-selected",
        payload: {
          id: hall.id,
          name: hall.name,
          type: hall.type,
          location: hall.location,
          capacity: hall.capacity,
          hourlyRate: hall.hourlyRate,
          image: hall.image,
          description: hall.description,
        },
      }
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(message, window.location.origin)
      }
      window.close()
      return
    }

    if (onSelectHall) onSelectHall(hall.id)
  }

  const usesSelectButton = isSelectMode || Boolean(onSelectHall)

  if (loading && !hallsData) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <section dir="rtl" className="w-full text-right">
      {!hideTitle ? <div className="sr-only">دليل القاعات</div> : null}

      <div className="mx-auto -mt-3 w-full max-w-[1500px] space-y-3 pt-0 md:-mt-4 md:pt-0">
        <div className="rounded-3xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_4px_14px_rgba(15,23,42,0.035)] md:px-4 md:py-2.5">
          <div
            className={`flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between ${
              stickyHeader ? "sticky top-0 z-20 bg-white/95 pt-1 backdrop-blur-sm" : ""
            }`}
          >
            <div className="flex flex-nowrap items-center gap-2.5 overflow-x-auto lg:overflow-visible">
              <FilterSelect value={selectedType} onChange={setSelectedType} options={hallTypes} />
              <FilterSelect value={selectedCapacity} onChange={setSelectedCapacity} options={capacityOptions} />
              <FilterSelect value={selectedLocation} onChange={setSelectedLocation} options={locationOptions} />
            </div>
            <p className="px-1 text-sm font-semibold text-slate-500 lg:whitespace-nowrap">
              تم العثور على {filteredHalls.length} قاعة
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredHalls.map((hall) => (
            <article
              key={hall.id}
              className="group flex h-full min-h-[390px] flex-col overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-slate-200/90 hover:shadow-[0_18px_36px_rgba(37,99,235,0.16)]"
            >
              <div className="relative h-[188px] overflow-hidden bg-slate-100 md:h-[196px]">
                <HallImage src={hall.image} alt={hall.name} />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/25 via-slate-900/10 to-transparent transition-opacity duration-300 group-hover:opacity-90" />
                <span className="absolute right-3 top-3 rounded-full bg-white/86 px-2.5 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-[2px]">
                  {hall.type}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-3.5 text-right">
                <div className="space-y-1">
                  <h3 className="line-clamp-2 text-[17px] font-extrabold leading-6 text-slate-900">{hall.name}</h3>
                  <p className="line-clamp-2 text-[12px] leading-5 text-slate-600">{hall.description}</p>
                </div>

                <div className="mt-2.5 space-y-2 text-[12px] font-medium text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-500" />
                    <span>السعة: {hall.capacity} شخص</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    <span>{hall.location}</span>
                  </div>
                </div>

                <div className="mt-2.5 flex min-h-[26px] flex-wrap items-center gap-1 text-[10px] text-slate-600">
                  {hall.features.slice(0, 2).map((feature) => {
                    const icon =
                      feature === "wifi" ? <Wifi className="h-3.5 w-3.5" /> :
                      feature === "projector" ? <Projector className="h-3.5 w-3.5" /> :
                      <Monitor className="h-3.5 w-3.5" />

                    const label =
                      feature === "wifi" ? "إنترنت" :
                      feature === "projector" ? "بروجكتر" :
                      feature === "screen" ? "شاشة" :
                      feature === "computers" ? "أجهزة" : feature

                    return (
                      <span key={feature} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                        {icon}
                        {label}
                      </span>
                    )
                  })}
                  {hall.features.length > 2 && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                      +{hall.features.length - 2}
                    </span>
                  )}
                </div>

                <div className="mt-auto pt-2.5">
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-1 pt-3">
                    <Button
                      asChild={!usesSelectButton}
                      type={usesSelectButton ? "button" : undefined}
                      onClick={usesSelectButton ? () => handleSelectHall(hall) : undefined}
                      className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md bg-[#2563EB] px-4 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                    >
                      {usesSelectButton ? (
                        effectiveActionLabel
                      ) : (
                        <Link href={`${basePath}/${hall.id}`}>{effectiveActionLabel}</Link>
                      )}
                    </Button>
                    <p className="whitespace-nowrap text-[20px] font-extrabold leading-none tracking-tight text-[#2563EB]">
                      {new Intl.NumberFormat("en-US").format(hall.hourlyRate)}{" "}
                      <span className="text-xs font-bold text-blue-500">ر.ي/ساعة</span>
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredHalls.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
            لا توجد قاعات مطابقة لخيارات الفلترة الحالية.
          </div>
        )}
      </div>
    </section>
  )
}

export default function TrainerHallsPage(props: TrainerHallsPageProps) {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center">جاري التحميل...</div>}>
      <TrainerHallsPageContent {...props} />
    </Suspense>
  )
}
