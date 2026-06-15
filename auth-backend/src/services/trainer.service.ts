/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */
import { EnrollmentStatus, AnnouncementAudience } from '@prisma/client';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import notificationService from './notification.service';
import { mailerService } from './mailer.service';
import { whatsAppService } from './whatsapp.service';
import { auditService } from "./audit.service";

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

class TrainerService {
    /**
     * Get dashboard stats + upcoming sessions + pending room bookings for a trainer
     */
    async getDashboard(userId: string) {
        const now = new Date();

        // All courses belonging to this trainer (including all statuses as requested)
        const courses = await prisma.course.findMany({
            where: { trainerId: userId },
            select: { id: true, title: true, status: true, maxStudents: true, startDate: true, endDate: true },
        });

        const courseIds = courses.map(c => c.id);

        const totalCourses = courses.length;
        const activeCourses = courses.filter(c => c.status === 'ACTIVE').length;

        // Total earnings from enrollments (Approved payments only)
        const totalEarningsResult = await prisma.payment.aggregate({
            where: {
                status: 'APPROVED',
                enrollment: {
                    course: { trainerId: userId }
                }
            },
            _sum: { amount: true }
        });
        const totalEarnings = Number(totalEarningsResult._sum.amount || 0);

        // Total enrolled students across all trainer courses (All cases)
        const totalStudents = await prisma.enrollment.count({
            where: {
                courseId: { in: courseIds },
                deletedAt: null, // Still exclude permanently deleted ones
            },
        });

        // Total sessions
        const totalSessions = await prisma.session.count({
            where: { courseId: { in: courseIds } },
        });

        // Total sessions today
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const sessionsToday = await prisma.session.count({
            where: {
                courseId: { in: courseIds },
                status: 'SCHEDULED',
                startTime: { gte: startOfToday, lte: endOfToday },
            }
        });

        // Upcoming sessions (scheduled, in the future or currently ongoing)
        const upcomingSessionsRaw = await prisma.session.findMany({
            where: {
                courseId: { in: courseIds },
                status: 'SCHEDULED',
                endTime: { gt: now },
            },
            orderBy: { startTime: 'asc' },
            take: 5,
            include: {
                course: { select: { title: true, enrollments: { where: { status: { in: ['ACTIVE', 'PRELIMINARY_APPROVED', 'PENDING_PAYMENT', 'COMPLETED'] } }, select: { id: true } } } },
                room: { select: { name: true } },
            },
        });

        const upcomingSessions = upcomingSessionsRaw
            .filter(s => s.course != null)
            .map(s => ({
                id: s.id,
                title: s.topic || 'جلسة تدريبية',
                courseTitle: s.course!.title,
                startTime: s.startTime,
                endTime: s.endTime,
                type: s.type.toLowerCase(),
                room: s.room?.name ?? null,
                meetingLink: s.meetingLink ?? null,
                enrolledStudents: s.course!.enrollments.length,
            }));

        // Pending room bookings requested by this trainer
        const pendingBookingsRaw = await prisma.roomBooking.findMany({
            where: {
                requestedById: userId,
                status: { in: ['PENDING_APPROVAL', 'PENDING_PAYMENT'] },
            },
            orderBy: { startDate: 'asc' },
            include: {
                room: { select: { name: true } },
                course: { select: { title: true } },
                sessions: { take: 1, orderBy: { startTime: 'asc' }, select: { topic: true } },
            },
        });

        const pendingRoomBookings = pendingBookingsRaw.map(b => ({
            id: b.id,
            courseTitle: b.course?.title ?? '�',
            sessionTitle: b.sessions[0]?.topic ?? b.purpose ?? 'حجز قاعة',
            requestedDate: b.startDate,
            duration: (() => {
                const start = new Date(b.defaultStartTime);
                const end = new Date(b.defaultEndTime);
                return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
            })(),
            requestedRoom: b.room.name,
            status: b.status.toLowerCase(),
        }));

        // Recent Enrollments
        const recentEnrollmentsRaw = await prisma.enrollment.findMany({
            where: {
                course: { trainerId: userId },
            },
            include: {
                course: { select: { title: true } },
                student: { select: { name: true } },
            },
            orderBy: { enrolledAt: "desc" },
            take: 5,
        });

        const recentEnrollments = recentEnrollmentsRaw.map(e => ({
            id: e.id,
            courseTitle: e.course?.title || "دورة",
            studentName: e.student?.name || "طالب",
            enrolledAt: e.enrolledAt,
            status: e.status,
        }));

        // Recent Notifications
        const recentNotificationsRaw = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 5,
        });

        const recentNotifications = recentNotificationsRaw.map(n => ({
            id: n.id,
            title: n.title || "إشعار",
            message: n.message || "",
            createdAt: n.createdAt,
            isRead: n.isRead,
        }));

        return {
            stats: {
                totalCourses,
                activeCourses,
                totalStudents,
                totalSessions,
                sessionsToday,
                totalEarnings,
                upcomingSessions: upcomingSessions.length,
                pendingRoomBookings: pendingRoomBookings.length,
            },
            upcomingSessions,
            pendingRoomBookings,
            recentEnrollments,
            recentNotifications,
        };
    }

    /**
     * Get publicly browsable active courses (for explore page)
     */
    async getExploreCourses(filters?: {
        q?: string;
        category?: string;
        sort?: string;
        deliveryType?: string;
        minPrice?: number;
        maxPrice?: number;
    }) {
        const q = filters?.q?.trim();
        const category = filters?.category?.trim();
        const minPrice = Number.isFinite(filters?.minPrice) ? Number(filters?.minPrice) : undefined;
        const maxPrice = Number.isFinite(filters?.maxPrice) ? Number(filters?.maxPrice) : undefined;

        const where: any = {
            status: { in: ['ACTIVE', 'PENDING_MINIMUM'] },
            deletedAt: null,
            AND: [],
        };

        if (q) {
            where.AND.push({
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { shortDescription: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                    { tags: { has: q } },
                    { category: { name: { contains: q, mode: 'insensitive' } } },
                ],
            });
        }

        if (category && category !== 'all') {
            where.AND.push({
                OR: [
                    { categoryId: category },
                    { category: { name: { equals: category, mode: 'insensitive' } } },
                ],
            });
        }

        if (filters?.deliveryType && filters.deliveryType !== 'all') {
            const normalizedType =
                filters.deliveryType === 'online' ? 'ONLINE'
                    : filters.deliveryType === 'in_person' ? 'IN_PERSON'
                        : null;
            if (normalizedType) {
                where.AND.push({
                    sessions: {
                        some: { type: normalizedType as any }
                    }
                });
            }
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            where.AND.push({
                price: {
                    ...(minPrice !== undefined ? { gte: minPrice } : {}),
                    ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
                },
            });
        }

        const sort = filters?.sort ?? 'newest';
        const orderBy =
            sort === 'oldest'
                ? { createdAt: 'asc' as const }
                : sort === 'price_low'
                    ? { price: 'asc' as const }
                    : sort === 'price_high'
                        ? { price: 'desc' as const }
                        : { createdAt: 'desc' as const };

        const courses = await prisma.course.findMany({
            where: where.AND.length ? where : { status: { in: ['ACTIVE', 'PENDING_MINIMUM'] } },
            orderBy,
            include: {
                trainer: { select: { name: true, avatar: true } },
                institute: {
                    select: {
                        name: true,
                        logo: true,
                        user: { select: { avatar: true } }
                    }
                },
                category: { select: { name: true } },
                enrollments: {
                    where: { status: { in: ['ACTIVE', 'PRELIMINARY_APPROVED', 'PENDING_PAYMENT'] } },
                    select: { id: true },
                },
                sessions: { select: { id: true, type: true, room: { select: { id: true, name: true } } } },
            },
        });

        // Gather all staffTrainerIds to fetch in a single query
        const allStaffIds = [...new Set(courses.flatMap(c => (c as any).staffTrainerIds as string[] || []))];
        const staffMap = new Map<string, { name: string, avatar: string | null }>();
        if (allStaffIds.length > 0) {
            const staffList = await prisma.instituteStaff.findMany({
                where: { id: { in: allStaffIds } },
                select: { id: true, name: true, avatar: true }
            });
            staffList.forEach(s => staffMap.set(s.id, s));
        }

        const categories = await prisma.courseCategory.findMany({
            orderBy: { name: 'asc' },
        });

        return {
            courses: courses.map(c => {
                const staffTrainerIds = (c as any).staffTrainerIds as string[] || [];
                const staffTrainers = staffTrainerIds.map(id => ({
                    name: staffMap.get(id)?.name ?? '�',
                    avatar: staffMap.get(id)?.avatar ?? null
                }));

                return {
                    id: c.id,
                    trainerId: c.trainerId,
                    instituteId: c.instituteId,
                    title: c.title,
                    description: c.description ?? '',
                    shortDescription: c.shortDescription ?? '',
                    category: c.category?.name ?? 'عام',
                    image: c.image ?? null,
                    studentsCount: c.enrollments.length,
                    sessionsCount: c.sessions.length,
                    duration: `${c.duration} ساعة`,
                    trainer: {
                        name: c.trainer?.name ?? staffTrainers[0]?.name ?? c.institute?.name ?? '�',
                        avatar: c.trainer?.avatar ?? staffTrainers[0]?.avatar ?? c.institute?.logo ?? c.institute?.user?.avatar ?? null,
                    },
                    staffTrainers,
                    price: Number(c.price),
                    minStudents: c.minStudents,
                    courseStatus: c.status, // 'ACTIVE' | 'PENDING_MINIMUM'
                    deliveryType: ['FLEXIBLE', 'CAPACITY_BASED'].includes(c.bookingTrigger) ? 'flexible'
                        : c.sessions[0]?.type === 'ONLINE' ? 'online'
                            : c.sessions[0]?.type === 'IN_PERSON' ? 'in_person'
                                : c.sessions.length > 0 ? 'hybrid' : 'online',
                    roomId: (c.sessions as any[]).find(s => s.type === 'IN_PERSON')?.room?.id || null,
                    roomName: (c.sessions as any[]).find(s => s.type === 'IN_PERSON')?.room?.name || null,
                    startDate: c.startDate,
                    createdAt: c.createdAt,
                };
            }),
            categories: [{ id: 'all', name: 'الكل' }, ...categories.map(c => ({ id: c.id, name: c.name }))],
        };
    }

    /**
     * Get trainer bank accounts
     */
    async getBankAccounts(userId: string) {
        return prisma.bankAccount.findMany({
            where: { trainerId: userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Add a bank account for trainer
     */
    async addBankAccount(userId: string, data: { bankName: string; accountName: string; accountNumber: string; iban?: string; isActive?: boolean }) {
        const count = await prisma.bankAccount.count({
            where: { trainerId: userId }
        });

        const shouldBeActive = count === 0 ? true : (data.isActive ?? false);

        if (shouldBeActive) {
            await prisma.bankAccount.updateMany({
                where: { trainerId: userId },
                data: { isActive: false }
            });
        }


        auditService.logAction({
            action: 'CREATE',
            entityName: 'BankAccount',
            entityId: 'system_log',
            description: 'إضافة حساب بنكي جديد',
            performedBy: userId
        }).catch(e => console.error(e));

        return prisma.bankAccount.create({
            data: {
                ...data,
                isActive: shouldBeActive,
                trainerId: userId,
            },
        });
    }

    /**
     * Update trainer bank account
     */
    async updateBankAccount(userId: string, accountId: string, data: { bankName?: string; accountName?: string; accountNumber?: string; iban?: string; isActive?: boolean }) {
        const account = await prisma.bankAccount.findFirst({
            where: { id: accountId, trainerId: userId },
        });

        if (!account) {
            throw new Error('لم يتم العثور على حساب البنك المخصص للتحديث');
        }

        if (data.isActive === true) {
            await prisma.bankAccount.updateMany({
                where: { trainerId: userId, id: { not: accountId } },
                data: { isActive: false }
            });
        }


        auditService.logAction({
            action: 'UPDATE',
            entityName: 'BankAccount',
            entityId: 'system_log',
            description: 'تعديل حساب بنكي',
            performedBy: userId
        }).catch(e => console.error(e));

        return prisma.bankAccount.update({
            where: { id: accountId },
            data,
        });
    }

    /**
     * Delete a trainer bank account
     */
    async deleteBankAccount(userId: string, accountId: string) {
        const account = await prisma.bankAccount.findFirst({
            where: { id: accountId, trainerId: userId },
        });

        if (!account) {
            throw new Error('لم يتم العثور على الحساب المخصص �„�„حذف');
        }

        const wasActive = account.isActive;

        await prisma.bankAccount.delete({
            where: { id: accountId },
        });

        if (wasActive) {
            const nextAccount = await prisma.bankAccount.findFirst({
                where: { trainerId: userId },
                orderBy: { createdAt: 'desc' }
            });
            if (nextAccount) {
                await prisma.bankAccount.update({
                    where: { id: nextAccount.id },
                    data: { isActive: true }
                });
            }
        }

        auditService.logAction({
            action: 'DELETE',
            entityName: 'BankAccount',
            entityId: 'system_log',
            description: 'حذف حساب بنكي',
            performedBy: userId
        }).catch(e => console.error(e));
    }

    /**
     * Get all categories
     */
    async getCategories() {
        return prisma.courseCategory.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true }
        });
    }

    /**
     * Create a new category
     */
    async createCategory(name: string) {
        // Generate a simple slug from the name
        const slug = name.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '-').replace(/(^-|-$)/g, '');
        return prisma.courseCategory.create({
            data: { name, slug: slug || `category-${Date.now()}` },
            select: { id: true, name: true }
        });
    }

    /**
     * Create a new tag
     */
    async createTag(name: string) {
        const slug = name.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '-').replace(/(^-|-$)/g, '');
        // Check if tag already exists
        const existing = await prisma.tag.findUnique({ where: { name } });
        if (existing) return existing;

        return prisma.tag.create({
            data: { name, slug: slug || `tag-${Date.now()}` },
            select: { id: true, name: true, color: true }
        });
    }

    /**
     * Get all courses created by this trainer
     */
    async getCourses(userId: string) {
        const courses = await prisma.course.findMany({
            where: { trainerId: userId, deletedAt: null },
            include: {
                category: { select: { name: true } },
                _count: { select: { enrollments: true } },
                roomBookings: {
                    select: { status: true, rejectionReason: true },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return courses.map(c => {
            const latestBooking = c.roomBookings[0];
            let displayStatus = c.status.toLowerCase();
            if (latestBooking?.status === 'PENDING_PAYMENT') displayStatus = 'payment_required';
            else if (latestBooking?.status === 'PENDING_APPROVAL') displayStatus = 'pending_approval';

            return {
                id: c.id,
                title: c.title,
                shortDescription: c.shortDescription ?? '',
                description: c.description ?? '',
                image: c.image ?? null,
                price: Number(c.price),
                startDate: c.startDate,
                endDate: c.endDate,
                maxStudents: c.maxStudents,
                minStudents: c.minStudents,
                enrolledStudents: c._count.enrollments,
                status: displayStatus,
                rejectionReason: latestBooking?.rejectionReason ?? null,
                category: c.category?.name ?? '�',
                createdAt: c.createdAt,
                prerequisites: c.prerequisites ? c.prerequisites.split('\n') : [],
                objectives: c.objectives ?? [],
                tags: c.tags ?? [],
                updatedAt: c.updatedAt,
            };
        });
    }

    /**
     * Get a single course by ID (must belong to this trainer)
     */
    async getTrainerCourseById(userId: string, courseId: string) {
        const course = await prisma.course.findFirst({
            where: { id: courseId, trainerId: userId, deletedAt: null },
            include: {
                category: { select: { id: true, name: true } },
                _count: { select: { enrollments: true } },
                roomBookings: {
                    include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                sessions: {
                    orderBy: { startTime: 'asc' },
                    select: {
                        id: true,
                        startTime: true,
                        endTime: true,
                        topic: true,
                        location: true,
                        meetingLink: true,
                        type: true,
                        roomId: true,
                    }
                }
            },
        });

        if (!course) throw new Error('الدورة غير موجودة أو لا تنتمي لهذا المدرب');

        return {
            id: course.id,
            title: course.title,
            shortDescription: course.shortDescription ?? '',
            description: course.description ?? '',
            image: course.image ?? null,
            price: Number(course.price),
            duration: course.duration,
            startDate: course.startDate,
            endDate: course.endDate,
            maxStudents: course.maxStudents,
            minStudents: course.minStudents,
            status: course.status.toLowerCase(),
            enrolledStudents: course._count.enrollments,
            category: course.category?.name || "-",
            categoryId: course.categoryId ?? '',
            deliveryType: ['FLEXIBLE', 'CAPACITY_BASED'].includes((course as any).bookingTrigger) ? 'flexible'
                : (course as any).sessions?.[0]?.type === 'ONLINE' ? 'online'
                    : (course as any).sessions?.[0]?.type === 'IN_PERSON' ? 'in_person'
                        : (course as any).sessions?.length > 0 ? 'hybrid' : 'online',
            hallId: (course as any).sessions?.[0]?.roomId ?? null,
            prerequisites: course.prerequisites ? course.prerequisites.split('\n').filter(Boolean) : [],
            objectives: course.objectives ?? [],
            tags: course.tags ?? [],
            sessions: ((course as any).sessions ?? []).map((s: any) => ({
                id: s.id,
                startTime: s.startTime,
                endTime: s.endTime,
                topic: s.topic ?? '',
                location: s.location ?? '',
                meetingLink: s.meetingLink ?? '',
                type: s.type ?? '',
            })),
            roomBooking: course.roomBookings[0] ? {
                id: course.roomBookings[0].id,
                status: course.roomBookings[0].status.toLowerCase(),
                rejectionReason: course.roomBookings[0].rejectionReason,
                totalPrice: Number(course.roomBookings[0].totalPrice),
                payment: course.roomBookings[0].payments[0] ? {
                    id: course.roomBookings[0].payments[0].id,
                    status: course.roomBookings[0].payments[0].status.toLowerCase(),
                    amount: Number(course.roomBookings[0].payments[0].amount),
                    receipt: course.roomBookings[0].payments[0].depositSlipImage
                } : null
            } : null,
            createdAt: course.createdAt,
        };
    }

    /**
     * Update a course that belongs to this trainer
     */
    async updateTrainerCourse(userId: string, courseId: string, data: any) {
        const course = await prisma.course.findFirst({
            where: { id: courseId, trainerId: userId },
        });
        if (!course) throw new Error('الدورة غير موجودة أو لا تنتمي لهذا المدرب');

        // Build update data
        const updateData: any = {
            ...(data.title !== undefined && { title: data.title }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.shortDescription !== undefined && { shortDescription: data.shortDescription }),
            ...(data.image !== undefined && { image: data.image }),
            ...(data.price !== undefined && { price: Number(data.price) }),
            ...(data.duration !== undefined && { duration: Number(data.duration) }),
            ...(data.maxStudents !== undefined && { maxStudents: Number(data.maxStudents) }),
            ...(data.startDate && { startDate: new Date(data.startDate) }),
            ...(data.endDate && { endDate: new Date(data.endDate) }),
            ...(data.categoryId !== undefined && { categoryId: data.categoryId || null }),
            ...(data.status && {
                status: (data.status.toUpperCase() === 'ACTIVE' && data.deliveryType === 'in_person')
                    ? 'PENDING_REVIEW'
                    : data.status.toUpperCase()
            }),
            ...(data.objectives !== undefined && { objectives: data.objectives ?? [] }),
            ...(data.prerequisites !== undefined && { prerequisites: data.prerequisites?.length ? data.prerequisites.join('\n') : null }),
            ...(data.tags !== undefined && { tags: data.tags ?? [] }),
        };

        const updated = await prisma.course.update({
            where: { id: courseId },
            data: updateData,
        });

        // Create/update sessions whenever sessions payload is provided (including flexible flows)
        if (Array.isArray(data.sessions) && data.sessions.length > 0) {
            const sessionType = data.deliveryType === 'online' ? 'ONLINE' : 'IN_PERSON';

            const mappedSessions = data.sessions.map((s: any) => {
                // Ensure time format is HH:mm:ss for ISO parsing
                const formatTime = (t: string) => (t && t.split(':').length === 2) ? `${t}:00` : t;
                const start = new Date(`${s.date}T${formatTime(s.startTime)}`);
                const end = new Date(`${s.date}T${formatTime(s.endTime)}`);

                return {
                    startTime: isNaN(start.getTime()) ? new Date() : start,
                    endTime: isNaN(end.getTime()) ? new Date() : end,
                    type: sessionType,
                    status: 'SCHEDULED' as const,
                    location: s.location || '',
                    meetingLink: s.meetingLink || null,
                    topic: s.topic || '',
                    courseId,
                };
            });

            // Snapshot old sessions before deletion (for change detection)
            const oldSessions = await prisma.session.findMany({
                where: { courseId },
                select: { startTime: true, endTime: true }
            });

            // Delete old sessions for this course first
            await prisma.session.deleteMany({ where: { courseId } });

            if (data.hallId) {
                try {
                    // In-person: create room booking + payment + sessions linked to booking
                    const room = await prisma.room.findUnique({ where: { id: data.hallId } });
                    if (!room) throw new Error('القاعة غير موجودة');

                    const totalHours = mappedSessions.reduce((acc: number, s: any) => {
                        const diff = s.endTime.getTime() - s.startTime.getTime();
                        return acc + (isNaN(diff) || diff < 0 ? 0 : diff / 3600000);
                    }, 0);

                    const hourlyRate = Number(room.pricePerHour) || 0;
                    const totalPrice = totalHours * hourlyRate;

                    const sortedSessions = [...mappedSessions].sort((a: any, b: any) => a.startTime.getTime() - b.startTime.getTime());

                    // Helper to create a time-only date for Prisma @db.Time(6) compatibility
                    const toTimeOnly = (d: Date) => {
                        const t = new Date(1970, 0, 1);
                        t.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), 0);
                        return t;
                    };

                    const roomBooking = await prisma.roomBooking.create({
                        data: {
                            bookingMode: 'CUSTOM_TIME',
                            startDate: sortedSessions[0].startTime,
                            endDate: sortedSessions[sortedSessions.length - 1].endTime,
                            selectedDays: [],
                            defaultStartTime: toTimeOnly(sortedSessions[0].startTime),
                            defaultEndTime: toTimeOnly(sortedSessions[0].endTime),
                            status: data.paymentReceiptPath ? 'PENDING_APPROVAL' : 'PENDING_PAYMENT',
                            totalPrice: isNaN(totalPrice) ? 0 : totalPrice,
                            roomId: room.id,
                            requestedById: userId,
                            courseId,
                            purpose: `حجز لدورة: ${updated.title}`
                        }
                    });

                    if (data.paymentReceiptPath) {
                        await prisma.payment.create({
                            data: {
                                amount: isNaN(totalPrice) ? 0 : totalPrice,
                                currency: 'YER',
                                depositSlipImage: data.paymentReceiptPath,
                                notes: `إيصال دفع لحجز قاعة (${room.name}) للدورة (${updated.title})`,
                                status: 'PENDING_REVIEW',
                                roomBookingId: roomBooking.id
                            }
                        });
                    }

                    await prisma.session.createMany({
                        data: mappedSessions.map((s: any) => ({
                            ...s,
                            roomBookingId: roomBooking.id,
                            roomId: room.id,
                        }))
                    });

                    // ── Notify Institute of new booking request ──
                    const institute = await prisma.institute.findUnique({
                        where: { id: room.instituteId },
                        include: { user: { select: { id: true, name: true, email: true, phone: true } } }
                    });
                    const trainerUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

                    if (institute && trainerUser) {
                        await notificationService.createNotification({
                            userId: institute.user.id,
                            type: 'NEW_BOOKING_REQUEST',
                            title: 'طلب حجز قاعة جديد',
                            message: `طلب المدرب ${trainerUser.name} حجز قاعة "${room.name}" لدورة "${updated.title}"`,
                            relatedEntityId: roomBooking.id,
                            actionUrl: '/institute/room-bookings',
                            emailFn: institute.user.email ? () => mailerService.sendNewBookingRequest(institute.user.email!, institute.user.name, trainerUser.name, room.name) : undefined,
                            whaFn: institute.user.phone ? () => whatsAppService.notifyNewBookingRequest(institute.user.phone!, institute.user.name, trainerUser.name, room.name) : undefined
                        });
                    }
                } catch (bookingError: any) {
                    console.error('[updateTrainerCourse] RoomBooking Error:', bookingError);
                    throw new Error(`فش�„ ف�Š إنشاء حجز القاعة: ${bookingError.message}`);
                }
            } else {
                // Online or capacity_based: just create sessions
                await prisma.session.createMany({ data: mappedSessions });
            }

            // ── Notify enrolled students if schedule actually changed ──
            const hasChanged = oldSessions.length !== mappedSessions.length ||
                oldSessions.some((old, i) => {
                    const nw = mappedSessions[i];
                    return !nw ||
                        old.startTime.getTime() !== nw.startTime.getTime() ||
                        old.endTime.getTime() !== nw.endTime.getTime();
                });

            if (hasChanged && oldSessions.length > 0) {
                setImmediate(async () => {
                    try {
                        const enrollments = await prisma.enrollment.findMany({
                            where: {
                                courseId,
                                status: { in: ['ACTIVE', 'PRELIMINARY_APPROVED', 'PENDING_PAYMENT'] },
                                deletedAt: null
                            },
                            select: { student: { select: { id: true, name: true, email: true, phone: true } } }
                        });

                        const reason: string | undefined = (data as any).sessionChangeReason || undefined;
                        const count = mappedSessions.length;

                        for (const { student } of enrollments) {
                            await notificationService.createNotification({
                                userId: student.id,
                                type: 'SESSION_REMINDER' as any,
                                title: `ðŸ—“️ تحديث الجدول الدراسي لدورة "${updated.title}"`,
                                message: `تم تحديث جدول دورة "${updated.title}" بالكامل (${count} جلسة).${reason ? ` السبب: ${reason}` : ''}`,
                                relatedEntityId: courseId,
                                actionUrl: '/student/courses',
                                emailFn: student.email
                                    ? () => mailerService.sendSessionsRescheduled(student.email!, student.name, updated.title, count, reason)
                                    : undefined,
                                whaFn: student.phone
                                    ? () => whatsAppService.notifySessionsRescheduled(student.phone!, student.name, updated.title, count, reason)
                                    : undefined,
                            });
                        }
                    } catch (err) {
                        console.error('[updateTrainerCourse] Failed to notify students of schedule change:', err);
                    }
                });
            }
        }


        auditService.logAction({
            action: 'UPDATE',
            entityName: 'Course',
            entityId: 'system_log',
            description: 'تعديل بيانات دورة للمدرب',
            performedBy: userId
        }).catch(e => console.error(e));

        return updated;
    }

    /**
     * Delete a course that belongs to this trainer
     */
    async deleteCourse(userId: string, courseId: string) {
        const course = await prisma.course.findFirst({
            where: { id: courseId, trainerId: userId },
        });
        if (!course) throw new Error('الدورة غير موجودة أو لا تنتمي لهذا المدرب');

        const activeEnrollmentCount = await prisma.enrollment.count({
            where: {
                courseId,
                status: {
                    in: ['ACTIVE', 'PRELIMINARY_APPROVED', 'PENDING_PAYMENT']
                },
                deletedAt: null
            }
        });

        if (activeEnrollmentCount > 0) {
            throw new Error('لا يمكن حذف دورة بها طلاب مستمرون أو قيد الانتظار. يرجى إلغاء الدورة أو إلغاء تسجيل الطلاب أولاً.');
        }


        auditService.logAction({
            action: 'DELETE',
            entityName: 'Course',
            entityId: 'system_log',
            description: 'حذف دورة للمدرب',
            performedBy: userId
        }).catch(e => console.error(e));

        return prisma.course.update({
            where: { id: courseId },
            data: { deletedAt: new Date() },
        });
    }

    /**
     * Get all students enrolled in a course that belongs to this trainer
     */
    async getCourseStudents(userId: string, courseId: string) {
        const course = await prisma.course.findFirst({
            where: { id: courseId, trainerId: userId },
            select: { id: true, title: true, maxStudents: true },
        });

        if (!course) throw new Error('الدورة غير موجودة أو لا تنتمي لهذا المدرب');

        const enrollments = await prisma.enrollment.findMany({
            where: { courseId, deletedAt: null },
            include: {
                student: {
                    select: { id: true, name: true, email: true, phone: true },
                },
            },
            orderBy: { enrolledAt: 'desc' },
        });

        return {
            course: { id: course.id, title: course.title, maxStudents: course.maxStudents },
            enrollments: enrollments.map(e => ({
                id: e.id,
                studentId: e.studentId,
                courseId: e.courseId,
                enrolledAt: e.enrolledAt,
                status: e.status.toLowerCase(),
                student: {
                    id: e.student.id,
                    name: e.student.name,
                    email: e.student.email,
                    phone: e.student.phone,
                },
            })),
        };
    }


    /**
     * Create an announcement for students (ALL, COURSE or SINGLE_USER) from a trainer.
     * Uses direct courseId lookup to avoid nested Prisma filter issues.
     */
    async createStudentAnnouncement(userId: string, data: {
        title: string;
        message: string;
        recipientIds?: string[];
        courseId?: string;
        category?: string;
        status?: string;
        scheduledAt?: string;
    }) {
        console.log(`[Announcement-Trainer] Trainer ${userId} initiating announcement to: ${data.recipientIds?.length ? data.recipientIds.length + ' students' : (data.courseId ?? 'ALL')}`);

        // STRICTLY INDEPENDENT TRAINER LOOKUP: Fetch only courses owned by this specific trainer User ID
        const trainerCourses = await prisma.course.findMany({
            where: { trainerId: userId },
            select: { id: true }
        });
        let courseIds = trainerCourses.map((c: any) => c.id);

        if (data.courseId) {
            if (courseIds.includes(data.courseId)) {
                courseIds = [data.courseId];
            } else {
                throw new Error("الدورة المحددة غير تابعة لك");
            }
        }

        console.log(`[Announcement-Trainer] Trainer owns ${courseIds.length} targeted courses`);

        if (data.recipientIds && data.recipientIds.length > 0) {
            // Target specific students
            console.log(`[Announcement-Trainer] Verifying enrollment for target students`);
            const enrolledStudents = courseIds.length > 0
                ? await prisma.enrollment.findMany({
                    where: {
                        studentId: { in: data.recipientIds },
                        courseId: { in: courseIds },
                        deletedAt: null
                    },
                    select: { student: { select: { id: true, name: true, email: true } } },
                    distinct: ['studentId']
                })
                : [];

            if (enrolledStudents.length === 0) {
                console.warn(`[Announcement-Trainer] TARGET_ERROR: None of the targeted students are enrolled in any of trainer ${userId}'s courses`);
                throw new Error('الطلاب المحددين غير مسجلين ف�Š أي من دوراتك المستقلة');
            }

            const trainer = await prisma.user.findUnique({
                where: { id: userId },
                select: { name: true, phone: true, email: true }
            });

            const contactFooter = `\n\n---\n👤 المرسل: ${trainer?.name || 'المدرب'}\n${trainer?.phone ? `📞 الجوال: ${trainer.phone}\n` : ''}${trainer?.email ? `�œ‰️ البريد: ${trainer.email}` : ''}`;
            const fullMessage = data.message + contactFooter;

            // 1. Create Announcement Record
            const announcement = await (prisma.announcement.create as any)({
                data: {
                    title: data.title + (data.recipientIds.length > 1 ? '\u200B' : ''), // Zero-width space to denote selective broadcast
                    message: fullMessage,
                    targetAudience: data.recipientIds.length === 1 ? 'SINGLE_USER' : 'STUDENTS',
                    senderId: userId,
                    recipientId: data.recipientIds.length === 1 ? data.recipientIds[0] : null,
                    recipientIds: data.recipientIds.length > 1 ? data.recipientIds : [],
                    courseId: data.courseId || null,
                    category: (data.category?.toUpperCase() as any) || 'GENERAL',
                    status: (data.status?.toUpperCase() as any) || (data.scheduledAt ? 'SCHEDULED' : 'SENT'),
                    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
                    sentAt: data.scheduledAt ? null : new Date(),
                    createdAt: new Date()
                }
            });

            // 2. Background Tasks: Notifications & Emails
            setImmediate(async () => {
                try {
                    if (announcement.status === 'SENT') {
                        await prisma.notification.createMany({
                            data: enrolledStudents.map((s: any) => ({
                                userId: s.student.id,
                                type: 'NEW_ANNOUNCEMENT' as any,
                                title: data.title,
                                message: fullMessage,
                                relatedEntityId: announcement.id
                            })),
                            skipDuplicates: true
                        });

                        for (const { student } of enrolledStudents as any[]) {
                            if (student.email) {
                                mailerService.sendAnnouncementEmail(
                                    student.email,
                                    student.name,
                                    data.title,
                                    data.message,
                                    {
                                        name: trainer?.name || 'المدرب',
                                        phone: trainer?.phone,
                                        email: trainer?.email
                                    }
                                ).catch((err: any) => console.error(`[Announcement-Trainer] Bulk email error:`, err));
                            }
                        }
                    }
                } catch (e) {
                    console.error('[Announcement-Trainer] Background task failed:', e);
                }
            });

            return announcement;
        } else {
            // Target Audience (ALL students of this trainer)
            const trainer = await prisma.user.findUnique({
                where: { id: userId },
                select: { name: true, phone: true, email: true }
            });

            const contactFooter = `\n\n---\n👤 المرسل: ${trainer?.name || 'المدرب'}\n${trainer?.phone ? `📞 الجوال: ${trainer.phone}\n` : ''}${trainer?.email ? `�œ‰️ البريد: ${trainer.email}` : ''}`;
            const fullMessage = data.message + contactFooter;

            const announcement = await (prisma.announcement.create as any)({
                data: {
                    title: data.title,
                    message: fullMessage,
                    targetAudience: data.courseId ? 'STUDENTS' : 'ALL',
                    senderId: userId,
                    courseId: data.courseId || null,
                    category: (data.category?.toUpperCase() as any) || 'GENERAL',
                    status: (data.status?.toUpperCase() as any) || (data.scheduledAt ? 'SCHEDULED' : 'SENT'),
                    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
                    sentAt: data.scheduledAt ? null : new Date(),
                    createdAt: new Date()
                }
            });

            if (courseIds.length === 0) {
                console.log(`[Announcement-Trainer] Broadcast skipped: Trainer has no courses.`);
                return announcement;
            }

            const activeStudents = await prisma.enrollment.findMany({
                where: {
                    courseId: { in: courseIds },
                    status: { in: ['ACTIVE', 'COMPLETED', 'PRELIMINARY', 'PENDING_PAYMENT'] },
                    deletedAt: null
                },
                select: { student: { select: { id: true, name: true, email: true } } },
                distinct: ['studentId']
            });

            console.log(`[Announcement-Trainer] Broadcasting to ${activeStudents.length} students (Running in background)`);

            if (activeStudents.length > 0) {
                // Background Tasks: Notifications & Emails
                setImmediate(async () => {
                    try {
                        await prisma.notification.createMany({
                            data: activeStudents.map((s: any) => ({
                                userId: s.student.id,
                                type: 'NEW_ANNOUNCEMENT' as any,
                                title: data.title,
                                message: fullMessage,
                                relatedEntityId: announcement.id
                            })),
                            skipDuplicates: true
                        });

                        for (const { student } of activeStudents as any[]) {
                            if (student.email) {
                                mailerService.sendAnnouncementEmail(
                                    student.email,
                                    student.name,
                                    data.title,
                                    data.message,
                                    {
                                        name: trainer?.name || 'المدرب',
                                        phone: trainer?.phone,
                                        email: trainer?.email
                                    }
                                ).catch((e: any) => console.error(`[Announcement-Trainer] Bulk email error:`, e));
                            }
                        }
                    } catch (e) {
                        console.error('[Announcement-Trainer] Background task failed:', e);
                    }
                });
            }

            auditService.logAction({
                action: 'CREATE',
                entityName: 'Announcement',
                entityId: 'system_log',
                description: 'إنشاء إعلان للطلاب',
                performedBy: userId
            }).catch(e => console.error(e));

            return announcement;
        }
    }

    /**
     * Get all announcements sent by this trainer
     */
    async getAnnouncements(userId: string) {
        const announcements = await (prisma.announcement as any).findMany({
            where: { senderId: userId },
            orderBy: { createdAt: 'desc' },
            include: {
                sender: { select: { id: true, name: true } },
                recipient: { select: { id: true, name: true } },
                course: { select: { id: true, title: true } },
            }
        });

        return announcements.map((a: any) => ({
            id: a.id,
            title: a.title,
            message: a.message,
            targetAudience: a.targetAudience?.toLowerCase(),
            category: a.category?.toLowerCase(),
            status: a.status?.toLowerCase(),
            scheduledAt: a.scheduledAt,
            sentAt: a.sentAt,
            createdAt: a.createdAt,
            courseId: a.courseId,
            course: a.course,
            sender: a.sender,
            recipient: a.recipient,
        }));
    }

    /**
     * Update an announcement (only if it belongs to this trainer)
     */
    async updateAnnouncement(userId: string, announcementId: string, data: { title?: string; message?: string }) {
        const existing = await (prisma.announcement as any).findFirst({
            where: { id: announcementId, senderId: userId }
        });
        if (!existing) throw new Error('الإعلان غير موجود أو لا تملك صلاحية تعديله');


        auditService.logAction({
            action: 'UPDATE',
            entityName: 'Announcement',
            entityId: 'system_log',
            description: 'تعديل إعلان',
            performedBy: userId
        }).catch(e => console.error(e));

        return (prisma.announcement as any).update({
            where: { id: announcementId },
            data: {
                ...(data.title && { title: data.title }),
                ...(data.message && { message: data.message }),
            }
        });
    }

    /**
     * Delete an announcement (only if it belongs to this trainer)
     */
    async deleteAnnouncement(userId: string, announcementId: string) {
        const existing = await (prisma.announcement as any).findFirst({
            where: { id: announcementId, senderId: userId }
        });
        if (!existing) throw new Error('الإعلان غير موجود أو لا تملك صلاحية حذف�‡');

        await (prisma.announcement as any).delete({ where: { id: announcementId } });

        auditService.logAction({
            action: 'DELETE',
            entityName: 'Announcement',
            entityId: 'system_log',
            description: 'حذف إعلان',
            performedBy: userId
        }).catch(e => console.error(e));

        return { success: true };
    }

    /**
     * Unenroll (cancel) a student from a trainer�™s course
     */
    async unenrollStudent(userId: string, courseId: string, enrollmentId: string, reason: string) {
        const course = await prisma.course.findFirst({
            where: { id: courseId, trainerId: userId },
        });
        if (!course) throw new Error('الدورة غير موجودة أو لا تنتمي لهذا المدرب');

        return prisma.$transaction(async (tx) => {
            // Delete associated payments
            await tx.payment.deleteMany({
                where: { enrollmentId: enrollmentId }
            });

            // Update enrollment status

            auditService.logAction({
                action: 'UPDATE',
                entityName: 'Enrollment',
                entityId: 'system_log',
                description: 'إلغاء تسجيل طالب من قبل المدرب',
                performedBy: userId
            }).catch(e => console.error(e));

            return tx.enrollment.update({
                where: { id: enrollmentId },
                data: {
                    status: 'CANCELLED',
                    cancellationReason: reason,
                },
            });
        });
    }

    /**
     * Get a single ACTIVE course by ID for public viewing
     */
    async getPublicCourseById(courseId: string, currentUserId?: string) {
        const course = await prisma.course.findFirst({
            where: { id: courseId, deletedAt: null },
            include: {
                trainer: {
                    select: {
                        name: true,
                        avatar: true,
                        email: true,
                        phone: true,
                        trainerProfile: {
                            select: { bio: true, specialties: true }
                        },
                        bankAccounts: {
                            select: {
                                id: true,
                                bankName: true,
                                accountName: true,
                                accountNumber: true,
                                iban: true,
                                isActive: true,
                            }
                        }
                    }
                },
                category: { select: { name: true } },
                sessions: {
                    where: { status: { not: 'CANCELLED' } },
                    orderBy: { startTime: 'asc' },
                    include: { room: { select: { id: true, name: true, location: true, locationUrl: true, institute: { select: { name: true, logo: true, email: true, phone: true, address: true, website: true, locationUrl: true, description: true, features: true, user: { select: { avatar: true } }, bankAccounts: { select: { id: true, bankName: true, accountName: true, accountNumber: true, iban: true, isActive: true } } } } } } },
                },
                roomBookings: {
                    include: {
                        room: { select: { id: true, name: true, location: true, locationUrl: true, institute: { select: { name: true, logo: true, email: true, phone: true, address: true, website: true, locationUrl: true, description: true, features: true, user: { select: { avatar: true } }, bankAccounts: { select: { id: true, bankName: true, accountName: true, accountNumber: true, iban: true, isActive: true } } } } } }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
                enrollments: {
                    where: { status: { in: ['ACTIVE', 'PRELIMINARY_APPROVED', 'PENDING_PAYMENT'] } },
                    select: { id: true },
                },
                institute: {
                    select: {
                        userId: true,
                        name: true,
                        logo: true,
                        email: true,
                        phone: true,
                        address: true,
                        website: true,
                        locationUrl: true,
                        description: true,
                        features: true,
                        user: { select: { avatar: true } },
                        bankAccounts: {
                            select: {
                                id: true,
                                bankName: true,
                                accountName: true,
                                accountNumber: true,
                                iban: true,
                                isActive: true,
                            }
                        }
                    }
                },
            }
        });

        if (!course) throw new Error('الدورة غير موجودة أو غير متاحة للعرض');

        const isOwner = currentUserId && (
            course.trainerId === currentUserId ||
            (course as any).institute?.userId === currentUserId
        );

        if (!isOwner && !['ACTIVE', 'PENDING_MINIMUM'].includes(course.status)) {
            throw new Error('الدورة غير موجودة أو غير متاحة للعرض');
        }

        const sessions = (course as any).sessions as any[];
        const sessionsCount = sessions.length;
        const firstSession = sessionsCount > 0 ? sessions[0] : null;
        const lastSession = sessionsCount > 0 ? sessions[sessionsCount - 1] : null;
        const timelineStartDate = firstSession ? firstSession.startTime : course.startDate;
        const timelineEndDate = lastSession ? lastSession.startTime : course.endDate;
        const weeksCount = (() => {
            if (!timelineStartDate || !timelineEndDate) return 0;
            const start = new Date(timelineStartDate);
            const end = new Date(timelineEndDate);
            const diffMs = Math.max(0, end.getTime() - start.getTime());
            const diffDaysInclusive = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
            return Math.max(1, Math.ceil(diffDaysInclusive / 7));
        })();

        // Fetch all staff trainers if staffTrainerIds is set (now multi-trainer only)
        const staffTrainerIds = (course as any).staffTrainerIds as string[] | undefined;
        let staffTrainers: { id: string; name: string; avatar: string | null; bio: string | null; email: string | null; phone: string | null; specialties: string[] }[] = [];
        if (staffTrainerIds && staffTrainerIds.length > 0) {
            const staffList = await prisma.instituteStaff.findMany({
                where: { id: { in: staffTrainerIds } },
                select: { id: true, name: true, avatar: true, bio: true, email: true, phone: true, specialties: true }
            });
            staffTrainers = staffList;
        }

        return {
            id: course.id,
            trainerId: course.trainerId,
            instituteId: course.instituteId,
            title: course.title,
            category: (course as any).category?.name ?? 'عام',
            shortDescription: course.shortDescription ?? '',
            description: course.description ?? '',
            image: course.image ?? null,
            price: Number(course.price),
            minStudents: course.minStudents,
            courseStatus: course.status, // 'ACTIVE' | 'PENDING_MINIMUM'
            startDate: timelineStartDate,
            endDate: timelineEndDate,
            sessionsCount,
            weeksCount,
            maxStudents: course.maxStudents,
            enrolledCount: (course as any).enrollments.length,
            prerequisites: course.prerequisites
                ? course.prerequisites.split(/\n|,/).map(s => s.trim()).filter(Boolean)
                : [],
            objectives: course.objectives,
            tags: course.tags,
            locationUrl: (course as any).roomBookings?.[0]?.room?.locationUrl ?? null,
            deliveryType: ['FLEXIBLE', 'CAPACITY_BASED'].includes((course as any).bookingTrigger) ? 'flexible'
                : (course as any).sessions[0]?.type === 'ONLINE' ? 'online'
                    : (course as any).sessions[0]?.type === 'IN_PERSON' ? 'in_person'
                        : (course as any).sessions.length > 0 ? 'hybrid' : 'online',
            sessions: (course as any).sessions.map((s: any) => ({
                id: s.id,
                topic: s.topic ?? null,
                startTime: s.startTime,
                endTime: s.endTime,
                type: s.type.toLowerCase(),
                status: s.status,
                meetingLink: s.meetingLink ?? null,
                location: s.location ?? null,
                roomId: s.roomId ?? null,
                room: s.room ? { id: s.room.id, name: s.room.name, location: s.room.location ?? null, locationUrl: (s.room as any).locationUrl ?? null } : null,
            })),
            staffTrainers, // قائمة جميع المدربين
            institute: ((course as any).institute || (course as any).roomBookings?.[0]?.room?.institute || (course as any).sessions?.[0]?.room?.institute) ? {
                name: ((course as any).institute || (course as any).roomBookings?.[0]?.room?.institute || (course as any).sessions?.[0]?.room?.institute).name,
                logo: ((course as any).institute || (course as any).roomBookings?.[0]?.room?.institute || (course as any).sessions?.[0]?.room?.institute).logo,
                email: ((course as any).institute || (course as any).roomBookings?.[0]?.room?.institute || (course as any).sessions?.[0]?.room?.institute).email,
                phone: ((course as any).institute || (course as any).roomBookings?.[0]?.room?.institute || (course as any).sessions?.[0]?.room?.institute).phone,
                address: ((course as any).institute || (course as any).roomBookings?.[0]?.room?.institute || (course as any).sessions?.[0]?.room?.institute).address,
                website: ((course as any).institute || (course as any).roomBookings?.[0]?.room?.institute || (course as any).sessions?.[0]?.room?.institute).website,
                locationUrl: ((course as any).institute || (course as any).roomBookings?.[0]?.room?.institute || (course as any).sessions?.[0]?.room?.institute).locationUrl,
                description: ((course as any).institute || (course as any).roomBookings?.[0]?.room?.institute || (course as any).sessions?.[0]?.room?.institute).description,
                features: ((course as any).institute || (course as any).roomBookings?.[0]?.room?.institute || (course as any).sessions?.[0]?.room?.institute).features ?? [],
            } : null,
            instructor: {
                name: (course as any).trainer?.name ?? (staffTrainers.length > 0 ? staffTrainers[0].name : ((course as any).institute?.name ?? 'مدرب')),
                avatar: (course as any).trainer?.avatar ?? (staffTrainers.length > 0 ? staffTrainers[0].avatar : ((course as any).institute?.logo ?? (course as any).institute?.user?.avatar ?? null)),
                email: (course as any).trainer?.email ?? (staffTrainers.length > 0 ? staffTrainers[0].email : ((course as any).institute?.email ?? null)),
                phone: (course as any).trainer?.phone ?? (staffTrainers.length > 0 ? staffTrainers[0].phone : ((course as any).institute?.phone ?? null)),
                bio: (course as any).trainer?.trainerProfile?.bio ?? (staffTrainers.length > 0 ? staffTrainers[0].bio : ((course as any).institute?.description ?? null)),
                specialties: (course as any).trainer?.trainerProfile?.specialties ?? (staffTrainers.length > 0 ? staffTrainers[0].specialties : []),
                bankAccounts: (course as any).trainer?.bankAccounts ?? (course as any).institute?.bankAccounts ?? [],
            },
        };
    }

    /**
     * Get all active halls across all institutes
     */
    async getHalls() {
        return prisma.room.findMany({
            where: { isActive: true },
            include: {
                institute: {
                    select: {
                        id: true,
                        name: true,
                        bankAccounts: {
                            select: { id: true, bankName: true, accountName: true, accountNumber: true, iban: true }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
    }

    async getHallById(hallId: string) {
        const room = await prisma.room.findFirst({
            where: { id: hallId, isActive: true },
            include: {
                institute: {
                    include: {
                        user: { select: { avatar: true } },
                        bankAccounts: {
                            select: { id: true, bankName: true, accountName: true, accountNumber: true, iban: true }
                        }
                    }
                }
            }
        });

        if (!room) throw new Error("القاعة غير موجودة أو غير نشطة");

        return {
            ...room,
            instituteName: room.institute?.name,
            instituteDescription: room.institute?.description,
            instituteLogo: room.institute?.logo || room.institute?.user?.avatar,
            bankAccounts: room.institute?.bankAccounts || [],
        };
    }

    /**
     * Parse room availability � supports both legacy array format and new object format
     */
    private parseRoomAvailability(availability: any): {
        slots: { day: string; startTime: string; endTime: string }[];
        blackoutPeriods: { id: string; label: string; startDate: string; endDate: string }[]
    } {
        if (!availability) return { slots: [], blackoutPeriods: [] };
        if (Array.isArray(availability)) return { slots: availability, blackoutPeriods: [] };
        return {
            slots: availability.slots ?? [],
            blackoutPeriods: availability.blackoutPeriods ?? []
        };
    }

    /**
     * Expand blackout periods into per-day full-day blocked ranges
     */
    private expandBlackoutPeriods(
        blackoutPeriods: { id: string; label: string; startDate: string; endDate: string }[]
    ): { startTime: Date; endTime: Date }[] {
        const blocked: { startTime: Date; endTime: Date }[] = [];
        for (const bp of blackoutPeriods) {
            // Use noon UTC to prevent date-boundary shifts across server timezones
            const cursor = new Date(bp.startDate + 'T12:00:00Z');
            const end = new Date(bp.endDate + 'T12:00:00Z');
            while (cursor <= end) {
                const dateStr = cursor.toISOString().substring(0, 10);
                blocked.push({
                    startTime: new Date(`${dateStr}T00:00:00Z`),
                    endTime: new Date(`${dateStr}T23:59:59Z`),
                });
                cursor.setUTCDate(cursor.getUTCDate() + 1);
            }
        }
        return blocked;
    }

    /**
     * Get availability for a specific hall (no ownership check)
     * Returns:
     *   - availability: the hall's defined working hours schedule
     *   - bookedSessions: all time ranges that are already taken (from both Sessions and RoomBookings)
     */
    async getHallAvailability(hallId: string) {
        const room = await prisma.room.findFirst({
            where: { id: hallId, isActive: true },
        });

        if (!room) throw new Error("القاعة غير موجودة أو غير نشطة");

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // 1. Get all active RoomBookings for this room (any non-cancelled status)
        const activeRoomBookings = await prisma.roomBooking.findMany({
            where: {
                roomId: room.id,
                status: { not: 'CANCELLED' },
                endDate: { gte: yesterday },
            },
            select: { id: true, defaultStartTime: true, defaultEndTime: true, startDate: true, endDate: true }
        });

        const activeBookingIds = activeRoomBookings.map(rb => rb.id);

        // 2. Get all sessions tied directly to this room OR via a room booking
        const sessions = await prisma.session.findMany({
            where: {
                status: { not: 'CANCELLED' },
                startTime: { gte: yesterday },
                OR: [
                    { roomId: room.id },
                    { roomBookingId: { in: activeBookingIds } }
                ]
            },
            select: { startTime: true, endTime: true }
        });

        // 3. For RoomBookings that have NO sessions yet (e.g. PENDING_APPROVAL without sessions)
        //    we still block the booking's defaultStartTime..defaultEndTime on each day in range
        const sessionBookingIds = new Set(
            (await prisma.session.findMany({
                where: { roomBookingId: { in: activeBookingIds } },
                select: { roomBookingId: true }
            })).map(s => s.roomBookingId)
        );

        const bookingsWithoutSessions = activeRoomBookings.filter(rb => !sessionBookingIds.has(rb.id));

        // Expand bookings without sessions into a list of {startTime, endTime} per day in their range
        const extraBlocked: { startTime: Date; endTime: Date }[] = [];
        for (const rb of bookingsWithoutSessions) {
            const cursor = new Date(rb.startDate);
            const end = new Date(rb.endDate);
            while (cursor <= end) {
                const dateStr = cursor.toISOString().substring(0, 10);
                const sTime = rb.defaultStartTime.toISOString().substring(11, 16); // HH:MM
                const eTime = rb.defaultEndTime.toISOString().substring(11, 16);
                extraBlocked.push({
                    startTime: new Date(`${dateStr}T${sTime}:00`),
                    endTime: new Date(`${dateStr}T${eTime}:00`),
                });
                cursor.setDate(cursor.getDate() + 1);
            }
        }

        const parsed = this.parseRoomAvailability((room as any).availability);
        const blackoutBlocks = this.expandBlackoutPeriods(parsed.blackoutPeriods);

        return {
            availability: parsed,
            bookedSessions: [...sessions, ...extraBlocked, ...blackoutBlocks]
        };
    }

    /**
     * Book a hall directly without creating a course
     */
    async bookHall(trainerId: string, hallId: string, sessions: { date: string; slot: number }[], receiptFile?: string, notes?: string) {
        const room = await prisma.room.findFirst({
            where: { id: hallId, isActive: true }
        });

        if (!room) {
            throw new Error('القاعة غير موجودة أو غير متاحة');
        }

        if (!sessions || sessions.length === 0) {
            throw new Error('يجب تحديد موعد واحد على الأقل للحجز');
        }

        // Sort sessions by date and slot
        const sortedSessions = [...sessions].sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.slot - b.slot;
        });

        const startDate = new Date(sortedSessions[0].date);
        const endDate = new Date(sortedSessions[sortedSessions.length - 1].date);

        // Calculate total hours
        const totalHours = sessions.length;
        const totalAmount = Number(room.pricePerHour) * totalHours;

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Room Booking
            const roomBooking = await tx.roomBooking.create({
                data: {
                    roomId: hallId,
                    requestedById: trainerId,
                    bookingMode: 'CUSTOM_TIME',
                    totalPrice: totalAmount,
                    startDate,
                    endDate,
                    defaultStartTime: new Date(`${startDate.toISOString().substring(0, 10)}T08:00:00`),
                    defaultEndTime: new Date(`${endDate.toISOString().substring(0, 10)}T18:00:00`),
                    status: receiptFile ? 'PENDING_APPROVAL' : 'PENDING_PAYMENT',
                    notes: notes || 'حجز مباشر للقاعة من قبل المدرب'
                }
            });

            // 2. Create individual Sessions
            const createdSessions = await Promise.all(sessions.map(s => {
                const sDate = s.date;
                const startTime = new Date(`${sDate}T${String(s.slot).padStart(2, '0')}:00:00`);
                const endTime = new Date(`${sDate}T${String(s.slot + 1).padStart(2, '0')}:00:00`);
                return tx.session.create({
                    data: {
                        roomId: hallId,
                        roomBookingId: roomBooking.id,
                        type: 'IN_PERSON',
                        startTime,
                        endTime,
                        status: 'SCHEDULED'
                    }
                });
            }));

            // 3. Create Payment record if receipt provided
            if (receiptFile) {
                await tx.payment.create({
                    data: {
                        amount: totalAmount,
                        currency: 'YER',
                        status: 'PENDING_REVIEW',
                        depositSlipImage: receiptFile,
                        notes: 'تحويل بنكي لحجز مباشر',
                        roomBookingId: roomBooking.id
                    }
                });
            }

            return {
                roomBooking,
                sessions: createdSessions
            };
        });

        // ── Notify Institute of new booking request ──
        const institute = await prisma.institute.findUnique({
            where: { id: room.instituteId },
            include: { user: { select: { id: true, name: true, email: true, phone: true } } }
        });
        const trainer = await prisma.user.findUnique({ where: { id: trainerId }, select: { name: true } });

        if (institute && trainer && result.roomBooking) {
            await notificationService.createNotification({
                userId: institute.user.id,
                type: 'NEW_BOOKING_REQUEST',
                title: 'طلب حجز قاعة جديد',
                message: `طلب المدرب ${trainer.name} حجز قاعة "${room.name}"`,
                relatedEntityId: result.roomBooking.id,
                actionUrl: '/institute/room-bookings',
                emailFn: institute.user.email ? () => mailerService.sendNewBookingRequest(institute.user.email!, institute.user.name, trainer.name, room.name) : undefined,
                whaFn: institute.user.phone ? () => whatsAppService.notifyNewBookingRequest(institute.user.phone!, institute.user.name, trainer.name, room.name) : undefined
            });
        }


        auditService.logAction({
            action: 'CREATE',
            entityName: 'RoomBooking',
            entityId: 'system_log',
            description: 'طلب حجز قاعة',
            performedBy: trainerId
        }).catch(e => console.error(e));

        return result;

    }

    /**
     * Create a new course (Trainer)
     * Handles standard courses, or "in_person" courses where a hall is booked and a payment receipt is required.
     */
    async createCourse(userId: string, data: any, paymentReceiptPath?: string) {
        // Validate Trainer
        const trainer = await prisma.user.findUnique({
            where: { id: userId, role: 'TRAINER' }
        });
        if (!trainer) throw new Error("لم يتم العثور على المدرب");

        // Validate required fields
        if (data.minStudents === undefined || data.minStudents === '' || data.minStudents === null) {
            throw new Error("يرجى تحديد الحد الأدنى لعدد الطلاب");
        }

        const sessionType = data.deliveryType === "online" ? "ONLINE" : "IN_PERSON";

        const mappedSessions = (data.sessions || []).map((session: any) => ({
            startTime: new Date(`${session.date}T${session.startTime}`),
            endTime: new Date(`${session.date}T${session.endTime}`),
            type: sessionType,
            status: "SCHEDULED" as const,
            location: session.location,
            meetingLink: session.meetingLink || data.meetingLink || null,
            topic: session.topic || "",
        }));

        // تحديد التواريخ: null لدورات انتظار اكتمال العدد والمسودات
        let finalStartDate: Date | null = null;
        let finalEndDate: Date | null = null;

        if (data.startDate && data.startDate !== '') {
            finalStartDate = new Date(data.startDate);
        }
        if (data.endDate && data.endDate !== '') {
            finalEndDate = new Date(data.endDate);
        }

        if (mappedSessions.length > 0) {
            const sortedSessions = [...mappedSessions].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
            finalStartDate = sortedSessions[0].startTime;
            finalEndDate = sortedSessions[sortedSessions.length - 1].endTime;
        }

        let instituteId = data.instituteId;
        if (!instituteId && data.hallId) {
            // Need to derive institute from the selected hall
            const room = await prisma.room.findUnique({ where: { id: data.hallId } });
            if (!room) throw new Error("القاعة المحددة غير موجودة");
            instituteId = room.instituteId;
        }

        // 1. Create Course
        const course = await prisma.course.create({
            data: {
                title: data.title,
                description: data.description,
                shortDescription: data.shortDescription,
                price: Number(data.price),
                duration: Number(data.duration),
                startDate: finalStartDate,
                endDate: finalEndDate,
                maxStudents: Number(data.maxStudents),
                minStudents: Number(data.minStudents),
                status: (data.status === 'ACTIVE' && sessionType === 'IN_PERSON') ? 'PENDING_REVIEW' : (data.status || 'DRAFT'),
                image: data.image,
                trainerId: trainer.id,
                instituteId: instituteId || null,
                categoryId: data.categoryId,
                objectives: data.objectives || [],
                prerequisites: data.prerequisites ? data.prerequisites.join('\n') : null,
                tags: data.tags || [],
                sessions: data.hallId ? undefined : {
                    create: mappedSessions
                }
            }
        });

        // 2. Create Room Booking & Payment (if physical hall selected)
        if (data.hallId && mappedSessions.length >= 0) {
            if (!paymentReceiptPath) {
                // Technically shouldn't happen due to frontend validation, but protecting backend
                throw new Error("يجب إرفا�‚ إيصال ا�„دفع لحجز القاعة");
            }

            const room = await prisma.room.findUnique({ where: { id: data.hallId } });
            if (!room) throw new Error("القاعة المحددة غير موجودة");

            const totalHours = mappedSessions.reduce((acc: number, session: any) => {
                const diffMs = session.endTime.getTime() - session.startTime.getTime();
                return acc + (diffMs / (1000 * 60 * 60));
            }, 0);

            const totalPrice = totalHours * Number(room.pricePerHour);

            const roomBooking = await prisma.roomBooking.create({
                data: {
                    bookingMode: "CUSTOM_TIME",
                    startDate: finalStartDate!, // guaranteed non-null � only reached when sessions exist
                    endDate: finalEndDate!,
                    selectedDays: [],
                    defaultStartTime: mappedSessions[0]?.startTime || new Date(),
                    defaultEndTime: mappedSessions[0]?.endTime || new Date(),
                    status: "PENDING_APPROVAL", // Pending Institute Owner approval
                    totalPrice: totalPrice,
                    roomId: room.id,
                    requestedById: userId,
                    courseId: course.id,
                    purpose: `حجز لدورة المدرب: ${course.title}`
                }
            });

            // Create Payment Request
            await prisma.payment.create({
                data: {
                    amount: totalPrice,
                    currency: "YER", // Defaulting to Yemen Rial
                    depositSlipImage: paymentReceiptPath,
                    notes: `إيصال دفع لقيمة حجز قاعة (${room.name}) للدورة (${course.title})`,
                    status: "PENDING_REVIEW",
                    roomBookingId: roomBooking.id
                }
            });

            // Associate sessions with both Course and RoomBooking
            if (mappedSessions.length > 0) {
                await prisma.session.createMany({
                    data: mappedSessions.map((session: any) => ({
                        ...session,
                        courseId: course.id,
                        roomBookingId: roomBooking.id,
                        roomId: room.id
                    }))
                });
            }

            // ── Notify Institute of new booking request ──
            const institute = await prisma.institute.findUnique({
                where: { id: room.instituteId },
                include: { user: { select: { id: true, name: true, email: true, phone: true } } }
            });

            if (institute && trainer && roomBooking) {
                await notificationService.createNotification({
                    userId: institute.user.id,
                    type: 'NEW_BOOKING_REQUEST',
                    title: 'طلب حجز قاعة جديد',
                    message: `طلب المدرب ${trainer.name} حجز قاعة "${room.name}" لدورة "${course.title}"`,
                    relatedEntityId: roomBooking.id,
                    actionUrl: '/institute/room-bookings',
                    emailFn: institute.user.email ? () => mailerService.sendNewBookingRequest(institute.user.email!, institute.user.name, trainer.name, room.name) : undefined,
                    whaFn: institute.user.phone ? () => whatsAppService.notifyNewBookingRequest(institute.user.phone!, institute.user.name, trainer.name, room.name) : undefined
                });
            }
        }


        auditService.logAction({
            action: 'CREATE',
            entityName: 'Course',
            entityId: 'system_log',
            description: 'إنشاء دورة جديدة للمدرب',
            performedBy: userId
        }).catch(e => console.error(e));

        return course;
    }

    /**
     * Get the trainer's own profile (user + trainerProfile)
     */
    async getProfile(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatar: true,
                role: true,
                status: true,
                createdAt: true,
                trainerProfile: {
                    select: {
                        bio: true,
                        cvUrl: true,
                        specialties: true,
                        certificatesUrls: true,
                        verificationStatus: true,
                    },
                },
            },
        });

        if (!user) throw new Error('المستخدم غير موجود');

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone ?? '',
            avatar: user.avatar ?? null,
            role: user.role.toLowerCase(),
            status: user.status.toLowerCase(),
            createdAt: user.createdAt,
            bio: user.trainerProfile?.bio ?? '',
            cvUrl: user.trainerProfile?.cvUrl ?? null,
            specialties: user.trainerProfile?.specialties ?? [],
            certificatesUrls: user.trainerProfile?.certificatesUrls ?? [],
            verificationStatus: user.trainerProfile?.verificationStatus ?? null,
        };
    }

    /**
     * Update the trainer's own profile (name, phone, bio, specialties, email)
     */
    async updateProfile(userId: string, data: { name?: string; phone?: string; bio?: string; specialties?: string[]; avatarPath?: string; email?: string }) {
        // If email is provided, check uniqueness
        if (data.email) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    email: data.email,
                    NOT: { id: userId }
                }
            });
            if (existingUser) {
                throw new Error('البريد الإلكتروني موجود با�„فع�„');
            }
        }

        // Update base user fields
        await prisma.user.update({
            where: { id: userId },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.phone !== undefined && { phone: data.phone }),
                ...(data.avatarPath && { avatar: data.avatarPath }),
                ...(data.email && { email: data.email }),
            },
        });

        // Update trainer profile fields
        await prisma.trainerProfile.upsert({
            where: { userId },
            create: {
                userId,
                bio: data.bio ?? '',
                specialties: data.specialties ?? [],
                certificatesUrls: [],
            },
            update: {
                ...(data.bio !== undefined && { bio: data.bio }),
                ...(data.specialties !== undefined && { specialties: data.specialties }),
            },
        });


        auditService.logAction({
            action: 'UPDATE',
            entityName: 'TrainerProfile',
            entityId: 'system_log',
            description: 'تحديث ا�„�…�„ف الشخصي للمدرب',
            performedBy: userId
        }).catch(e => console.error(e));

        return this.getProfile(userId);
    }

    /**
     * Change password � validates old password before updating
     */
    async changePassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('المستخدم غير موجود');

        const isValid = await comparePassword(currentPassword, user.password);
        if (!isValid) throw new Error('كلمة المرور الحالية غير صحيحة');

        const hashed = await hashPassword(newPassword);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashed, failedLoginAttempts: 0, lockUntil: null },
        });


        auditService.logAction({
            action: 'UPDATE',
            entityName: 'User',
            entityId: 'system_log',
            description: 'تغيير كلمة المرور للمدرب',
            performedBy: userId
        }).catch(e => console.error(e));

        return { message: 'تم تغيير كلمة المرور بنجاح' };
    }

    /**
     * Get all unique students enrolled in any of this trainer's courses
     */
    async getAllStudents(userId: string) {
        // Get all trainer course IDs (all statuses as requested)
        const courses = await prisma.course.findMany({
            where: {
                trainerId: userId,
            },
            select: { id: true, title: true },
        });
        const courseIds = courses.map(c => c.id);
        const courseMap = Object.fromEntries(courses.map(c => [c.id, c.title]));

        if (courseIds.length === 0) return { students: [], totalStudents: 0, totalEnrollments: 0, totalEarnings: 0 };

        // Get all enrollments for these courses (All cases, excluding deleted ones)
        const enrollments = await prisma.enrollment.findMany({
            where: {
                courseId: { in: courseIds },
                deletedAt: null,
            },
            select: {
                id: true,
                courseId: true,
                status: true,
                enrolledAt: true,
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        avatar: true,
                        deletedAt: true,
                    },
                },
            },
            orderBy: { enrolledAt: 'desc' },
        });

        // Calculate total earnings for these students (Approved payments only)
        const earningsResult = await prisma.payment.aggregate({
            where: {
                status: 'APPROVED',
                enrollment: {
                    courseId: { in: courseIds }
                }
            },
            _sum: { amount: true }
        });
        const totalEarnings = Number(earningsResult._sum.amount || 0);

        // Group enrollments by student
        const studentMap = new Map<string, {
            id: string; name: string; email: string; phone: string | null; avatar: string | null;
            enrolledCourses: { courseId: string; courseTitle: string; enrollmentId: string; status: string; enrolledAt: Date }[];
            lastActivity: Date;
        }>();

        for (const e of enrollments) {
            const s = e.student;
            // Skip soft-deleted students
            if (s.deletedAt) continue;

            if (!studentMap.has(s.id)) {
                studentMap.set(s.id, {
                    id: s.id,
                    name: s.name,
                    email: s.email,
                    phone: s.phone,
                    avatar: s.avatar,
                    enrolledCourses: [],
                    lastActivity: e.enrolledAt,
                });
            }
            const entry = studentMap.get(s.id)!;
            entry.enrolledCourses.push({
                courseId: e.courseId,
                courseTitle: courseMap[e.courseId] ?? '',
                enrollmentId: e.id,
                status: e.status.toLowerCase(),
                enrolledAt: e.enrolledAt,
            });
            if (e.enrolledAt > entry.lastActivity) entry.lastActivity = e.enrolledAt;
        }

        const students = Array.from(studentMap.values()).map(s => ({
            ...s,
            enrollments: s.enrolledCourses, // Add alias for frontend compatibility
            totalCourses: s.enrolledCourses.length,
        }));

        return {
            students,
            totalStudents: students.length,
            totalEnrollments: enrollments.length,
            totalEarnings,
        };
    }

    /**
     * Resubmit a rejected hall booking payment
     */
    async resubmitBookingPayment(userId: string, courseId: string, bookingId: string, paymentReceiptPath: string) {
        // 1. Validate Ownership and rejection status
        const booking = await prisma.roomBooking.findFirst({
            where: {
                id: bookingId,
                courseId: courseId,
                requestedById: userId,
                status: 'REJECTED'
            }
        });

        if (!booking) throw new Error("لم يتم العثور على طلب الحجز ا�„�…رف�ˆض");

        // 2. Update Booking Status back to PENDING_APPROVAL
        const updatedBooking = await prisma.roomBooking.update({
            where: { id: bookingId },
            data: {
                status: 'PENDING_APPROVAL',
                rejectionReason: null // Clear previous reason
            }
        });

        // 3. Create a NEW payment request
        await prisma.payment.create({
            data: {
                amount: booking.totalPrice,
                currency: "YER",
                depositSlipImage: paymentReceiptPath,
                notes: `إعادة إرسال إيصال ا�„دفع بعد ا�„رفض لطلب الحجز (${bookingId})`,
                status: "PENDING_REVIEW",
                roomBookingId: bookingId
            }
        });


        auditService.logAction({
            action: 'CREATE',
            entityName: 'Payment',
            entityId: 'system_log',
            description: 'إعادة إرسال إيصال ا�„دفع لحجز قاعة',
            performedBy: userId
        }).catch(e => console.error(e));

        return updatedBooking;
    }

    /**
     * Get enrollments for courses owned by this trainer
     */
    async getEnrollments(trainerId: string) {
        return prisma.enrollment.findMany({
            where: {
                course: {
                    trainerId: trainerId
                }
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        avatar: true
                    }
                },
                course: {
                    select: {
                        id: true,
                        title: true,
                        price: true
                    }
                },
                payments: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1
                }
            },
            orderBy: {
                enrolledAt: 'desc'
            }
        });
    }

    /**
     * Update enrollment status (Accept/Reject preliminary, Reject payment)
     * For PENDING_MINIMUM courses: accepted students are kept in PRELIMINARY and notified to wait.
     */
    async updateEnrollmentStatus(trainerId: string, enrollmentId: string, status: 'ACTIVE' | 'CANCELLED' | 'REJECT_PAYMENT' | 'REJECT_ENROLLMENT', reason?: string) {
        const enrollment = await prisma.enrollment.findFirst({
            where: {
                id: enrollmentId,
                course: { trainerId }
            },
            include: {
                payments: true,
                course: true,
                student: { select: { id: true, name: true, email: true, phone: true } },
            },
        });

        if (!enrollment) {
            throw new Error('التسجيل غير موجود أو لا تنتمي لدوراتك');
        }

        const courseTitle = enrollment.course.title;
        const student = enrollment.student;

        // ── Reject Payment ─────────────────────────────────────────────────────
        if (status === 'REJECT_PAYMENT') {
            const latestPayment = enrollment.payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
            if (!latestPayment || latestPayment.status !== 'PENDING_REVIEW') {
                throw new Error('لا يوجد دفعة معلقة للمراجعة');
            }
            await prisma.payment.update({
                where: { id: latestPayment.id },
                data: { status: 'REJECTED', reviewedBy: trainerId, reviewedAt: new Date(), rejectionReason: reason || 'تم ا�„رفض من قبل المدرب' },
            });

            // Notify student about payment rejection
            await notificationService.createNotification({
                userId: student.id,
                type: 'PAYMENT_REJECTED',
                title: 'تم رفض سند ا�„دفع',
                message: `تم رفض سند ا�„دفع الخاص بك ف�Š دورة "${courseTitle}".${reason ? ` السبب: ${reason}` : ''} يرجى إعادة رفع سند ا�„دفع الصحيح.`,
                actionUrl: `/student/courses/${enrollment.courseId}`,
                relatedEntityId: enrollmentId,
                emailFn: student.email
                    ? () => mailerService.sendPaymentRejected(student.email!, student.name, courseTitle, reason)
                    : undefined,
                whaFn: student.phone
                    ? () => (whatsAppService as any).notifyPaymentRejected?.(student.phone!, student.name, courseTitle, reason) ?? Promise.resolve()
                    : undefined,
            });

            return { ...enrollment, status: enrollment.status, paymentStatus: 'REJECTED' };
        }

        // �� Reject Preliminary Enrollment (without cancelling) ������������������������������
        if (status === 'REJECT_ENROLLMENT') {
            if (enrollment.status !== 'PRELIMINARY' && enrollment.status !== 'PRELIMINARY_APPROVED') {
                throw new Error('لا يمكن رفض طلب التسجيل ف�Š هذه المرحلة');
            }
            if (!reason || !String(reason).trim()) {
                throw new Error('سبب ا�„رفض مطلوب');
            }

            const updated = await prisma.enrollment.update({
                where: { id: enrollmentId },
                data: {
                    status: 'REJECTED' as any,
                    rejectionReason: String(reason).trim(),
                    rejectedAt: new Date(),
                    rejectedById: trainerId,
                } as any,
            });

            await notificationService.createNotification({
                userId: student.id,
                type: 'ENROLLMENT_REJECTED',
                title: 'تم رفض طلب التسجيل',
                message: `تم رفض طلب تسجيلك ف�Š دورة "${courseTitle}". السبب: ${String(reason).trim()}. يمكنك تعديل بياناتك ثم إرسال طلب تسجيل جديد.`,
                actionUrl: `/student/courses/${enrollment.courseId}`,
                relatedEntityId: enrollmentId,
                emailFn: student.email ? () => mailerService.sendEnrollmentRejected(student.email!, student.name, courseTitle, reason) : undefined,
                whaFn: student.phone ? () => whatsAppService.notifyEnrollmentRejected(student.phone!, student.name, courseTitle, reason) : undefined,
            });

            return updated;
        }


        // ── Determine target enrollment status ────────────────────────────────────────
        const isPendingMinimumCourse = enrollment.course.status === 'PENDING_MINIMUM';
        const price = Number(enrollment.course.price);

        let targetStatus: EnrollmentStatus;
        if (status === 'CANCELLED') {
            targetStatus = 'CANCELLED';
        } else if (enrollment.status === 'PRELIMINARY') {
            if (isPendingMinimumCourse) {
                // Transition to PRELIMINARY_APPROVED - student must wait for minimum threshold + owner setup
                targetStatus = 'PRELIMINARY_APPROVED';
            } else if (price > 0) {
                targetStatus = 'PENDING_PAYMENT';
            } else {
                targetStatus = 'ACTIVE';
            }
        } else if (status === 'ACTIVE' && enrollment.payments.length > 0) {
            targetStatus = 'ACTIVE';
        } else {
            targetStatus = status as EnrollmentStatus;
        }

        const updateData: any = { status: targetStatus };
        if (reason) updateData.cancellationReason = reason;

        if (targetStatus === 'CANCELLED') {
            // Delete associated payments when cancelling
            await prisma.payment.deleteMany({ where: { enrollmentId } });
        }

        const updatedEnrollment = await prisma.enrollment.update({
            where: { id: enrollmentId },
            data: updateData,
        });

        // Approve latest payment if moving to ACTIVE
        if (targetStatus === 'ACTIVE' && enrollment.payments.length > 0) {
            const latestPayment = enrollment.payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
            if (latestPayment?.status === 'PENDING_REVIEW') {
                await prisma.payment.update({
                    where: { id: latestPayment.id },
                    data: { status: 'APPROVED', reviewedBy: trainerId, reviewedAt: new Date(), notes: 'تم القبول من قبل المدرب' },
                });
            }
        }

        // ── Notifications (fire-and-forget) ──────────────────────────────────────────
        setImmediate(async () => {
            try {
                if (isPendingMinimumCourse && targetStatus === 'PRELIMINARY_APPROVED') {
                    // Notify student: accepted but waiting for minimum
                    const courseUrl = `${FRONTEND_URL}/student/courses/${enrollment.courseId}`;
                    await notificationService.createNotification({
                        userId: student.id,
                        type: 'PRELIMINARY_ACCEPTED_WAITING',
                        title: 'تم قبول تسجيلك المبدئي ✓',
                        message: `�‚ُب�„ طلبك ف�Š دورة "${courseTitle}". الدورة بانتظار اكتمال الحد الأدنى (${enrollment.course.minStudents} طالب). سيتم إشعارك عند جاهزية الدورة.`,
                        actionUrl: `/student/courses/${enrollment.courseId}`,
                        relatedEntityId: enrollmentId,
                        emailFn: student.email
                            ? () => mailerService.sendPreliminaryAcceptedWaitingEmail(
                                student.email!, student.name, courseTitle, enrollment.course.minStudents, courseUrl
                            ) : undefined,
                        whaFn: student.phone
                            ? () => whatsAppService.notifyEnrollmentPreliminaryAccepted(student.phone!, student.name, courseTitle)
                            : undefined,
                    });

                    // Check if minimum is now reached � notify the trainer (owner)
                    await this.checkAndTriggerMinimumThreshold(enrollment.courseId, trainerId);

                } else if (targetStatus === 'PENDING_PAYMENT') {
                    await notificationService.createNotification({
                        userId: student.id,
                        type: 'ENROLLMENT_PRELIMINARY_ACCEPTED',
                        title: 'تم قبولك مبدئياً',
                        message: `تم قبول طلبك مبدئياً ف�Š دورة "${courseTitle}". يرجى إكمال عملية ا�„دفع.`,
                        relatedEntityId: enrollmentId,
                        actionUrl: `/student/my-courses`,
                        emailFn: student.email ? () => mailerService.sendEnrollmentPreliminaryAccepted(student.email!, student.name, courseTitle) : undefined,
                        whaFn: student.phone ? () => whatsAppService.notifyEnrollmentPreliminaryAccepted(student.phone!, student.name, courseTitle) : undefined,
                    });
                } else if (targetStatus === 'ACTIVE') {
                    await notificationService.createNotification({
                        userId: student.id,
                        type: enrollment.payments.length > 0 ? 'PAYMENT_APPROVED' : 'ENROLLMENT_FINAL_ACCEPTED',
                        title: enrollment.payments.length > 0 ? 'تم قبول ا�„دفع ✓' : 'تم قبولك نهائياً',
                        message: enrollment.payments.length > 0
                            ? `تم التحقق من دفعت�ƒ لدورة "${courseTitle}" �ˆا�„�…�ˆاف�‚ة عليها.`
                            : `تهانينا! تم تأكيد تسجيلك ف�Š دورة "${courseTitle}".`,
                        relatedEntityId: enrollmentId,
                        actionUrl: `/student/my-courses`,
                        emailFn: student.email
                            ? () => (enrollment.payments.length > 0
                                ? mailerService.sendPaymentApproved(student.email!, student.name, courseTitle)
                                : mailerService.sendEnrollmentFinalAccepted(student.email!, student.name, courseTitle))
                            : undefined,
                        whaFn: student.phone
                            ? () => (enrollment.payments.length > 0
                                ? whatsAppService.notifyPaymentApproved(student.phone!, student.name, courseTitle)
                                : whatsAppService.notifyEnrollmentFinalAccepted(student.phone!, student.name, courseTitle))
                            : undefined,
                    });
                } else if (targetStatus === 'CANCELLED') {
                    const isCancellation = enrollment.status === 'ACTIVE' || enrollment.status === 'COMPLETED';
                    const title = isCancellation ? 'تم إلغاء تسجيلك' : 'تم رفض تسجيلك';
                    const messageAction = isCancellation ? 'تم إلغاء تسجيلك ف�Š دورة' : '�†أسف�Œ تم رفض تسجيلك ف�Š دورة';
                    const message = `${messageAction} "${courseTitle}".${reason ? ` السبب: ${reason}` : ''}`;

                    await notificationService.createNotification({
                        userId: student.id,
                        type: 'ENROLLMENT_REJECTED',
                        title: title,
                        message: message,
                        relatedEntityId: enrollmentId,
                        actionUrl: `/student/my-courses`,
                        emailFn: student.email ? () => mailerService.sendEnrollmentRejected(student.email!, student.name, courseTitle, reason, isCancellation) : undefined,
                        whaFn: student.phone ? () => whatsAppService.notifyEnrollmentRejected(student.phone!, student.name, courseTitle, reason, isCancellation) : undefined,
                    });
                }
            } catch (e) {
                console.error('[TrainerService] updateEnrollmentStatus notification error:', e);
            }
        });


        auditService.logAction({
            action: 'UPDATE',
            entityName: 'Enrollment',
            entityId: 'system_log',
            description: 'تحديث حالة تسجيل طالب من قبل المدرب',
            performedBy: trainerId
        }).catch(e => console.error(e));

        return updatedEnrollment;
    }

    /**
     * Check if a PENDING_MINIMUM trainer course has reached its minimum threshold.
     * If yes, notify the trainer ONLY (students still wait for sessions to be added).
     */
    private async checkAndTriggerMinimumThreshold(courseId: string, trainerUserId: string): Promise<void> {
        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course || course.status !== 'PENDING_MINIMUM') return;

        const acceptedCount = await prisma.enrollment.count({
            where: { courseId, status: 'PRELIMINARY_APPROVED', deletedAt: null },
        });
        if (acceptedCount < course.minStudents) return;

        const alreadyNotified = await prisma.notification.findFirst({
            where: { userId: trainerUserId, type: 'MINIMUM_REACHED' as any, relatedEntityId: courseId },
        });
        if (alreadyNotified) return;

        const trainer = await prisma.user.findUnique({ where: { id: trainerUserId }, select: { name: true, email: true } });
        const setupPath = `/trainer/courses/${courseId}/edit?tab=schedule`;
        const setupUrl = `${FRONTEND_URL}${setupPath}`;

        await notificationService.createNotification({
            userId: trainerUserId,
            type: 'MINIMUM_REACHED',
            title: `🎉 اكتمل الحد الأدنى ف�Š دورة "${course.title}"`,
            message: `وصل عدد الطلاب المقبولين مبدئياً إلى ${course.minStudents}. يرجى إكمال إعداد الدورة (الجلسات + المواعيد) �„تفع�Š�„�‡ا.`,
            actionUrl: setupPath,
            relatedEntityId: courseId,
            emailFn: trainer?.email
                ? () => mailerService.sendMinimumReachedEmail(trainer.email!, trainer?.name ?? 'المدرب', course.title, course.minStudents, setupUrl)
                : undefined,
        });
    }

    /**
     * Manually activate a PENDING_MINIMUM online course (trainer flow).
     * Validates ownership and threshold, then calls institute service shared logic.
     */
    async activatePendingMinimumCourse(trainerUserId: string, courseId: string): Promise<{ courseId: string }> {
        const trainer = await (prisma as any).trainer.findUnique({ where: { userId: trainerUserId } });
        if (!trainer) throw new Error('المدرب غير موجود');

        const course = await (prisma.course as any).findFirst({
            where: { id: courseId, trainerId: trainer.id },
            include: { _count: { select: { enrollments: { where: { status: 'PRELIMINARY_APPROVED', deletedAt: null } } } } }
        });

        if (!course) throw new Error('الدورة غير موجودة أو لا تنتمي لك');
        if (course.status !== 'PENDING_MINIMUM') throw new Error('هذه الدورة لا تحتاج إلى تفع�Š�„ يدوي');

        const acceptedCount = course._count.enrollments;
        if (acceptedCount < course.minStudents) {
            throw new Error(`لم يكتمل الحد الأدنى بعد (${acceptedCount}/${course.minStudents})`);
        }

        // Delegate to institute service which has the full notify logic
        const instituteService = (await import('./institute.service')).default;
        await instituteService.activatePendingMinimumCourse(trainerUserId, courseId);
        return { courseId };
    }

    /**
     * Get all room bookings requested by this trainer
     */
    async getRoomBookings(userId: string) {
        return prisma.roomBooking.findMany({
            where: { requestedById: userId },
            include: {
                room: {
                    select: {
                        id: true,
                        name: true,
                        capacity: true,
                        type: true,
                        facilities: true,
                        image: true,
                        description: true,
                        location: true,
                        institute: { select: { name: true } }
                    }
                },
                course: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                sessions: {
                    select: {
                        id: true,
                        topic: true,
                        startTime: true,
                        endTime: true
                    },
                    orderBy: { startTime: 'asc' }
                },
                payments: {
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    /**
     * Cancel a room booking and its associated course and sessions
     */
    async cancelBooking(trainerId: string, courseId: string, bookingId: string) {
        const booking = await prisma.roomBooking.findUnique({
            where: { id: bookingId },
            include: { course: true }
        });

        if (!booking) {
            throw new Error('طلب الحجز غير موجود');
        }

        if (booking.requestedById !== trainerId) {
            throw new Error('غير مصرح لك بإلغاء هذا الحجز');
        }

        if (booking.courseId !== courseId) {
            throw new Error('طلب الحجز لا ينتمي لهذه الدورة');
        }

        return await prisma.$transaction(async (tx) => {
            const updatedBooking = await tx.roomBooking.update({
                where: { id: bookingId },
                data: { status: 'CANCELLED' }
            });

            if (booking.courseId) {
                await tx.course.update({
                    where: { id: booking.courseId },
                    data: { status: 'CANCELLED' }
                });

                await tx.session.updateMany({
                    where: { courseId: booking.courseId },
                    data: { status: 'CANCELLED' }
                });
            }


            auditService.logAction({
                action: 'CANCEL',
                entityName: 'RoomBooking',
                entityId: 'system_log',
                description: 'إلغاء حجز قاعة',
                performedBy: trainerId
            }).catch(e => console.error(e));

            return updatedBooking;
        });
    }

    /**
     * Cancel a direct room booking not linked to any course
     */
    async cancelDirectBooking(trainerId: string, bookingId: string) {
        const booking = await prisma.roomBooking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            throw new Error('طلب الحجز غير موجود');
        }

        if (booking.requestedById !== trainerId) {
            throw new Error('غير مصرح لك بإلغاء هذا الحجز');
        }

        return await prisma.$transaction(async (tx) => {
            const updatedBooking = await tx.roomBooking.update({
                where: { id: bookingId },
                data: { status: 'CANCELLED' }
            });

            // Cancel any sessions tied to this booking
            await tx.session.updateMany({
                where: { roomBookingId: bookingId },
                data: { status: 'CANCELLED' }
            });


            auditService.logAction({
                action: 'CANCEL',
                entityName: 'RoomBooking',
                entityId: 'system_log',
                description: 'إلغاء حجز قاعة مباشر',
                performedBy: trainerId
            }).catch(e => console.error(e));

            return updatedBooking;
        });
    }

    /**
     * Get all sessions for all courses owned by this trainer
     */
    async getSchedule(userId: string) {
        // First get all courses belonging to this trainer
        const courses = await prisma.course.findMany({
            where: { trainerId: userId },
            select: { id: true, title: true }
        });

        const courseIds = courses.map(c => c.id);

        // Get all approved room bookings requested by this trainer directly (no course)
        const roomBookings = await prisma.roomBooking.findMany({
            where: {
                requestedById: userId,
                status: 'APPROVED',
                courseId: null
            },
            select: { id: true, purpose: true }
        });

        const roomBookingIds = roomBookings.map(b => b.id);

        if (courseIds.length === 0 && roomBookingIds.length === 0) return [];

        // Get all sessions for these courses or direct room bookings
        const sessions = await prisma.session.findMany({
            where: {
                OR: [
                    { courseId: { in: courseIds } },
                    { roomBookingId: { in: roomBookingIds } }
                ]
            },
            include: {
                room: { select: { name: true } },
                roomBooking: { select: { purpose: true } },
                course: {
                    select: {
                        title: true,
                        enrollments: {
                            where: { status: { in: ['ACTIVE', 'PRELIMINARY_APPROVED', 'PENDING_PAYMENT'] } },
                            select: { id: true }
                        }
                    }
                }
            },
            orderBy: { startTime: 'asc' }
        });

        return sessions.map(s => {
            const isDirectBooking = !s.courseId;
            return {
                id: s.id,
                title: s.topic || (isDirectBooking ? s.roomBooking?.purpose || 'حجز مباشر' : 'جلسة تدريبية'),
                courseId: s.courseId ?? null,
                courseTitle: s.course?.title ?? (isDirectBooking ? 'حجز قاعة مستقل' : '�'),
                startTime: s.startTime,
                endTime: s.endTime,
                type: s.type.toLowerCase(),
                status: s.status.toLowerCase(),
                meetingLink: s.meetingLink,
                location: s.room?.name || s.location || (s.type === 'ONLINE' ? 'أونلاين' : 'غير محدد'),
                enrolledStudents: s.course?.enrollments.length ?? 0,
                roomId: s.roomId ?? null,
                isDirectBooking
            };
        });
    }

    /**
     * Reschedule or cancel a session belonging to this trainer
     */
    async updateSession(userId: string, sessionId: string, data: { startTime?: Date; endTime?: Date; status?: string; meetingLink?: string; updateAll?: boolean; reason?: string }) {
        // Get all course IDs for this trainer
        const courses = await prisma.course.findMany({
            where: { trainerId: userId },
            select: { id: true }
        });
        const courseIds = courses.map(c => c.id);

        const roomBookings = await prisma.roomBooking.findMany({
            where: { requestedById: userId, status: 'APPROVED', courseId: null },
            select: { id: true }
        });
        const roomBookingIds = roomBookings.map(b => b.id);

        const session = await prisma.session.findFirst({
            where: { 
                id: sessionId, 
                OR: [
                    { courseId: { in: courseIds } },
                    { roomBookingId: { in: roomBookingIds } }
                ]
            },
            include: {
                room: { include: { institute: true } },
                course: true
            }
        });
        if (!session) throw new Error('الجلسة غير موجودة أو لا تنتمي إليك');

        // Conflict check for reschedule with a hall
        if ((data.startTime || data.endTime) && session.roomId) {
            const newStart = data.startTime ?? session.startTime;
            const newEnd = data.endTime ?? session.endTime;

            // 1. Check for other sessions
            const sessionConflict = await prisma.session.findFirst({
                where: {
                    id: { not: sessionId },
                    roomId: session.roomId,
                    status: { not: 'CANCELLED' },
                    startTime: { lt: newEnd },
                    endTime: { gt: newStart }
                }
            });
            if (sessionConflict) throw new Error('هذا الوقت محجوز با�„فع�„ بواسطة جلسة أخرى ف�Š �†فس القاعة');

            // 2. Check for blanket RoomBookings (those without sessions yet)
            const bookingConflict = await prisma.roomBooking.findFirst({
                where: {
                    roomId: session.roomId,
                    status: { in: ['APPROVED', 'PENDING_PAYMENT'] },
                    sessions: { none: {} }, // Blanket booking
                    startDate: { lte: newEnd },
                    endDate: { gte: newStart }
                }
            });

            if (bookingConflict) {
                // Check if the times also overlap (approximated for simplicity)
                if (bookingConflict.defaultStartTime.getHours() < newEnd.getHours() &&
                    bookingConflict.defaultEndTime.getHours() > newStart.getHours()) {
                    throw new Error('هذا الوقت محجوز با�„فع�„ ضمن حجز قاعة كلي');
                }
            }
        }

        if (data.updateAll && data.meetingLink !== undefined && session.courseId) {
            await prisma.session.updateMany({
                where: { courseId: session.courseId },
                data: { meetingLink: data.meetingLink }
            });
        }

        // If moved outside RoomBooking range, expand the range
        if (data.startTime && session.roomBookingId) {
            const booking = await prisma.roomBooking.findUnique({ where: { id: session.roomBookingId } });
            if (booking) {
                const updates: any = {};
                if (data.startTime < booking.startDate) updates.startDate = data.startTime;
                if ((data.endTime ?? session.endTime) > booking.endDate) updates.endDate = data.endTime ?? session.endTime;

                if (Object.keys(updates).length > 0) {
                    await prisma.roomBooking.update({
                        where: { id: booking.id },
                        data: updates
                    });
                }
            }
        }

        auditService.logAction({
            action: 'UPDATE',
            entityName: 'Session',
            entityId: 'system_log',
            description: 'تحديث جلسة تدريبية',
            performedBy: userId
        }).catch(e => console.error(e));

        const updated = await prisma.session.update({
            where: { id: sessionId },
            data: {
                ...(data.startTime && { startTime: data.startTime }),
                ...(data.endTime && { endTime: data.endTime }),
                ...(data.status && { status: data.status as any }),
                ...(data.meetingLink !== undefined && { meetingLink: data.meetingLink })
            }
        });

        // ── Notify enrolled students about the session change or cancellation ──
        if ((data.startTime || data.endTime || data.status === 'CANCELLED') && session.courseId) {
            setImmediate(async () => {
                try {
                    const courseTitle = session.course?.title ?? 'الدورة';

                    const enrollments = await prisma.enrollment.findMany({
                        where: {
                            courseId: session.courseId!,
                            status: { in: ['ACTIVE', 'PRELIMINARY_APPROVED', 'PENDING_PAYMENT'] },
                            deletedAt: null
                        },
                        select: { student: { select: { id: true, name: true, email: true, phone: true } } }
                    });

                    const isCancel = data.status === 'CANCELLED';

                    const changes = {
                        oldStart: session.startTime,
                        oldEnd: session.endTime,
                        newStart: data.startTime ?? session.startTime,
                        newEnd: data.endTime ?? session.endTime,
                        topic: session.topic ?? undefined,
                    };

                    for (const { student } of enrollments) {
                        await notificationService.createNotification({
                            userId: student.id,
                            type: (isCancel ? 'SESSION_CANCELLED' : 'SESSION_REMINDER') as any,
                            title: isCancel 
                                ? `�Œ إلغاء جلسة ف�Š دورة "${courseTitle}"`
                                : `📅 تعديل موعد جلسة ف�Š دورة "${courseTitle}"`,
                            message: isCancel 
                                ? `تم إلغاء جلسة${session.topic ? ` "${session.topic}"` : ''} ف�Š دورة "${courseTitle}".${data.reason ? ` السبب: ${data.reason}` : ''}`
                                : `تم تعديل موعد جلسة${session.topic ? ` "${session.topic}"` : ''} ف�Š دورة "${courseTitle}".${data.reason ? ` السبب: ${data.reason}` : ''}`,
                            relatedEntityId: session.courseId ?? undefined,
                            actionUrl: '/student/courses',
                            emailFn: student.email
                                ? () => isCancel
                                    ? mailerService.sendSessionCancelled(student.email!, student.name, courseTitle, session.topic ?? undefined, data.reason)
                                    : mailerService.sendSessionUpdated(student.email!, student.name, courseTitle, changes, data.reason)
                                : undefined,
                            whaFn: student.phone
                                ? () => isCancel
                                    ? whatsAppService.notifySessionCancelled(student.phone!, student.name, courseTitle, session.topic ?? undefined, data.reason)
                                    : whatsAppService.notifySessionUpdated(student.phone!, student.name, courseTitle, { oldStart: changes.oldStart, newStart: changes.newStart, topic: changes.topic }, data.reason)
                                : undefined,
                        });
                    }
                } catch (err) {
                    console.error('[updateSession] Failed to notify students:', err);
                }
            });
        }

        // ── Notify the Institute (hall owner) about the session change or cancellation ──
        if ((data.startTime || data.endTime || data.status === 'CANCELLED') && session.room && session.room.institute) {
            setImmediate(async () => {
                try {
                    const instituteOwnerId = session.room!.institute!.userId;
                    const isCancel = data.status === 'CANCELLED';
                    
                    const actionText = isCancel ? 'إلغاء' : 'تعديل موعد';
                    const message = `تم ${actionText} جلسة تخص القاعة "${session.room!.name}".` + (data.reason ? ` السبب: ${data.reason}` : '');
                    
                    await notificationService.createNotification({
                        userId: instituteOwnerId,
                        type: 'BOOKING_STATUS_CHANGE' as any,
                        title: `🔔 ${actionText} جلسة ف�Š قاعة "${session.room!.name}"`,
                        message: message,
                        actionUrl: '/institute/schedule',
                    });
                } catch (e) {
                    console.error('[updateSession] Failed to notify institute:', e);
                }
            });
        }

        return updated;
    }

}

export default new TrainerService();

