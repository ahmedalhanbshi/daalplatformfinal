"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useEffect, useMemo, useState } from "react"
import { Search, MapPin, Users, Info, Building2, Loader2, ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { cn, getFileUrl } from "@/lib/utils"
// For the trainer section, we can use the generic apiClient or trainerService.
// Using trainerService since we verified its getHalls is unrestricted.
import { trainerService } from "@/lib/trainer-service"
import { useRouter } from "next/navigation"

const hallTypes = [
    "الكل",
    "قاعة محاضرات",
    "قاعة اجتماعات",
    "معمل",
    "ورشة عمل"
]

export default function GenericExploreHalls({
    hideTitle,
    basePath = "/trainer/halls",
    actionLabel = "ا�„تفاص�Š�„",
    onSelectHall,
    hallsData
}: {
    hideTitle?: boolean;
    basePath?: string;
    actionLabel?: string;
    onSelectHall?: (id: string) => void;
    hallsData?: any[];
}) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedType, setSelectedType] = useState("الكل")
    const [dbHalls, setDbHalls] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (hallsData) return

        const fetchHalls = async () => {
            try {
                setLoading(true)
                const responseData = await trainerService.getHalls()
                const mapped = responseData.map((h: any) => ({
                    id: h.id,
                    name: h.name,
                    type: h.type || "قاعة",
                    location: h.location || "مقر المعهد",
                    capacity: h.capacity,
                    hourlyRate: Number(h.pricePerHour || 0),
                    image: h.image,
                    features: h.facilities || [],
                    description: h.description || "",
                    owner: h.institute?.name || "معهد غير �…عر�ˆف"
                }))
                setDbHalls(mapped)
            } catch (e) {
                console.error("Failed to fetch halls", e)
            } finally {
                setLoading(false)
            }
        }
        fetchHalls()
    }, [hallsData])

    const sourceHalls = hallsData ?? dbHalls

    const filteredHalls = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()

        return sourceHalls.filter((hall) => {
            const matchesSearch =
                query.length === 0 ||
                hall.name.toLowerCase().includes(query) ||
                hall.location?.toLowerCase().includes(query)

            const matchesType =
                selectedType === "الكل" || hall.type === selectedType

            return matchesSearch && matchesType
        })
    }, [searchQuery, selectedType, sourceHalls])

    const handleSelectHall = (id: string) => {
        if (onSelectHall) {
            onSelectHall(id)
        } else {
            router.push(`${basePath}/${id}`)
        }
    }

    return (
        <div className="space-y-6" dir="rtl">
            {!hideTitle && (
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 border-b pb-4">
                        است�ƒشاف القاعات
                    </h1>
                    <p className="mt-2 text-gray-500">
                        تصفح القاعات المتاحة ف�Š المعاهد واحجز ما يناسبك
                    </p>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        placeholder="ابحث عن قاعة..."
                        className="pl-4 pr-10 h-12 w-full text-right"
                        dir="rtl"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select
                    value={selectedType}
                    onValueChange={setSelectedType}
                >
                    <SelectTrigger className="w-full sm:w-[200px] h-12" dir="rtl">
                        <SelectValue placeholder="نوع القاعة" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                        {hallTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
                    <p className="text-gray-500 font-medium">جاري تحميل القاعات...</p>
                </div>
            ) : filteredHalls.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                    <Building2 className="h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد قاعات</h3>
                    <p className="text-gray-500 max-w-sm">
                        لم نتمكن من العثور على قاعات مطابقة للبحث أو لا توجد قاعات متاحة حالياً.
                    </p>
                    {(searchQuery || selectedType !== "الكل") && (
                        <Button
                            variant="link"
                            className="mt-4 text-blue-600 font-medium"
                            onClick={() => {
                                setSearchQuery("")
                                setSelectedType("الكل")
                            }}
                        >
                            مسح ا�„ف�„اتر
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredHalls.map((hall) => (
                        <div
                            key={hall.id}
                            className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-black/[0.03] transition-all duration-300 hover:-translate-y-1 flex flex-col"
                        >
                            {/* Image */}
                            <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
                                {hall.image ? (
                                    <img
                                        src={getFileUrl(hall.image) || ""}
                                        alt={hall.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                                        <Building2 className="h-12 w-12 mb-2 opacity-20" />
                                        <span className="text-sm font-medium">لا توجد صورة</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <Badge className="absolute top-4 right-4 bg-white/90 text-gray-900 border-none shadow-sm backdrop-blur-sm pointer-events-none">
                                    {hall.type}
                                </Badge>
                            </div>

                            {/* Content */}
                            <div className="p-5 flex flex-col flex-1">
                                <div className="mb-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-xl font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                            {hall.name}
                                        </h3>
                                    </div>
                                    <div className="flex flex-col gap-2 text-gray-500 text-sm font-medium">
                                        <div className="flex items-start gap-1.5">
                                            <Building2 className="h-4 w-4 shrink-0 mt-0.5" />
                                            <span className="line-clamp-2 leading-tight">{hall.owner}</span>
                                        </div>
                                        <div className="flex items-start gap-1.5">
                                            <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                                            <span className="line-clamp-2 leading-tight">{hall.location}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100/50">
                                        <div className="h-8 w-8 rounded-lg bg-blue-100/50 flex items-center justify-center text-blue-600 shrink-0">
                                            <Users className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">السعة</p>
                                            <p className="text-sm font-bold text-gray-900">{hall.capacity} شخص</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100/50">
                                        <div className="h-8 w-8 rounded-lg bg-green-100/50 flex items-center justify-center text-green-600 shrink-0">
                                            <Info className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">السعر</p>
                                            <p className="text-sm font-bold text-green-700">{hall.hourlyRate} <span className="text-xs font-medium text-green-600/70">ر.س/س</span></p>
                                        </div>
                                    </div>
                                </div>

                                {/* Features */}
                                {hall.features && hall.features.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-6">
                                        {hall.features.slice(0, 3).map((f: string, i: number) => (
                                            <Badge key={i} variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 border-none font-medium">
                                                {f === "wifi" ? "إنترنت" : f === "projector" ? "عرض" : f === "screen" ? "شاشة" : f}
                                            </Badge>
                                        ))}
                                        {hall.features.length > 3 && (
                                            <Badge variant="secondary" className="bg-gray-50 text-gray-500 border-none font-medium">
                                                +{hall.features.length - 3}
                                            </Badge>
                                        )}
                                    </div>
                                )}

                                <div className="mt-auto pt-4 border-t border-gray-100">
                                    <Button
                                        className="w-full bg-white hover:bg-gray-50 text-blue-600 border border-blue-100 shadow-sm transition-all group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600"
                                        onClick={() => handleSelectHall(hall.id)}
                                    >
                                        {actionLabel}
                                        <ArrowRight className="w-4 h-4 mr-2 rtl:hidden" />
                                        <ArrowRight className="w-4 h-4 ml-2 ltr:hidden transform rotate-180" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

