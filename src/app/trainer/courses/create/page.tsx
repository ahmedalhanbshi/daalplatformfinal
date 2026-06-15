"use client"
/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { trainerService } from "@/lib/trainer-service"
import { PublicService, Tag } from "@/lib/public-service"
import { HallImage } from "@/components/halls/HallImage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Save, Send, Trash2, ArrowLeft, X, MapPin, Users, Building, Globe, Plus, Calendar, Clock, CheckCircle, AlertCircle, AlertTriangle, Banknote, Lock, Loader2, Landmark, Heart, BookOpen, Target, ListChecks, Tags, Lightbulb } from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { formatNumber } from "@/lib/utils"


const platforms = [
    { value: "zoom", label: "Zoom" },
    { value: "teams", label: "Microsoft Teams" },
    { value: "meet", label: "Google Meet" },
    { value: "webex", label: "Webex" },
    { value: "other", label: "أخرى" }
]

const timeSlots = [
    "08:00 - 09:00",
    "09:00 - 10:00",
    "10:00 - 11:00",
    "11:00 - 12:00",
    "12:00 - 13:00",
    "13:00 - 14:00",
    "14:00 - 15:00",
    "15:00 - 16:00",
    "16:00 - 17:00",
    "17:00 - 18:00",
    "18:00 - 19:00",
    "19:00 - 20:00"
]

const weekDaysShort = ["أحد", "اثن", "ثلا", "أرب", "خم", "جم", "سبت"]

type SelectedSlot = { date: string; slot: string }
type GroupedSelectedDay = {
    date: string
    dayName: string
    slots: string[]
    hoursCount: number
    dayTotal: number
}

export default function CreateCoursePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showInfoErrors, setShowInfoErrors] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [activeTab, setActiveTab] = useState("info")
    const [lastDraftSavedAt, setLastDraftSavedAt] = useState<Date | null>(null)

    // Reference Data State
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([])
    const [halls, setHalls] = useState<any[]>([])
    const [availableTags, setAvailableTags] = useState<Tag[]>([])
    const [newCategoryInput, setNewCategoryInput] = useState("")
    const [isAddingCategory, setIsAddingCategory] = useState(false)
    const [isCreatingCategory, setIsCreatingCategory] = useState(false)

    const [newTagInput, setNewTagInput] = useState("")
    const [isCreatingTag, setIsCreatingTag] = useState(false)

    const [courseData, setCourseData] = useState({
        title: "",
        categoryId: "",
        shortDescription: "",
        description: "",
        deliveryType: "", // in_person, online, hybrid, flexible (risk-free)
        price: "",
        minStudents: "",
        maxStudents: "",
        isFree: false,
        hallId: "",
        objectives: [] as string[],
        prerequisites: [] as string[],
        tags: [] as string[]
    })

    // Schedule State
    type InPersonSession = { date: string; slot: string; topic: string }
    const [selectedSessions, setSelectedSessions] = useState<InPersonSession[]>([])

    // Session Labeling State
    type LabelingMode = 'individual' | 'grouped'
    type LabelingRule = { id: number; from: number; to: number; label: string }
    const [labelingMode, setLabelingMode] = useState<LabelingMode>('individual')
    const [labelingRules, setLabelingRules] = useState<LabelingRule[]>([])
    const [ruleCounter, setRuleCounter] = useState(0)
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [calendarOffset, setCalendarOffset] = useState(0)
    const [unavailableMessage, setUnavailableMessage] = useState("")
    const [availableSlots, setAvailableSlots] = useState<string[]>([])
    const [isSlotsLoading, setIsSlotsLoading] = useState(false)
    const [isHallDialogOpen, setIsHallDialogOpen] = useState(false)
    const [onlineSchedule, setOnlineSchedule] = useState({
        platform: "",
        meetingLink: ""
    })

    type OnlineSession = { date: string; startTime: string; duration: string; topic: string }
    const [onlineSessions, setOnlineSessions] = useState<OnlineSession[]>([
        { date: "", startTime: "", duration: "60", topic: "" }
    ])

    const addOnlineSession = () => {
        setOnlineSessions(prev => [...prev, { date: "", startTime: "", duration: "60", topic: "" }])
    }
    const removeOnlineSession = (idx: number) => {
        setOnlineSessions(prev => prev.filter((_, i) => i !== idx))
    }
    const updateOnlineSession = (idx: number, field: keyof OnlineSession, value: string) => {
        setOnlineSessions(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
    }

    const [currentObjective, setCurrentObjective] = useState("")
    const [currentPrerequisite, setCurrentPrerequisite] = useState("")

    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string>("")
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [paymentFile, setPaymentFile] = useState<File | null>(null)
    const [paymentPreview, setPaymentPreview] = useState<string>("")
    const paymentInputRef = useRef<HTMLInputElement>(null)

    const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setPaymentFile(file)
            setPaymentPreview(URL.createObjectURL(file))
        }
    }

    const handleAddCategory = async () => {
        if (!newCategoryInput.trim()) return
        try {
            setIsCreatingCategory(true)
            const newCat = await trainerService.createCategory(newCategoryInput.trim())
            setCategories(prev => [...prev.filter(c => c.id !== newCat.id), newCat].sort((a, b) => a.name.localeCompare(b.name)))
            setCourseData(prev => ({ ...prev, categoryId: newCat.id }))
            setNewCategoryInput("")
            setIsAddingCategory(false)
            toast.success(`تم إضافة التصنيف "${newCat.name}" بنجاح`)
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "فشل في إضافة التصنيف")
        } finally {
            setIsCreatingCategory(false)
        }
    }

    const handleAddTag = async () => {
        if (!newTagInput.trim()) return
        try {
            setIsCreatingTag(true)
            const newTag = await trainerService.createTag(newTagInput.trim())
            setAvailableTags(prev => {
                const filtered = prev.filter(t => t.id !== newTag.id && t.name !== newTag.name)
                return [...filtered, newTag].sort((a, b) => a.name.localeCompare(b.name))
            })
            setCourseData(prev => ({
                ...prev,
                tags: prev.tags.includes(newTag.name) ? prev.tags : [...prev.tags, newTag.name]
            }))
            setNewTagInput("")
            toast.success(`تم إضافة الوسم "${newTag.name}" بنجاح`)
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "فشل في إضافة الوسم")
        } finally {
            setIsCreatingTag(false)
        }
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setImageFile(file)
            setImagePreview(URL.createObjectURL(file))
        }
    }

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const [cats, hls, tags] = await Promise.all([
                    trainerService.getCategories(),
                    trainerService.getHalls(),
                    PublicService.getTags()
                ])
                setCategories(cats)
                setHalls(hls)
                setAvailableTags(tags)
                console.log("HLS DATA FETCHED:", hls)
            } catch (err) {
                toast.error("فشل في تحميل البيانات الأساسية")
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // Derived Halls for UI
    const mappedHalls = halls.map(h => ({
        id: h.id,
        name: h.name,
        type: h.type || "قاعة تدريب",
        location: h.location || "مقر المعهد",
        capacity: h.capacity,
        hourlyRate: Number(h.pricePerHour),
        image: h.image || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000",
        features: h.facilities && h.facilities.length > 0 ? h.facilities : ["مجهزة بالكامل"],
        description: h.description || `${h.facilities?.join('، ') || 'لا يوجد وصف'}`,
        owner: h.institute?.name || "المعهد",
        bankAccounts: h.institute?.bankAccounts || []
    }))

    const selectedHall = mappedHalls.find(h => h.id === courseData.hallId)
    const totalPrice = selectedHall ? selectedHall.hourlyRate * selectedSessions.length : 0;

    const groupSelectedSlotsByDate = (selectedSlots: SelectedSlot[]): GroupedSelectedDay[] => {
        const grouped = new Map<string, string[]>()
        for (const item of selectedSlots) {
            const prev = grouped.get(item.date) || []
            prev.push(item.slot)
            grouped.set(item.date, prev)
        }
        return Array.from(grouped.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, slots]) => {
                const normalizedSlots = [...slots].sort((a, b) => a.localeCompare(b))
                const parsed = new Date(`${date}T12:00:00`)
                const dayName = parsed.toLocaleDateString("ar-EG-u-nu-latn", { weekday: "long" })
                const hoursCount = normalizedSlots.length
                const dayTotal = (selectedHall?.hourlyRate || 0) * hoursCount
                return { date, dayName, slots: normalizedSlots, hoursCount, dayTotal }
            })
    }

    const groupedSelectedDays = groupSelectedSlotsByDate(selectedSessions)
    const selectedDaysCount = groupedSelectedDays.length
    const selectedSlotsCount = selectedSessions.length
    const totalHoursCount = selectedSlotsCount

    // Calendar Logic (Simplified Mock)
    useEffect(() => {
        setSelectedDate(null)
        setSelectedSessions([])
        setUnavailableMessage("")
        setAvailableSlots([])
        setCalendarOffset(0)
    }, [courseData.hallId])

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const maxMonthsAhead = 5

    const formatDateLabel = (dateKey: string) => {
        const [year, month, day] = dateKey.split("-")
        return `${day}-${month}-${year}`
    }
    const formatDateKey = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, "0")
        const day = String(date.getDate()).padStart(2, "0")
        return `${year}-${month}-${day}`
    }

    const monthDate = new Date(todayStart.getFullYear(), todayStart.getMonth() + calendarOffset, 1)
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const monthLabel = monthDate.toLocaleDateString("ar-SA-u-nu-latn", { month: "long", year: "numeric" })
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()

    const calendarDays: Array<{ day: number; dateKey: string; isPast: boolean } | null> = []
    for (let i = 0; i < firstDay; i += 1) calendarDays.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) {
        const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        const dateValue = new Date(year, month, day)
        const isPast = dateValue < todayStart
        calendarDays.push({ day, dateKey, isPast })
    }
    while (calendarDays.length % 7 !== 0) calendarDays.push(null)

    const rawSelectedHall = halls.find(h => h.id === courseData.hallId)
    const blackoutPeriods = rawSelectedHall?.availability?.blackoutPeriods || []

    const getBlackoutPeriodForDate = (dateKey: string) => {
        const dDate = new Date(dateKey)
        dDate.setHours(12, 0, 0, 0)
        return blackoutPeriods.find((bp: any) => {
            const start = new Date(bp.startDate)
            start.setHours(0, 0, 0, 0)
            const end = new Date(bp.endDate)
            end.setHours(23, 59, 59, 999)
            return dDate >= start && dDate <= end
        })
    }

    const handleSelectDay = async (dateKey: string) => {
        const blackout = getBlackoutPeriodForDate(dateKey)
        if (blackout) {
            setSelectedDate(dateKey)
            setUnavailableMessage(`فترة غير متاحة: ${blackout.label || 'صيانة أو حجز مسبق'}`)
            setAvailableSlots([])
            return
        }

        setSelectedDate(dateKey)
        setUnavailableMessage("")
        setAvailableSlots([])

        if (!courseData.hallId) return

        setIsSlotsLoading(true)
        try {
            const data = await trainerService.getHallAvailability(courseData.hallId, dateKey)

            const [yearStr, monthStr, dayStr] = dateKey.split("-")
            const dateObj = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr))
            const dayOfWeekMap = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
            const dayName = dayOfWeekMap[dateObj.getDay()]

            const availabilitySlots = Array.isArray(data.availability)
                ? data.availability
                : (data.availability?.slots ?? [])

            const allowedPeriods = availabilitySlots.filter((a: any) => a.day === dayName) || []
            const hasAvailabilityDefined = availabilitySlots.length > 0

            const booked = data.bookedSessions || []

            const openSlots = timeSlots.filter(slot => {
                const [startHourStr, endHourStr] = slot.split(" - ")

                // 1. Check against base availability (working hours)
                if (hasAvailabilityDefined) {
                    const isWithinWorkingHours = allowedPeriods.some((period: any) => {
                        const pStart = period.startTime.substring(0, 5)
                        const pEnd = period.endTime.substring(0, 5)
                        return startHourStr >= pStart && endHourStr <= pEnd
                    })
                    if (!isWithinWorkingHours) return false
                }

                // 2. Check against booked sessions
                const slotStart = new Date(`${dateKey}T${startHourStr}:00`)
                const slotEnd = new Date(`${dateKey}T${endHourStr}:00`)

                const isOverlap = booked.some((b: any) => {
                    const bStart = new Date(b.startTime)
                    const bEnd = new Date(b.endTime)
                    return slotStart < bEnd && slotEnd > bStart
                })

                return !isOverlap
            })

            setAvailableSlots(openSlots)
            if (openSlots.length === 0) setUnavailableMessage("لا يوجد أوقات متاحة في هذا اليوم أو القاعة مغلقة")
        } catch (e: any) {
            toast.error("فشل جلب أوقات القاعة المتاحة")
        } finally {
            setIsSlotsLoading(false)
        }
    }

    const toggleSessionSlot = (date: string, slot: string) => {
        const exists = selectedSessions.some((s) => s.date === date && s.slot === slot)
        if (exists) {
            setSelectedSessions(prev => prev.filter(s => !(s.date === date && s.slot === slot)))
        } else {
            setSelectedSessions(prev => [...prev, { date, slot, topic: '' }])
        }
    }

    // Update individual session topic
    const updateSessionTopic = (date: string, slot: string, topic: string) => {
        setSelectedSessions(prev => prev.map(s =>
            s.date === date && s.slot === slot ? { ...s, topic } : s
        ))
    }

    // Add a new labeling rule
    const addLabelingRule = () => {
        const totalSessions = getOrderedSessions().length
        const newId = ruleCounter + 1
        setRuleCounter(newId)
        setLabelingRules(prev => [...prev, { id: newId, from: 1, to: Math.max(1, totalSessions), label: '' }])
    }

    // Update a labeling rule
    const updateLabelingRule = (id: number, field: keyof Omit<LabelingRule, 'id'>, value: string | number) => {
        setLabelingRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    }

    // Remove a labeling rule
    const removeLabelingRule = (id: number) => {
        setLabelingRules(prev => prev.filter(r => r.id !== id))
    }

    // Get sessions sorted chronologically with index
    const getOrderedSessions = () => {
        return [...selectedSessions].sort((a, b) =>
            a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot)
        )
    }

    // Compute effective topic for a session given its 1-based index (grouped mode)
    const getEffectiveTopic = (idx1based: number): string => {
        // Last matching rule wins
        let result = ''
        for (const rule of labelingRules) {
            if (idx1based >= rule.from && idx1based <= rule.to && rule.label.trim()) {
                result = rule.label.trim()
            }
        }
        return result || 'جلسة حضورية'
    }

    // --- Submission Logic ---
    const handleSubmit = async (status: 'DRAFT' | 'ACTIVE' | 'PENDING_MINIMUM') => {
        try {
            setIsSubmitting(true)

            if (!isInfoValid) {
                throw new Error("يجب تعبئة كل الحقول المطلوبة")
            }

            // Calculate Dates
            let startDate: string = '';
            let endDate: string = '';
            let sessionsPayload: any[] = [];

            if (status === 'DRAFT' || status === 'PENDING_MINIMUM') {
                // المسودة ودورات انتظار اكتمال العدد لا تحتاج مواعيد، ترسل فارغة
                startDate = '';
                endDate = '';
                sessionsPayload = [];
            } else if (courseData.deliveryType === 'in_person') {
                if (status === 'ACTIVE') {
                    if (selectedSessions.length === 0) throw new Error("يجب اختيار جلسة واحدة على الأقل");
                    if (!paymentFile) throw new Error("يجب إرفاق سند الدفع لحجز القاعة");
                }

                if (selectedSessions.length === 0) {
                    startDate = '';
                    endDate = '';
                    sessionsPayload = [];
                } else {
                    const sortedSessions = [...selectedSessions].sort((a, b) => a.date.localeCompare(b.date));
                    startDate = sortedSessions[0].date;
                    endDate = sortedSessions[sortedSessions.length - 1].date;

                    const orderedForPayload = getOrderedSessions()
                    sessionsPayload = orderedForPayload.map((s, idx) => ({
                        date: s.date,
                        startTime: s.slot.split(" - ")[0],
                        endTime: s.slot.split(" - ")[1],
                        location: selectedHall?.name || "القاعة المختارة",
                        topic: labelingMode === 'individual'
                            ? (s.topic.trim() || 'جلسة حضورية')
                            : getEffectiveTopic(idx + 1)
                    }));
                }

            } else if (courseData.deliveryType === 'online') {
                const validSessions = onlineSessions.filter(s => s.date && s.startTime)
                if (validSessions.length === 0) throw new Error("يجب إضافة جلسة واحدة على الأقل مع تحديد التاريخ والوقت");
                const sortedDates = [...validSessions].sort((a, b) => a.date.localeCompare(b.date));
                startDate = sortedDates[0].date;
                endDate = sortedDates[sortedDates.length - 1].date;

                sessionsPayload = validSessions.map(s => {
                    const start = new Date(`${s.date}T${s.startTime}`);
                    const end = new Date(start.getTime() + Number(s.duration || 60) * 60000);
                    return {
                        date: s.date,
                        startTime: s.startTime,
                        endTime: end.toTimeString().substring(0, 5),
                        location: onlineSchedule.platform || 'Online',
                        meetingLink: onlineSchedule.meetingLink || undefined,
                        topic: s.topic || 'جلسة أونلاين'
                    };
                });
            } else {
                // flexible أو غير محدد، لا تواريخ
                startDate = '';
                endDate = '';
            }


            const formData = new FormData()
            formData.append('title', courseData.title)
            formData.append('categoryId', courseData.categoryId)
            formData.append('shortDescription', courseData.shortDescription)
            formData.append('description', courseData.description)
            formData.append('deliveryType', courseData.deliveryType)
            formData.append('price', courseData.price.toString())
            formData.append('minStudents', courseData.minStudents.toString())
            formData.append('maxStudents', courseData.maxStudents.toString())
            formData.append('isFree', courseData.isFree.toString())
            formData.append('hallId', courseData.hallId)
            formData.append('objectives', JSON.stringify(courseData.objectives))
            formData.append('prerequisites', JSON.stringify(courseData.prerequisites))
            formData.append('tags', JSON.stringify(courseData.tags))

            formData.append('status', status)
            formData.append('startDate', startDate)
            formData.append('endDate', endDate)
            formData.append('duration', (courseData.deliveryType === 'in_person' ? selectedSessions.length : (onlineSessions.reduce((sum, s) => sum + Number(s.duration || 60), 0) / 60)).toString())
            formData.append('sessions', JSON.stringify(sessionsPayload))

            if (imageFile) {
                formData.append('image', imageFile)
            }

            if (paymentFile) {
                formData.append('paymentReceipt', paymentFile)
            }

            await trainerService.createCourse(formData);
            if (status === 'DRAFT') {
                setLastDraftSavedAt(new Date())
            }

            toast.success(
                status === 'DRAFT' ? 'تم حفظ المسودة بنجاح' :
                    status === 'PENDING_MINIMUM' ? 'تم نشر الدورة! ستُفعّل عند اكتمال الحد الأدنى وإكمال الإعداد' :
                        'تم إنشاء الدورة بنجاح'
            );
            router.push('/trainer/courses');

        } catch (err: any) {
            const backendMessage = err?.response?.data?.message
            toast.error(backendMessage || err?.message || 'حدث خطأ أثناء إنشاء الدورة');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    }

    // --- Handlers (Add/Remove) ---
    const addObjective = () => {
        if (currentObjective.trim()) {
            setCourseData(prev => ({ ...prev, objectives: [...prev.objectives, currentObjective.trim()] }))
            setCurrentObjective("")
        }
    }
    const removeObjective = (i: number) => setCourseData(prev => ({ ...prev, objectives: prev.objectives.filter((_, idx) => idx !== i) }))

    const addPrerequisite = () => {
        if (currentPrerequisite.trim()) {
            setCourseData(prev => ({ ...prev, prerequisites: [...prev.prerequisites, currentPrerequisite.trim()] }))
            setCurrentPrerequisite("")
        }
    }
    const removePrerequisite = (i: number) => setCourseData(prev => ({ ...prev, prerequisites: prev.prerequisites.filter((_, idx) => idx !== i) }))

    const toggleTag = (tagName: string) => {
        setCourseData(prev => {
            const exists = prev.tags.includes(tagName)
            return {
                ...prev,
                tags: exists
                    ? prev.tags.filter(t => t !== tagName)
                    : [...prev.tags, tagName]
            }
        })
    }

    const preventNumberSteppers = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault()
        }
    }
    const formatNumberWithCommas = (value: string | number) => {
        const digitsOnly = String(value ?? "").replace(/[^\d]/g, "")
        if (!digitsOnly) return ""
        return formatNumber(Number(digitsOnly))
    }

    // --- Validation ---
    const isInfoValid = courseData.title && courseData.categoryId && courseData.description && courseData.price && courseData.minStudents && courseData.maxStudents && Number(courseData.minStudents) <= Number(courseData.maxStudents) && (imageFile || imagePreview);
    const isLocationValid = () => {
        if (courseData.deliveryType === 'in_person') return !!courseData.hallId && selectedSessions.length > 0;
        if (courseData.deliveryType === 'online') return onlineSessions.some(s => s.date && s.startTime);
        return true; // flexible doesn't need location yet
    }
    const shortDescriptionMax = 100
    const shortDescriptionCount = courseData.shortDescription.length
    const descriptionMax = 1000
    const descriptionCount = courseData.description.length
    const selectedCategoryName = categories.find((c) => c.id === courseData.categoryId)?.name || "الفئة"
    const previewTitle = courseData.title.trim() || "عنوان الدورة سيظهر هنا"
    const previewShortDesc = courseData.shortDescription.trim() || "وصف الدورة المختصر سيظهر هنا"

    if (loading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    return (
        <div className="mx-auto max-w-7xl pb-12" dir="rtl">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/trainer/courses">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            العودة للدورات
                        </Link>
                    </Button>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">إنشاء دورة تدريبية جديدة</h1>
                <p className="text-gray-600">اتبع الخطوات التالية لإنشاء ونشر دورتك التدريبية</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                <div className="w-full rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
                    <div className="mb-3 text-sm font-semibold text-slate-600">الخطوة {activeTab === "info" ? "1" : "2"} من 2</div>

                    <div className="hidden md:block">
                        <div className="flex items-start gap-4" dir="rtl">
                            <button
                                type="button"
                                onClick={() => setActiveTab("info")}
                                className="flex min-w-[280px] items-start gap-3 text-right"
                            >
                                <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${activeTab === "info" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>1</span>
                                <span>
                                    <span className={`block text-base font-bold ${activeTab === "info" ? "text-slate-900" : "text-slate-500"}`}>بيانات الدورة</span>
                                    <span className="block text-sm text-slate-500">المعلومات الأساسية والتفاصيل</span>
                                </span>
                            </button>

                            <div className="flex-1 pt-4">
                                <div className="h-1 rounded-full bg-slate-200">
                                    <div className={`h-1 rounded-full bg-blue-600 transition-all ${activeTab === "info" ? "w-1/2" : "w-full"}`} />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    if (!isInfoValid) {
                                        setShowInfoErrors(true)
                                        return
                                    }
                                    setShowInfoErrors(false)
                                    setActiveTab("pricing")
                                }}
                                className="flex min-w-[280px] items-start gap-3 text-right"
                            >
                                <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${activeTab === "pricing" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>2</span>
                                <span>
                                    <span className={`block text-base font-bold ${activeTab === "pricing" ? "text-slate-900" : "text-slate-500"}`}>الحجز والمواعيد</span>
                                    <span className="block text-sm text-slate-500">الجدول وطريقة الانعقاد</span>
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="md:hidden" dir="rtl">
                        <div className="text-sm font-bold text-slate-900">{activeTab === "info" ? "بيانات الدورة" : "الحجز والمواعيد"}</div>
                        <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                            <div className={`h-1.5 rounded-full bg-blue-600 transition-all ${activeTab === "info" ? "w-1/2" : "w-full"}`} />
                        </div>
                    </div>
                </div>

                {/* --- Tab 1: Info --- */}
                <TabsContent value="info" className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 xl:[direction:ltr] xl:grid-cols-[28%_72%]">
                        <div className="space-y-5 xl:order-2" dir="rtl">
                            <Card className="border border-gray-200 shadow-sm">
                                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-blue-600" />المعلومات الأساسية</CardTitle></CardHeader>
                                <CardContent className="space-y-5 pt-1">
                                    <div className="grid grid-cols-1 gap-6 lg:[direction:ltr] lg:grid-cols-[40%_60%]">
                                        <div className="space-y-5 lg:order-2" dir="rtl">
                                            <div className="space-y-2.5 pr-2 sm:pr-3 lg:pr-4">
                                                <Label className="font-semibold">عنوان الدورة <span className="text-red-500">*</span></Label>
                                                <Input value={courseData.title} onChange={e => setCourseData({ ...courseData, title: e.target.value })} placeholder="مثال: تعلم React" />
                                                {showInfoErrors && !courseData.title.trim() && <p className="text-xs text-red-500 text-right mt-1">يرجى إدخال عنوان الدورة.</p>}
                                            </div>
                                            <div className="space-y-2.5 pr-2 sm:pr-3 lg:pr-4">
                                                <Label className="font-semibold">الفئة <span className="text-red-500">*</span></Label>
                                                <Select
                                                    value={courseData.categoryId}
                                                    onValueChange={v => {
                                                        if (v === '__add_new__') setIsAddingCategory(true)
                                                        else {
                                                            setCourseData({ ...courseData, categoryId: v })
                                                            setIsAddingCategory(false)
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                                                    <SelectContent>
                                                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                        <SelectItem value="__add_new__" className="text-blue-600 font-medium border-t mt-1">+ إضافة تصنيف جديد</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {showInfoErrors && !courseData.categoryId && <p className="text-xs text-red-500 text-right">يرجى اختيار الفئة.</p>}
                                                {isAddingCategory && (
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <Input value={newCategoryInput} onChange={e => setNewCategoryInput(e.target.value)} placeholder="اسم التصنيف الجديد..." className="h-8 text-sm" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }} autoFocus />
                                                        <Button type="button" size="sm" onClick={handleAddCategory} disabled={isCreatingCategory}>{isCreatingCategory ? <Loader2 className="h-3 w-3 animate-spin" /> : 'إضافة'}</Button>
                                                        <Button type="button" size="sm" variant="ghost" onClick={() => { setIsAddingCategory(false); setNewCategoryInput(''); }}>إلغاء</Button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-2.5 pr-2 sm:pr-3 lg:pr-4">
                                                <Label className="font-semibold">وصف مختصر <span className="text-red-500">*</span></Label>
                                                <Textarea value={courseData.shortDescription} onChange={e => setCourseData({ ...courseData, shortDescription: e.target.value.slice(0, shortDescriptionMax) })} rows={2} placeholder="اكتب وصفًا مختصرًا عن الدورة يظهر في بطاقة الدورة" />
                                                <div className="flex items-center justify-between text-xs text-gray-500">
                                                    <span>{shortDescriptionCount}/{shortDescriptionMax}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2.5 lg:order-1" dir="rtl">
                                            <Label className="font-semibold">صورة الدورة <span className="text-red-500">*</span></Label>
                                            <div className="w-full">
                                                <div className="relative h-[188px] w-full max-w-[420px] cursor-pointer overflow-hidden rounded-md border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:bg-gray-100 md:h-[196px]" onClick={() => fileInputRef.current?.click()}>
                                                    {imagePreview ? <Image src={imagePreview} alt="Course Preview" fill className="object-cover object-center" /> : (
                                                        <div className="flex h-full flex-col items-center justify-center text-gray-400 text-center px-3">
                                                            <Plus className="mb-2 h-8 w-8" />
                                                            <span className="text-xs">ارفع صورة الدورة</span>
                                                             <span className="mt-1 text-[11px] text-gray-400">يفضل مقاس 1280×720 بصيغة JPG أو PNG.</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="pt-1">
                                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                                                <div className="flex items-center gap-2">
                                                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>اختر الصورة</Button>
                                                    {imageFile && <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => { setImageFile(null); setImagePreview(""); }}>إزالة</Button>}
                                                </div>
                                                {showInfoErrors && !imageFile && !imagePreview && <p className="text-xs text-red-500 mt-2 text-right">يرجى رفع صورة الدورة.</p>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pr-2 sm:pr-3 lg:pr-4">
                                        <Label>الوصف التفصيلي <span className="text-red-500">*</span></Label>
                                        <Textarea value={courseData.description} onChange={e => setCourseData({ ...courseData, description: e.target.value.slice(0, descriptionMax) })} rows={4} placeholder="اكتب وصفًا تفصيليًا عمّا سيتعلمه الطالب." />
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span>{descriptionCount}/{descriptionMax}</span>
                                        </div>
                                        {showInfoErrors && !courseData.description && <p className="text-xs text-red-500">الوصف التفصيلي مطلوب.</p>}
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="space-y-4 xl:hidden">
                                <div className="space-y-2">
                                    <h3 className="text-base font-bold text-slate-900">معاينة الدورة</h3>
                                    <p className="text-xs text-slate-500">هذا الشكل التقريبي لظهور الدورة في صفحة الاستعراض.</p>
                                </div>
                                <article className="group flex flex-col overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                                    <div className="relative h-[188px] overflow-hidden bg-slate-100 md:h-[196px]">
                                        {imagePreview ? (
                                            <Image src={imagePreview} alt={previewTitle} fill className="object-cover object-center" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-xs text-slate-400">صورة الدورة ستظهر هنا</div>
                                        )}
                                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/25 via-slate-900/10 to-transparent" />
                                        <span className="absolute bottom-3 right-3 rounded-full bg-white/86 px-2.5 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-[2px]">
                                            {selectedCategoryName || "الفئة"}
                                        </span>
                                    </div>

                                    <div className="flex flex-col p-3.5 text-right">
                                        <div className="space-y-1">
                                            <h3 className="line-clamp-2 text-[17px] font-extrabold leading-6 text-slate-900">{previewTitle}</h3>
                                            <p className="line-clamp-2 text-[12px] leading-5 text-slate-600">{previewShortDesc}</p>
                                        </div>

                                        <div className="mt-2.5 flex items-center justify-between text-[12px] font-medium text-slate-600">
                                            <div className="inline-flex items-center gap-1">
                                                <Users className="h-3.5 w-3.5 text-slate-500" />
                                                <span>{courseData.maxStudents || 0} طالب</span>
                                            </div>
                                            <div className="inline-flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                                                <span>0 جلسات</span>
                                            </div>
                                            <div className="inline-flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5 text-slate-500" />
                                                <span>0 أسابيع</span>
                                            </div>
                                        </div>

                                        <div className="pt-2.5">
                                            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-1 pt-3">
                                                <div className="inline-flex items-center gap-2">
                                                    <Button type="button" size="sm" className="h-9 rounded-md bg-[#2563EB] px-4 text-sm font-bold text-white hover:bg-blue-700">
                                                        عرض الدورة
                                                    </Button>
                                                    <button
                                                        type="button"
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-red-500 shadow-sm transition-colors hover:bg-slate-50"
                                                        aria-label="إضافة إلى المفضلة"
                                                    >
                                                        <Heart className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <p className="whitespace-nowrap text-[20px] font-extrabold leading-none tracking-tight text-[#2563EB]">
                                                    {formatNumberWithCommas(courseData.price || 0) || "0"} <span className="text-xs font-bold text-blue-500">ر.ي</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </article>

                                <Card className="border border-gray-200 shadow-sm">
                                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="h-4 w-4 text-amber-500" />نصائح لدورة ناجحة</CardTitle></CardHeader>
                                    <CardContent className="space-y-2 text-sm text-gray-700">
                                        <p className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /><span>اجعل العنوان واضحًا ومباشرًا.</span></p>
                                        <p className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /><span>استخدم صورة جذابة واحترافية.</span></p>
                                        <p className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /><span>اكتب وصفًا يوضح فائدة الدورة للطالب.</span></p>
                                        <p className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /><span>أضف أهدافًا تعليمية قابلة للقياس.</span></p>
                                    </CardContent>
                                </Card>

                            </div>

                            <Card className="border border-gray-200 shadow-sm">
                                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-blue-600" />العدد والتسعير</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label>أقصى عدد مقاعد <span className="text-red-500">*</span></Label>
                                        <Input
                                            type="number"
                                            value={courseData.maxStudents}
                                            onChange={e => setCourseData({ ...courseData, maxStudents: e.target.value })}
                                            onKeyDown={preventNumberSteppers}
                                            onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                            className={`${courseData.minStudents && courseData.maxStudents && Number(courseData.minStudents) > Number(courseData.maxStudents) ? "border-red-500 focus-visible:ring-red-500/30" : ""} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>أقل عدد مقاعد <span className="text-red-500">*</span></Label>
                                        <Input
                                            type="number"
                                            value={courseData.minStudents}
                                            onChange={e => setCourseData({ ...courseData, minStudents: e.target.value })}
                                            onKeyDown={preventNumberSteppers}
                                            onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                            className={`${courseData.minStudents && courseData.maxStudents && Number(courseData.minStudents) > Number(courseData.maxStudents) ? "border-red-500 focus-visible:ring-red-500/30" : ""} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>سعر الدورة (ر.ي) <span className="text-red-500">*</span></Label>
                                        <Input
                                            type="text"
                                            inputMode="numeric"
                                            value={formatNumberWithCommas(courseData.price)}
                                            onChange={e => setCourseData({ ...courseData, price: e.target.value.replace(/[^\d]/g, "") })}
                                            onKeyDown={preventNumberSteppers}
                                            onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    {courseData.minStudents && courseData.maxStudents && Number(courseData.minStudents) > Number(courseData.maxStudents) && (
                                        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-red-500 md:col-span-3">
                                            <AlertTriangle className="h-4 w-4" />
                                            <span>الحد الأدنى يجب أن يكون أقل من أو يساوي الحد الأقصى.</span>
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                <Card className="border border-gray-200 shadow-sm">
                                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4 text-blue-600" />الأهداف</CardTitle></CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex gap-2"><Input value={currentObjective} onChange={e => setCurrentObjective(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addObjective(); } }} placeholder="أضف هدفًا..." /><Button onClick={addObjective} size="icon"><Plus className="h-4 w-4" /></Button></div>
                                        <div className={`space-y-2 ${courseData.objectives.length === 0 ? "min-h-[44px]" : "min-h-[120px]"}`}>
                                            {courseData.objectives.length === 0 ? <p className="text-xs text-gray-400">لا توجد أهداف مضافة بعد.</p> : courseData.objectives.map((o, i) => <div key={i} className="flex items-center justify-between rounded-md bg-gray-50 p-2 text-sm"><span>{o}</span><X className="h-4 w-4 cursor-pointer text-red-500" onClick={() => removeObjective(i)} /></div>)}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border border-gray-200 shadow-sm">
                                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ListChecks className="h-4 w-4 text-blue-600" />المتطلبات السابقة</CardTitle></CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex gap-2"><Input value={currentPrerequisite} onChange={e => setCurrentPrerequisite(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPrerequisite(); } }} placeholder="أضف متطلبًا..." /><Button onClick={addPrerequisite} size="icon"><Plus className="h-4 w-4" /></Button></div>
                                        <div className={`space-y-2 ${courseData.prerequisites.length === 0 ? "min-h-[44px]" : "min-h-[120px]"}`}>
                                            {courseData.prerequisites.length === 0 ? <p className="text-xs text-gray-400">لا توجد متطلبات مضافة بعد.</p> : courseData.prerequisites.map((p, i) => <div key={i} className="flex items-center justify-between rounded-md bg-gray-50 p-2 text-sm"><span>{p}</span><X className="h-4 w-4 cursor-pointer text-red-500" onClick={() => removePrerequisite(i)} /></div>)}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border border-gray-200 shadow-sm">
                                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Tags className="h-4 w-4 text-blue-600" />الوسوم</CardTitle><p className="mt-1 text-xs text-gray-500">اختر الوسوم المناسبة لتصنيف الدورة</p></CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex flex-wrap gap-1.5">
                                            {availableTags.map(tag => {
                                                const isSelected = courseData.tags.includes(tag.name)
                                                return <button key={tag.id} type="button" onClick={() => toggleTag(tag.name)} className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-all ${isSelected ? 'text-white border-transparent shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`} style={isSelected ? { backgroundColor: tag.color || '#2563EB', borderColor: tag.color || '#2563EB' } : {}}>{tag.name}</button>
                                            })}
                                        </div>
                                        <div className="mt-2 flex gap-2 border-t pt-2">
                                            <Input placeholder="أضف وسمًا جديدًا..." value={newTagInput} onChange={e => setNewTagInput(e.target.value)} className="h-8 text-sm" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }} />
                                             <Button type="button" onClick={handleAddTag} size="sm" variant="secondary" disabled={isCreatingTag || !newTagInput.trim()}>{isCreatingTag ? "جاري الإضافة..." : "إضافة"}</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <div className="hidden space-y-4 xl:order-1 xl:block xl:sticky xl:top-24 xl:self-start" dir="rtl">
                            <div className="space-y-2">
                                <h3 className="text-base font-bold text-slate-900">معاينة الدورة</h3>
                                    <p className="text-xs text-slate-500">هذا الشكل التقريبي لظهور الدورة في صفحة الاستعراض.</p>
                            </div>
                            <article className="group flex flex-col overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                                <div className="relative h-[188px] overflow-hidden bg-slate-100 md:h-[196px]">
                                    {imagePreview ? (
                                        <Image src={imagePreview} alt={previewTitle} fill className="object-cover object-center" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-xs text-slate-400">صورة الدورة ستظهر هنا</div>
                                    )}
                                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/25 via-slate-900/10 to-transparent" />
                                    <span className="absolute bottom-3 right-3 rounded-full bg-white/86 px-2.5 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-[2px]">
                                        {selectedCategoryName || "الفئة"}
                                    </span>
                                </div>

                                <div className="flex flex-col p-3.5 text-right">
                                    <div className="space-y-1">
                                        <h3 className="line-clamp-2 text-[17px] font-extrabold leading-6 text-slate-900">{previewTitle}</h3>
                                        <p className="line-clamp-2 text-[12px] leading-5 text-slate-600">{previewShortDesc}</p>
                                    </div>

                                    <div className="mt-2.5 flex items-center justify-between text-[12px] font-medium text-slate-600">
                                        <div className="inline-flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5 text-slate-500" />
                                            <span>{courseData.maxStudents || 0} طالب</span>
                                        </div>
                                        <div className="inline-flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5 text-slate-500" />
                                            <span>0 جلسات</span>
                                        </div>
                                        <div className="inline-flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5 text-slate-500" />
                                            <span>0 أسابيع</span>
                                        </div>
                                    </div>

                                    <div className="pt-2.5">
                                        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-1 pt-3">
                                            <div className="inline-flex items-center gap-2">
                                                <Button type="button" size="sm" className="h-9 rounded-md bg-[#2563EB] px-4 text-sm font-bold text-white hover:bg-blue-700">
                                                    عرض الدورة
                                                </Button>
                                                <button
                                                    type="button"
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-red-500 shadow-sm transition-colors hover:bg-slate-50"
                                                    aria-label="إضافة إلى المفضلة"
                                                >
                                                    <Heart className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <p className="whitespace-nowrap text-[20px] font-extrabold leading-none tracking-tight text-[#2563EB]">
                                                {formatNumberWithCommas(courseData.price || 0) || "0"} <span className="text-xs font-bold text-blue-500">ر.ي</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </article>
                            <Card className="border border-gray-200 shadow-sm">
                                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="h-4 w-4 text-amber-500" />نصائح لدورة ناجحة</CardTitle></CardHeader>
                                <CardContent className="space-y-2 text-sm text-gray-700">
                                    <p className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /><span>اجعل العنوان واضحًا ومباشرًا.</span></p>
                                    <p className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /><span>استخدم صورة جذابة واحترافية.</span></p>
                                    <p className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /><span>اكتب وصفًا يوضح فائدة الدورة للطالب.</span></p>
                                    <p className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /><span>أضف أهدافًا تعليمية قابلة للقياس.</span></p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-4 xl:ml-auto xl:w-[72%]">
                        <div className="flex items-center gap-3">
                            {Number(courseData.minStudents) > 1 && (
                                <Button variant="outline" onClick={() => handleSubmit('PENDING_MINIMUM')} disabled={isSubmitting || !isInfoValid} className="gap-2 border-purple-300 text-purple-700 hover:border-purple-400 hover:bg-purple-50">
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />} نشر بانتظار الحد الأدنى
                                </Button>
                            )}
                            <Button
                                onClick={() => {
                                    if (!isInfoValid) {
                                        setShowInfoErrors(true)
                                        return
                                    }
                                    setShowInfoErrors(false)
                                    setActiveTab("pricing")
                                }}
                                className="min-w-28 translate-x-[20px] bg-blue-600 font-bold hover:bg-blue-700"
                            >
                                التالي<ArrowLeft className="mr-2 h-4 w-4" />
                            </Button>
                        </div>
                        <Button variant="outline" onClick={() => handleSubmit('DRAFT')} disabled={isSubmitting} className="text-gray-700">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} حفظ كمسودة
                        </Button>
                    </div>
                </TabsContent>

                {/* --- Tab 2: Pricing & Schedule --- */}
                <TabsContent value="pricing" className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>طريقة الانعقاد</CardTitle></CardHeader>
                        <CardContent>
                            <RadioGroup value={courseData.deliveryType} onValueChange={v => setCourseData({ ...courseData, deliveryType: v })} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className={`border rounded-lg p-4 cursor-pointer flex flex-col items-center gap-2 ${courseData.deliveryType === 'online' ? 'border-blue-600 bg-blue-50' : ''}`}>
                                    <RadioGroupItem value="online" className="sr-only" />
                                    <Globe className="h-6 w-6 text-blue-600" />
                                    <span className="font-bold">أونلاين</span>
                                </label>
                                <label className={`border rounded-lg p-4 cursor-pointer flex flex-col items-center gap-2 ${courseData.deliveryType === 'in_person' ? 'border-green-600 bg-green-50' : ''}`}>
                                    <RadioGroupItem value="in_person" className="sr-only" />
                                    <Building className="h-6 w-6 text-green-600" />
                                    <span className="font-bold">حضوري</span>
                                </label>
                            </RadioGroup>
                        </CardContent>
                    </Card>

                    {/* In-Person Flow */}
                    {courseData.deliveryType === 'in_person' && (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle>اختيار القاعة</CardTitle></CardHeader>
                                <CardContent>
                                    {!selectedHall ? (
                                        <Button variant="outline" className="w-full justify-between h-14 rounded-[6.5px] border-dashed border-2 hover:bg-gray-50 hover:border-blue-500 text-gray-600" onClick={() => setIsHallDialogOpen(true)}>
                                            <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> اختر قاعة التدريب لعرض المواعيد المتاحة</span>
                                            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-[6.5px] text-sm font-medium">الاستعراض والقائمة</span>
                                        </Button>
                                    ) : (
                                        <div className="mt-2 p-5 border-2 border-blue-100 bg-blue-50/40 rounded-[6.5px] flex flex-col md:flex-row gap-5 items-start md:items-center cursor-pointer hover:border-blue-300 transition-colors" onClick={() => setIsHallDialogOpen(true)}>
                                            <div className="relative h-24 w-full md:w-36 rounded-[6.5px] overflow-hidden shadow-sm shrink-0 border border-gray-100">
                                                <HallImage src={selectedHall.image} alt={selectedHall.name} className="object-cover" />
                                            </div>
                                            <div className="flex-1 space-y-2 w-full">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-bold text-lg text-gray-900">{selectedHall.name}</h4>
                                                    <Badge variant="outline" className="bg-white hidden md:inline-flex">قاعة مختارة <CheckCircle className="mr-1 h-3 w-3 text-green-500 inline" /></Badge>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 text-sm mt-1">
                                                    <span className="flex items-center gap-1.5 bg-white text-gray-700 px-2 py-1.5 rounded-[6.5px] border shadow-sm"><Building className="h-4 w-4 text-purple-500" /> معهد: <strong>{selectedHall.owner}</strong> </span>
                                                    <span className="flex items-center gap-1.5 bg-white text-gray-700 px-2 py-1.5 rounded-[6.5px] border shadow-sm"><Users className="h-4 w-4 text-blue-500" /> السعة: <strong>{selectedHall.capacity}</strong> </span>
                                                    <span className="flex items-center gap-1.5 bg-white text-gray-700 px-2 py-1.5 rounded-[6.5px] border shadow-sm"><Banknote className="h-4 w-4 text-green-500" /> التكلفة: <strong>{selectedHall.hourlyRate} ر.ي/ساعة</strong></span>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-600 hover:bg-white border w-full md:w-auto mt-2 md:mt-0" onClick={(e) => { e.stopPropagation(); setIsHallDialogOpen(true); }}>
                                                تغيير القاعة
                                            </Button>
                                        </div>
                                    )}

                                    <Dialog open={isHallDialogOpen} onOpenChange={setIsHallDialogOpen}>
                                        <DialogContent className="max-w-4xl h-[80vh] rounded-[6.5px] overflow-y-auto">
                                            <DialogHeader className="sr-only">
                                                <DialogTitle>اختيار القاعة</DialogTitle>
                                                <DialogDescription>اختر قاعة من القائمة</DialogDescription>
                                                {halls.length > 0 && <div className="text-xs text-red-500 bg-red-50 p-2 mb-4 whitespace-normal break-words overflow-hidden" dir="ltr">{JSON.stringify(halls[0])}</div>}
                                            </DialogHeader>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                                                {mappedHalls.map((hall) => (
                                                    <div key={hall.id} className="border rounded-[6.5px] overflow-hidden hover:border-blue-500 transition-colors group flex flex-col bg-white">
                                                        <div className="relative h-40 bg-slate-100 group-hover:opacity-90 transition-opacity">
                                                            <HallImage src={hall.image} alt={hall.name} className="object-cover" />
                                                            <div className="absolute top-2 right-2 flex flex-col gap-1">
                                                                <Badge variant="secondary" className="rounded-[6.5px] bg-white/90 backdrop-blur-sm shadow-sm flex items-center gap-1">
                                                                    <MapPin className="h-3 w-3" /> {hall.location}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <div className="p-4 flex-1 flex flex-col">
                                                            <h4 className="font-bold whitespace-nowrap overflow-hidden text-ellipsis mb-1">{hall.name}</h4>
                                                            <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-3">
                                                                <Building className="h-3 w-3 shrink-0 mt-0.5" /> <span className="line-clamp-2 leading-tight">{hall.owner}</span>
                                                            </div>
                                                            <div className="mb-3">
                                                                <Badge variant="secondary" className="rounded-[6.5px] bg-slate-100 text-[11px] font-medium text-slate-600 shadow-none">{hall.type}</Badge>
                                                            </div>
                                                            {hall.description && (
                                                                <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                                                                    {hall.description}
                                                                </p>
                                                            )}
                                                            {hall.features && hall.features.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mb-3">
                                                                    {hall.features.slice(0, 3).map((feature: string, idx: number) => (
                                                                        <span key={idx} className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-[6.5px] border border-gray-200">
                                                                            {feature}
                                                                        </span>
                                                                    ))}
                                                                    {hall.features.length > 3 && (
                                                                        <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-[6.5px] border border-gray-200">
                                                                            +{hall.features.length - 3}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between items-center mb-4 text-sm text-gray-500 border-t pt-3 mt-auto">
                                                                <span>السعة: {hall.capacity}</span>
                                                                <span className="text-blue-600 font-medium">{hall.hourlyRate} ر.ي/ساعة</span>
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                className="w-full rounded-[6.5px] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setCourseData(p => ({ ...p, hallId: hall.id }));
                                                                    setIsHallDialogOpen(false);
                                                                }}
                                                            >
                                                                اختيار القاعة
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {mappedHalls.length === 0 && (
                                                    <div className="col-span-full py-12 text-center text-gray-500">لا توجد قاعات متاحة للاختيار</div>
                                                )}
                                            </div>                                        </DialogContent>
                                    </Dialog>
                                </CardContent>
                            </Card>

                            {selectedHall && (
                                <Card>
                                    <CardHeader>
                                        <div className="flex justify-between items-center">
                                            <CardTitle>جدول المواعيد - {monthLabel}</CardTitle>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => setCalendarOffset(p => Math.max(0, p - 1))} disabled={calendarOffset === 0}>السابق</Button>
                                                <Button variant="ghost" size="sm" onClick={() => setCalendarOffset(p => Math.min(maxMonthsAhead, p + 1))}>التالي</Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Calendar Grid */}
                                        <div>
                                            <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-2">{weekDaysShort.map(d => <div key={d}>{d}</div>)}</div>
                                            <div className="grid grid-cols-7 gap-2">
                                                {calendarDays.map((d, i) => {
                                                    if (!d) return <div key={i} />
                                                    const isSelected = selectedDate === d.dateKey
                                                    const hasSessions = selectedSessions.some(s => s.date === d.dateKey)
                                                    const blackout = getBlackoutPeriodForDate(d.dateKey)
                                                    return (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            onClick={() => handleSelectDay(d.dateKey)}
                                                            disabled={d.isPast}
                                                            className={`h-10 rounded-lg text-sm transition-all
                                                        ${isSelected ? 'bg-blue-600 text-white' :
                                                                    d.isPast ? 'bg-gray-100 text-gray-300' :
                                                                        blackout ? 'bg-red-50 text-red-500 border-red-200 border hover:bg-red-100' :
                                                                            hasSessions ? 'bg-blue-100 text-blue-800 border-blue-200 border' : 'bg-white border hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            {d.day}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {selectedDate && (
                                            <div className="border-t pt-4">
                                                <h4 className="font-semibold mb-3">الأوقات المتاحة ليوم {formatDateLabel(selectedDate)}</h4>
                                                {isSlotsLoading ? (
                                                    <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
                                                ) : availableSlots.length > 0 ? (
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {availableSlots.map(slot => {
                                                            const isSelected = selectedSessions.some(s => s.date === selectedDate && s.slot === slot)
                                                            return (
                                                                <button
                                                                    key={slot}
                                                                    type="button"
                                                                    onClick={() => toggleSessionSlot(selectedDate, slot)}
                                                                    className={`p-2 text-sm rounded border ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'}`}
                                                                >
                                                                    {slot}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500 text-center py-4">{unavailableMessage || "لا يوجد أوقات متاحة"}</p>
                                                )}
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            {selectedSessions.length === 0 && (
                                                <p className="text-sm text-slate-500">اختر الفترات لعرض ملخص حجز القاعة</p>
                                            )}
                                            {selectedSessions.length > 0 && (
                                                <Card className="border border-slate-200 rounded-[6.5px] bg-white shadow-none">
                                                    <CardContent className="p-0">
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full min-w-[760px] text-right" dir="rtl">
                                                                <thead className="bg-slate-50">
                                                                    <tr className="text-xs font-semibold text-slate-600">
                                                                        <th className="px-3 py-2.5">اليوم</th>
                                                                        <th className="px-3 py-2.5">التاريخ</th>
                                                                        <th className="px-3 py-2.5">الفترات المختارة</th>
                                                                        <th className="px-3 py-2.5">عدد الساعات</th>
                                                                        <th className="px-3 py-2.5">سعر اليوم</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {groupedSelectedDays.map((row) => (
                                                                        <tr key={row.date} className="border-t border-slate-200 text-sm text-slate-800 align-top">
                                                                            <td className="px-3 py-2.5 font-medium whitespace-nowrap">{row.dayName}</td>
                                                                            <td className="px-3 py-2.5 whitespace-nowrap">{formatDateLabel(row.date)}</td>
                                                                            <td className="px-3 py-2.5">
                                                                                <div className="flex flex-wrap justify-start gap-1.5">
                                                                                    {row.slots.map((slot) => (
                                                                                        <Badge key={`${row.date}-${slot}`} variant="secondary" className="rounded-[6.5px] bg-slate-100 text-slate-700 shadow-none">
                                                                                            {slot}
                                                                                        </Badge>
                                                                                    ))}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-3 py-2.5 whitespace-nowrap">{row.hoursCount}</td>
                                                                            <td className="px-3 py-2.5 whitespace-nowrap font-bold text-slate-900">{formatNumber(row.dayTotal)} ر.ي</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <div className="border-t border-slate-200 bg-slate-50/70 px-3 py-2.5">
                                                            <div className="flex items-center justify-between gap-4 text-xs text-slate-700">
                                                                <div className="inline-flex items-center gap-1.5 shrink-0">
                                                                    <span className="text-lg font-extrabold text-[#2563EB]">{`الإجمالي النهائي: ${formatNumber(totalPrice)} ر.ي`}</span>
                                                                </div>
                                                                <div className="grid flex-1 grid-cols-3 items-center gap-2 text-right">
                                                                    <div className="inline-flex items-center justify-center gap-1.5">
                                                                        <span className="text-slate-500">{`عدد الأيام : ${selectedDaysCount}`}</span>
                                                                    </div>
                                                                    <div className="inline-flex items-center justify-center gap-1.5">
                                                                        <span className="text-slate-500">{`عدد الفترات : ${selectedSlotsCount}`}</span>
                                                                    </div>
                                                                    <div className="inline-flex items-center justify-center gap-1.5">
                                                                        <span className="text-slate-500">{`إجمالي الساعات : ${totalHoursCount}`}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {selectedSessions.length > 0 && (
                                                <Card className="border border-blue-100 bg-blue-50/40 shadow-none">
                                                    <CardHeader className="pb-3">
                                                        <CardTitle className="flex items-center gap-2 text-base">
                                                            <BookOpen className="h-4 w-4 text-blue-600" />
                                                            عنونة الجلسات الحضورية
                                                        </CardTitle>
                                                        <CardDescription>أضف عنواناً لكل جلسة لتوضيح محتواها للطلاب (اختياري)</CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        {/* Mode Switcher */}
                                                        <div className="flex gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => setLabelingMode('individual')}
                                                                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${labelingMode === 'individual'
                                                                    ? 'border-blue-600 bg-blue-600 text-white'
                                                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                                    }`}
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                                عنونة كل جلسة على حدة
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setLabelingMode('grouped')}
                                                                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${labelingMode === 'grouped'
                                                                    ? 'border-blue-600 bg-blue-600 text-white'
                                                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                                    }`}
                                                            >
                                                                <ListChecks className="h-4 w-4" />
                                                                عنونة مجموعة جلسات
                                                            </button>
                                                        </div>

                                                        {/* Individual Mode */}
                                                        {labelingMode === 'individual' && (
                                                            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                                                <table className="w-full text-right text-sm" dir="rtl">
                                                                    <thead className="bg-slate-50">
                                                                        <tr className="text-xs font-semibold text-slate-600">
                                                                            <th className="px-3 py-2.5 w-8">#</th>
                                                                            <th className="px-3 py-2.5">التاريخ</th>
                                                                        <th className="px-3 py-2.5">الفترة</th>
                                                                            <th className="px-3 py-2.5">عنوان الجلسة</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {getOrderedSessions().map((s, idx) => (
                                                                            <tr key={`${s.date}-${s.slot}`} className="border-t border-slate-100">
                                                                                <td className="px-3 py-2 text-slate-400 font-medium">{idx + 1}</td>
                                                                                <td className="px-3 py-2 whitespace-nowrap text-slate-700">{formatDateLabel(s.date)}</td>
                                                                                <td className="px-3 py-2 whitespace-nowrap">
                                                                                    <Badge variant="secondary" className="rounded-[6.5px] bg-slate-100 text-slate-700 shadow-none text-xs">{s.slot}</Badge>
                                                                                </td>
                                                                                <td className="px-3 py-2">
                                                                                    <Input
                                                                                        value={s.topic}
                                                                                        onChange={e => updateSessionTopic(s.date, s.slot, e.target.value)}
                                                                                         placeholder={`مثال: الجلسة ${idx + 1} - المقدمة`}
                                                                                        className="h-8 text-sm"
                                                                                    />
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}

                                                        {/* Grouped Mode */}
                                                        {labelingMode === 'grouped' && (
                                                            <div className="space-y-3">
                                                                {labelingRules.length === 0 && (
                                                                    <p className="text-sm text-slate-500 text-center py-3 border border-dashed border-slate-200 rounded-lg bg-white">
                                                                         لا توجد قواعد عنونة بعد، اضغط «إضافة قاعدة» لتبدأ
                                                                    </p>
                                                                )}
                                                                {labelingRules.map(rule => (
                                                                    <div key={rule.id} className="flex items-center gap-2 flex-wrap rounded-lg border border-slate-200 bg-white p-3">
                                                                        <span className="text-sm text-slate-600 whitespace-nowrap">من جلسة</span>
                                                                        <Input
                                                                            type="number"
                                                                            min={1}
                                                                            max={selectedSessions.length}
                                                                            value={rule.from}
                                                                            onChange={e => updateLabelingRule(rule.id, 'from', Math.max(1, Number(e.target.value)))}
                                                                            className="h-8 w-20 text-sm text-center"
                                                                        />
                                                                        <span className="text-sm text-slate-600 whitespace-nowrap">إلى جلسة</span>
                                                                        <Input
                                                                            type="number"
                                                                            min={1}
                                                                            max={selectedSessions.length}
                                                                            value={rule.to}
                                                                            onChange={e => updateLabelingRule(rule.id, 'to', Math.min(selectedSessions.length, Number(e.target.value)))}
                                                                            className="h-8 w-20 text-sm text-center"
                                                                        />
                                                                        <Input
                                                                            value={rule.label}
                                                                            onChange={e => updateLabelingRule(rule.id, 'label', e.target.value)}
                                                                            placeholder="عنوان المجموعة مثال: الوحدة الأولى"
                                                                            className="h-8 flex-1 min-w-[160px] text-sm"
                                                                        />
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                                                                            onClick={() => removeLabelingRule(rule.id)}
                                                                        >
                                                                            <X className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={addLabelingRule}
                                                                    className="w-full border-dashed"
                                                                >
                                                                    <Plus className="h-4 w-4 mr-1" />
                                                                    إضافة قاعدة عنونة
                                                                </Button>
                                                                {/* Preview */}
                                                                {labelingRules.length > 0 && (
                                                                    <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
                                                                        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-600">معاينة توزيع العناوين</div>
                                                                        <table className="w-full text-right text-sm" dir="rtl">
                                                                            <thead>
                                                                                <tr className="text-xs text-slate-500">
                                                                                    <th className="px-3 py-2">#</th>
                                                                                    <th className="px-3 py-2">التاريخ</th>
                                                                                    <th className="px-3 py-2">الفترة</th>
                                                                                    <th className="px-3 py-2">العنوان</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {getOrderedSessions().map((s, idx) => (
                                                                                    <tr key={`prev-${s.date}-${s.slot}`} className="border-t border-slate-100">
                                                                                        <td className="px-3 py-1.5 text-slate-400">{idx + 1}</td>
                                                                                        <td className="px-3 py-1.5 text-slate-700 whitespace-nowrap">{formatDateLabel(s.date)}</td>
                                                                                        <td className="px-3 py-1.5 whitespace-nowrap">
                                                                                            <Badge variant="secondary" className="rounded-[6.5px] bg-slate-100 text-slate-700 shadow-none text-xs">{s.slot}</Badge>
                                                                                        </td>
                                                                                        <td className="px-3 py-1.5">
                                                                                            <span className={`text-xs font-medium ${getEffectiveTopic(idx + 1) === 'جلسة حضورية'
                                                                                                ? 'text-slate-400 italic'
                                                                                                : 'text-blue-700'
                                                                                                }`}>
                                                                                                {getEffectiveTopic(idx + 1)}
                                                                                            </span>
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {selectedSessions.length > 0 && (
                                                <Card className="border-2 border-dashed border-blue-200">
                                                    <CardHeader className="pb-3">
                                                        <CardTitle className="text-base flex items-center gap-2">
                                                            <Banknote className="h-5 w-5 text-blue-600" />
                                                             بيانات الدفع لحجز القاعة
                                                        </CardTitle>
                                                         <CardDescription>يرجى تحويل مبلغ {formatNumber(totalPrice)} ر.ي إلى أحد الحسابات التالية وإرفاق صورة السند أدناه</CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="space-y-6">

                                                        <div className="space-y-3">
                                                            <h4 className="text-sm font-semibold text-gray-700">الحسابات البنكية للمعهد</h4>
                                                            {selectedHall?.bankAccounts && selectedHall.bankAccounts.length > 0 ? (
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                    {selectedHall.bankAccounts.map((bank: any) => (
                                                                        <div key={bank.id} className="relative overflow-hidden group p-4 border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow border-gray-100">
                                                                            <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-600"></div>
                                                                            <div className="flex items-center gap-3 mb-4">
                                                                                <div className="h-10 w-10 bg-blue-50/80 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                                                                                    <Landmark className="h-5 w-5" />
                                                                                </div>
                                                                                <div>
                                                                                    <h5 className="font-bold text-gray-900 leading-tight">{bank.bankName}</h5>
                                                                                    <p className="text-xs text-gray-500 mt-1">{bank.accountName}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-2 bg-gray-50 p-3 rounded-[6.5px] border border-gray-100/60">
                                                                                <div className="flex justify-between items-center text-sm">
                                                                                    <span className="text-xs text-gray-500 font-medium">رقم الحساب</span>
                                                                                    <span className="font-mono font-semibold text-blue-900" dir="ltr">{bank.accountNumber}</span>
                                                                                </div>
                                                                                {bank.iban && (
                                                                                    <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200">
                                                                                        <span className="text-xs text-gray-500 font-medium">IBAN</span>
                                                                                        <span className="font-mono text-xs font-semibold text-gray-700" dir="ltr">{bank.iban}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-[6.5px] border border-dashed">
                                                                    لا توجد حسابات بنكية مضافة لهذا المعهد حاليًا. يمكنك التواصل مع المعهد مباشرة.
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div
                                                            className="relative h-48 w-full rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-all cursor-pointer overflow-hidden group"
                                                            onClick={() => paymentInputRef.current?.click()}
                                                        >
                                                            {paymentPreview ? (
                                                                <>
                                                                    <Image src={paymentPreview} alt="Payment Receipt" fill className="object-contain" />
                                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                        <Button variant="secondary" size="sm">تغيير الصورة</Button>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="text-center p-6">
                                                                    <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto mb-3">
                                                                        <Plus className="h-6 w-6 text-blue-600" />
                                                                    </div>
                                                                     <p className="font-medium text-gray-700">إرفاق صورة سند الدفع</p>
                                                                     <p className="text-xs text-gray-500 mt-1">اضغط هنا لرفع الملف (JPG, PNG)</p>
                                                                </div>
                                                            )}
                                                            <input
                                                                type="file"
                                                                ref={paymentInputRef}
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={handlePaymentChange}
                                                            />
                                                        </div>

                                                        <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                                                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                                            <p>
                                                                 سيتم مراجعة طلب حجز القاعة وتأكيده من قبل إدارة المعهد قبل تفعيل الدورة بشكل نهائي.
                                                                تأكد من وضوح بيانات السند لتسريع عملية القبول.
                                                            </p>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* Online Flow */}
                    {courseData.deliveryType === 'online' && (
                        <div className="space-y-6">
                            {/* Platform & Meeting Link */}
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-blue-600" />منصة البث والرابط</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>منصة البث</Label>
                                        <Select value={onlineSchedule.platform} onValueChange={v => setOnlineSchedule({ ...onlineSchedule, platform: v })}>
                                            <SelectTrigger><SelectValue placeholder="اختر المنصة" /></SelectTrigger>
                                            <SelectContent>
                                                {platforms.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>رابط الاجتماع (Meeting Link)</Label>
                                        <Input
                                            placeholder="https://zoom.us/j/... أو meet.google.com/..."
                                            value={onlineSchedule.meetingLink}
                                            onChange={e => setOnlineSchedule({ ...onlineSchedule, meetingLink: e.target.value })}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Sessions List */}
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-blue-600" />الجلسات ({onlineSessions.length})</CardTitle>
                                        <Button type="button" size="sm" variant="outline" onClick={addOnlineSession}>
                                            <Plus className="h-4 w-4 mr-1" /> إضافة جلسة
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {onlineSessions.map((session, idx) => (
                                        <div key={idx} className="border rounded-xl p-4 space-y-3 bg-blue-50/40 relative">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-sm text-blue-800">جلسة {idx + 1}</span>
                                                {onlineSessions.length > 1 && (
                                                    <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeOnlineSession(idx)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-xs">التاريخ</Label>
                                                    <Input type="date" value={session.date} onChange={e => updateOnlineSession(idx, 'date', e.target.value)} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">وقت البدء</Label>
                                                    <Input type="time" value={session.startTime} onChange={e => updateOnlineSession(idx, 'startTime', e.target.value)} />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">المدة (دقيقة)</Label>
                                                    <Select value={session.duration} onValueChange={v => updateOnlineSession(idx, 'duration', v)}>
                                                        <SelectTrigger><SelectValue placeholder="المدة" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="30">30 دقيقة</SelectItem>
                                                            <SelectItem value="45">45 دقيقة</SelectItem>
                                                            <SelectItem value="60">60 دقيقة</SelectItem>
                                                            <SelectItem value="90">90 دقيقة</SelectItem>
                                                            <SelectItem value="120">120 دقيقة</SelectItem>
                                                            <SelectItem value="180">180 دقيقة</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">عنوان الجلسة (اختياري)</Label>
                                                <Input placeholder="مثال: المقدمة والتعريف بالمنهج" value={session.topic} onChange={e => updateOnlineSession(idx, 'topic', e.target.value)} />
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <div className="flex justify-between pt-6 border-t mt-8">
                        <div className="flex gap-2">
                            <Button onClick={() => handleSubmit('ACTIVE')} disabled={!isInfoValid || !isLocationValid() || isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                {courseData.deliveryType === 'in_person' ? 'إرسال للمراجعة' : 'إنشاء الدورة'}
                            </Button>
                        </div>
                        <Button variant="outline" onClick={() => setActiveTab("info")}>السابق</Button>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}


