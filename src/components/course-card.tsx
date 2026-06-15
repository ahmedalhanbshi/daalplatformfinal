"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState, type MouseEvent, type ReactNode } from "react"
import { Users, Clock, CalendarDays, ArrowRight, Heart, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"
import { studentService } from "@/lib/student-service"

const FAVORITES_KEY = "courseFavorites"

export interface CourseCardProps {
    id: string
    title: string
    description: string
    price: number
    studentsCount: number
    duration: string
    level?: string
    image: string
    instructor: {
        name: string
        avatar: string
    }
    instructors?: { name: string; avatar?: string }[] // multi-trainer support
    category: string
    basePath?: string
    isFavorite?: boolean
    imageVariant?: "default" | "browse"
    actionButton?: React.ReactNode;
    extraContent?: ReactNode
    secondaryAction?: ReactNode
    primaryLabel?: string
    primaryHref?: string
    hideStats?: boolean
    hidePrice?: boolean
    fullWidthButton?: boolean
    hideButtonArrow?: boolean
    hideFavoriteButton?: boolean
    disableImageZoom?: boolean
    disableHoverEffects?: boolean
    categoryPlacement?: "image" | "content"
    imageLeftBadge?: ReactNode
    cardClassName?: string
    secondaryActionPosition?: "before" | "after"
    categoryImagePosition?: "top-right" | "bottom-right"
    hideInstructorSection?: boolean
    courseStatus?: string
    roomId?: string | null;
    roomName?: string | null;
    onRoomClick?: () => void;
}

export function CourseCard({
    id,
    title,
    description,
    price,
    studentsCount,
    duration,
    level,
    image,
    instructor,
    instructors,
    category,
    basePath = "/courses",
    isFavorite: initialIsFavorite = false,
    imageVariant = "default",
    actionButton,
    extraContent,
    secondaryAction,
    primaryLabel = "عرض التفاصيل",
    primaryHref,
    hideStats = false,
    hidePrice = false,
    fullWidthButton = false,
    hideButtonArrow = false,
    hideFavoriteButton = false,
    disableImageZoom = false,
    disableHoverEffects = false,
    categoryPlacement = "image",
    imageLeftBadge,
    cardClassName = "",
    secondaryActionPosition = "before",
    categoryImagePosition = "bottom-right",
    hideInstructorSection = false,
    courseStatus,
    roomName,
    onRoomClick,
}: CourseCardProps) {
    const { user } = useAuth() ?? {}
    const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
    const [isToggling, setIsToggling] = useState(false)

    useEffect(() => {
        setIsFavorite(initialIsFavorite)
    }, [initialIsFavorite])

    const toggleFavorite = async (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()

        if (!user?.id) {
            toast.error("يرجى تسجيل الدخول لإضافة الدورة إلى قائمة الرغبات")
            return
        }

        if (isToggling) return
        setIsToggling(true)

        try {
            const result = await studentService.toggleWishlist(id)
            setIsFavorite(result.added)
            if (result.added) {
                toast.success("تم إضافة الدورة إلى قائمة الرغبات")
            } else {
                toast.success("تم إزالة الدورة من قائمة الرغبات")
            }
        } catch (error: any) {
            toast.error(error.message || "حدث خطأ أثناء تحديث قائمة الرغبات")
        } finally {
            setIsToggling(false)
        }
    }

    return (
        <Card
            dir="rtl"
            className={`group w-full max-w-[300px] overflow-hidden border-0 bg-white text-right shadow-lg h-full flex flex-col rounded-2xl ${disableHoverEffects ? "" : "transition-all duration-300 hover:shadow-xl"} ${cardClassName}`}
        >
            {/* Image Container */}
            <div
                className={`relative w-full overflow-hidden rounded-2xl ${
                    imageVariant === "browse" ? "h-[188px] md:h-[196px]" : "aspect-square sm:w-[300px] sm:h-[300px]"
                }`}
            >
                <Image
                    src={image}
                    alt={title}
                    fill
                    sizes="(max-width: 768px) 100vw, 300px"
                    className={`h-full w-full object-cover transition-transform duration-500 ${disableImageZoom ? "" : "group-hover:scale-110"}`}
                    unoptimized={true}
                    style={{ display: "block" }}
                />

                {/* Overlay Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent ${disableHoverEffects ? "opacity-0" : "opacity-0 group-hover:opacity-100 transition-opacity duration-300"}`} />

                {/* Category Badge */}
                {categoryPlacement === "image" && (
                    <div className={`absolute z-10 ${categoryImagePosition === "bottom-right" ? "bottom-3 right-3" : "top-3 right-3"}`}>
                        <Badge className="bg-white/90 text-primary hover:bg-white backdrop-blur-sm shadow-sm dark:bg-slate-950/90 dark:text-primary-foreground">
                            {category}
                        </Badge>
                    </div>
                )}

                {/* Course Status Badge */}
                {courseStatus === "PENDING_MINIMUM" ? (
                    <div className="absolute top-3 right-3 z-10">
                        <Badge className="bg-amber-500/95 text-white hover:bg-amber-600 backdrop-blur-sm shadow-sm border border-amber-300/30">
                            بانتظار اكتمال العدد
                        </Badge>
                    </div>
                ) : courseStatus === "ACTIVE" ? (
                    <div className="absolute top-3 right-3 z-10">
                        <Badge className="bg-emerald-500/95 text-white hover:bg-emerald-600 backdrop-blur-sm shadow-sm border border-emerald-300/30">
                            مستمرة
                        </Badge>
                    </div>
                ) : null}

                {imageLeftBadge && (
                    <div className="absolute top-3 left-3 z-10">
                        {imageLeftBadge}
                    </div>
                )}

                {/* Wishlist Button */}
                {!hideFavoriteButton && (
                    <button
                        type="button"
                        aria-label="إضافة إلى المفضلة"
                        aria-pressed={isFavorite}
                        onClick={toggleFavorite}
                        className={`absolute top-4 left-4 z-20 flex h-10 w-10 shrink-0 aspect-square p-0 items-center justify-center rounded-full border-2 border-white/40 bg-white/90 shadow-sm transition-all duration-300 hover:scale-110 active:scale-95 text-red-500`}
                    >
                        <Heart className={`w-5 h-5 transition-transform duration-200 ${isFavorite ? "fill-current text-red-500 scale-110" : ""}`} />
                    </button>
                )}
            </div>

            {/* Content */}
            <CardContent className="p-5 flex-grow flex flex-col gap-3 text-right">
                {!hideStats && (
                    <div className="flex items-center justify-start gap-2 text-xs text-muted-foreground mb-1">
                        <div className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded-md">
                            <CalendarDays className="w-3 h-3" />
                            <span>{duration}</span>
                        </div>
                        <div className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded-md">
                            <Users className="w-3 h-3" />
                            <span>{studentsCount}</span>
                        </div>
                        {roomName && (
                            <div 
                                className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-md cursor-pointer hover:bg-blue-100 transition-colors"
                                onClick={(e) => { 
                                    e.preventDefault(); 
                                    e.stopPropagation(); 
                                    if (onRoomClick) onRoomClick(); 
                                }}
                            >
                                <MapPin className="w-3 h-3" />
                                <span className="font-semibold underline decoration-blue-300 underline-offset-2">{roomName}</span>
                            </div>
                        )}
                    </div>
                )}

                {categoryPlacement === "content" && (
                    <div className="mb-1">
                        <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-100">{category}</Badge>
                    </div>
                )}

                <Link href={primaryHref || `${basePath}/${id}`} className="group-hover:text-primary transition-colors">
                    <h3 className="font-bold text-lg leading-tight line-clamp-2 mb-1">
                        {title}
                    </h3>
                </Link>

                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[42px] mb-2">
                    {description}
                </p>

                {extraContent}

                {!hideInstructorSection && (
                    <div className="flex items-center justify-start gap-2 mt-auto pt-3 border-t border-border/50">
                        {instructors && instructors.length > 1 ? (
                            <div className="flex flex-col gap-2 w-full pt-1">
                                {instructors.slice(0, 2).map((t, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-200 shrink-0">
                                            {t.avatar ? (
                                                <Image src={t.avatar} alt={t.name} fill className="object-cover" unoptimized={true} />
                                            ) : (
                                                <div className="w-full h-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-600">
                                                    {t.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs font-medium text-muted-foreground truncate" title={t.name}>{t.name}</span>
                                    </div>
                                ))}
                                {instructors.length > 2 && (
                                    <span className="text-[10px] font-medium text-slate-500 pr-1">+{instructors.length - 2} مدربين آخرين</span>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="relative w-6 h-6 rounded-full overflow-hidden border border-border">
                                    <Image src={instructor.avatar} alt={instructor.name} fill className="object-cover" unoptimized={true} />
                                </div>
                                <span className="text-xs font-medium text-muted-foreground">{instructor.name}</span>
                            </>
                        )}
                    </div>
                )}
            </CardContent>

            {/* Footer */}
            <CardFooter className={`p-4 pt-0 flex w-full items-center text-right ${fullWidthButton ? "justify-center" : "justify-between"}`}>
                <div className={`flex items-center gap-2 ${fullWidthButton ? "w-full flex-col sm:flex-row" : ""}`}>
                    {secondaryActionPosition === "before" ? secondaryAction : null}
                    <Button size="sm" className={`rounded-xl px-4 ${disableHoverEffects ? "" : "group-hover:bg-primary group-hover:text-primary-foreground transition-colors"} ${fullWidthButton ? "w-full" : ""}`} asChild>
                        <Link href={primaryHref || `${basePath}/${id}`}>
                            {primaryLabel}
                        {!hideButtonArrow && <ArrowRight className="w-4 h-4 mr-1" />}
                        </Link>
                    </Button>
                    {secondaryActionPosition === "after" ? secondaryAction : null}
                </div>

                {!hidePrice && <div className="flex flex-col">
                    <span className="text-lg font-bold text-primary">
                            {new Intl.NumberFormat('en-US').format(price)} <span className="text-xs font-normal text-muted-foreground">ر.ي</span>
                    </span>
                </div>}
            </CardFooter>
        </Card>
    )
}


