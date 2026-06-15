"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, MapPin, Users, BookOpen, Star, Building2, ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"
import { Navbar } from "@/components/layout/navbar"
import { instituteService } from "@/lib/institute-service"
import { getFileUrl } from "@/lib/utils"

type PublicInstitute = {
    id: string
    name?: string
    description?: string
    logo?: string | null
    coverImage?: string | null
    location?: string | null
    locationUrl?: string | null
    categories?: string[]
    studentsCount?: number
    coursesCount?: number
    verificationStatus?: string
    status?: string
}

export default function InstitutesPage() {
    const [searchQuery, setSearchQuery] = useState("")
    const [institutes, setInstitutes] = useState<PublicInstitute[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchInstitutes = async () => {
            try {
                const data = await instituteService.getPublicInstitutes()
                setInstitutes(data)
            } catch (error) {
                console.error("Failed to fetch institutes:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchInstitutes()
    }, [])

    const filteredInstitutes = institutes.filter(institute =>
        institute.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        institute.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-gray-50" dir="rtl">
            <Navbar />

            <main className="container mx-auto max-w-7xl px-4 py-8">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">المعاهد المعتمدة</h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        تصفح أفضل المعاهد والمراكز التدريبية المعتمدة لدينا، واختر المكان الأنسب لبدء رحلتك التعليمية.
                    </p>
                </div>

                {/* Search Section */}
                <div className="max-w-2xl mx-auto mb-12 relative">
                    <div className="relative">
                        <Search className="absolute right-4 top-3.5 h-5 w-5 text-gray-400" />
                        <Input
                            placeholder="ابحث عن معهد..."
                            className="pr-12 h-12 text-lg shadow-sm border-gray-200 focus:border-primary focus:ring-primary rounded-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Institutes Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3].map((n) => (
                            <Card key={n} className="overflow-hidden border-gray-100 flex flex-col h-[400px] animate-pulse">
                                <div className="h-32 bg-gray-200"></div>
                                <div className="mt-12 px-6 flex-1 space-y-4">
                                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                    <div className="space-y-2 mt-4">
                                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                                        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredInstitutes.length > 0 ? (
                            filteredInstitutes.map((institute) => (
                                <Card key={institute.id} className="group overflow-hidden border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                                    {/* Cover Image */}
                                    <div className="h-32 bg-gray-100 relative overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={institute.logo ? getFileUrl(institute.logo) : institute.coverImage || undefined}
                                            alt={institute.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    </div>

                                    <CardHeader className="relative pt-6 pb-4 px-6">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                                                {institute.name}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                                            <MapPin className="h-3.5 w-3.5" />
                                            {institute.location}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="px-6 flex-1">
                                        <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2">
                                            {institute.description}
                                        </p>

                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {(institute.categories || []).slice(0, 3).map((cat: string) => (
                                                <Badge key={cat} variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 font-normal">
                                                    {cat}
                                                </Badge>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 py-3 border-t border-gray-50">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Users className="h-4 w-4 text-primary/70" />
                                                <span>{institute.studentsCount} طالب</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <BookOpen className="h-4 w-4 text-primary/70" />
                                                <span>{institute.coursesCount} دورة</span>
                                            </div>
                                        </div>
                                    </CardContent>

                                    <CardFooter className="px-6 pb-6 pt-0">
                                        <Button className="w-full bg-gray-900 hover:bg-primary text-white transition-colors" asChild>
                                            <Link href={`/institutes/${institute.id}`}>
                                                عرض التفاصيل
                                                <ArrowLeft className="mr-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-12">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد نتائج</h3>
                                <p className="text-gray-500">
                                    {searchQuery ? "جرب البحث بكلمات مختلفة" : "لا توجد معاهد مقبولة حالياً."}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}
