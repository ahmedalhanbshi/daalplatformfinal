/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */
import { EnrollmentStatus, AnnouncementAudience } from "@prisma/client";
import prisma from "../config/database";
import notificationService from "../services/notification.service";
import { mailerService } from "../services/mailer.service";
import { whatsAppService } from "../services/whatsapp.service";
import { auditService } from "./audit.service";

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

class InstituteService {
    /**
     * Get institute dashboard data for the logged-in institute admin
     */
    async getDashboardData(userId: string) {
        // Get institute by userId
        const institute = await prisma.institute.findUnique({
            where: { userId },
            include: {
                user: {
                    select: { name: true, email: true },
                },
            },
        });

        if (!institute) {
            throw new Error("لم يتم العثور على المعهد");
        }

        // Get stats in parallel
        const [
            activeCourses,
            totalCourses,
            rooms,
            todayBookings,
            totalStudents,
            totalEarnings,
            recentBookings,
            upcomingCourses,
            recentNotifications,
        ] = await Promise.all([
            // Active courses count
            prisma.course.count({
                where: { instituteId: institute.id, status: "ACTIVE", trainerId: null },
            }),
            // Total courses count
            prisma.course.count({
                where: { instituteId: institute.id, trainerId: null },
            }),
            // Rooms count
            prisma.room.count({
                where: { instituteId: institute.id, isActive: true },
            }),
            // Today's room bookings
            prisma.roomBooking.count({
                where: {
                    room: { instituteId: institute.id },
                    startDate: {
                        lte: new Date(),
                    },
                    endDate: {
                        gte: new Date(),
                    },
                },
            }),
            // Total unique students enrolled in institute courses (All Statuses)
            prisma.enrollment.findMany({
                where: {
                    course: { instituteId: institute.id, trainerId: null },
                },
                select: { studentId: true },
                distinct: ["studentId"],
            }),
            // Total all-time earnings from approved payments
            prisma.payment.aggregate({
                where: {
                    status: "APPROVED",
                    enrollment: {
                        course: { instituteId: institute.id, trainerId: null },
                    },
                },
                _sum: { amount: true },
            }),
            // Recent Enrollments
            prisma.enrollment.findMany({
                where: {
                    course: { instituteId: institute.id, trainerId: null },
                },
                include: {
                    course: { select: { title: true } },
                    student: { select: { name: true } },
                },
                orderBy: { enrolledAt: "desc" },
                take: 5,
            }),
            // Upcoming sessions
            prisma.session.findMany({
                where: {
                    course: { instituteId: institute.id, trainerId: null },
                    status: "SCHEDULED",
                    startTime: { gte: new Date() },
                },
                include: {
                    course: {
                        select: {
                            title: true,
                            trainer: { select: { name: true } },
                            staffTrainerIds: true,
                            _count: { select: { enrollments: true } },
                        }
                    },
                    room: { select: { name: true } },
                },
                orderBy: { startTime: "asc" },
                take: 5,
            }),
            // Recent Notifications
            prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),
        ]);

        return {
            institute: {
                id: institute.id,
                name: institute.name,
                adminName: institute.user.name,
                verificationStatus: institute.verificationStatus,
            },
            stats: {
                activeCourses,
                totalCourses,
                rooms,
                roomBookingsToday: todayBookings,
                totalStudents: totalStudents.length,
                totalEarnings: Number(totalEarnings._sum.amount || 0),
            },
            recentEnrollments: recentBookings.map((e: any) => ({
                id: e.id,
                courseTitle: e.course?.title || "دورة",
                studentName: e.student?.name || "طالب",
                enrolledAt: e.enrolledAt,
                status: e.status,
            })),
            upcomingSessions: upcomingCourses.map((s: any) => {
                return {
                    id: s.id,
                    title: s.topic || "جلسة",
                    courseTitle: s.course?.title || "",
                    trainer: s.course?.trainer?.name || (s.course?.staffTrainerIds?.length > 0 ? "مدرب معهد" : "غير محدد"),
                    startDate: s.startTime,
                    enrolledStudents: s.course?._count?.enrollments || 0,
                    type: s.type,
                };
            }),
            recentNotifications: recentNotifications.map((n: any) => ({
                id: n.id,
                title: n.title || "إشعار",
                message: n.message || "",
                createdAt: n.createdAt,
                isRead: n.isRead,
            })),
        };
    }

    // =====================================================
    // PROFILE MANAGEMENT
    // =====================================================

    /**
     * Get institute profile data
     */
    async getInstituteProfile(userId: string) {
        const institute = await prisma.institute.findUnique({
            where: { userId },
            include: {
                user: {
                    select: { id: true, name: true, email: true, phone: true, avatar: true },
                },
            },
        });

        if (!institute) {
            throw new Error("لم يتم العثور على المعهد");
        }

        return {
            id: institute.id,
            name: institute.user.name,
            email: institute.user.email,
            phone: institute.user.phone,
            avatar: institute.user.avatar,
            role: "institute_admin",
            instituteName: institute.name,
            instituteLogo: institute.logo,
            instituteAddress: institute.address,
            instituteWebsite: institute.website,
            instituteLocationUrl: institute.locationUrl,
            instituteDescription: institute.description,
            licenseNumber: institute.licenseNumber,
            licenseDocument: institute.licenseDocumentUrl,
            licenseDocumentUrl: institute.licenseDocumentUrl,
            verificationStatus: institute.verificationStatus,
            features: institute.features,
            publicEmail: institute.email,
            publicPhone: institute.phone,
        };
    }

    /**
     * Update institute profile data
     */
    async updateInstituteProfile(
        userId: string,
        data: {
            name?: string;
            phone?: string;
            publicPhone?: string;
            email?: string;
            publicEmail?: string;
            instituteName?: string;
            instituteAddress?: string;
            instituteWebsite?: string;
            instituteLocationUrl?: string;
            instituteDescription?: string;
            licenseNumber?: string;
            licenseDocumentUrl?: string;
            avatar?: string;
            logo?: string;
            features?: string[] | string;
        }
    ) {
        const institute = await prisma.institute.findUnique({
            where: { userId },
        });

        if (!institute) {
            throw new Error("لم يتم العثور على المعهد");
        }

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

        // Update User info
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name !== undefined ? data.name : undefined,
                phone: data.phone !== undefined ? data.phone : undefined,
                avatar: data.avatar !== undefined ? data.avatar : undefined,
                email: data.email !== undefined ? data.email : undefined,
            },
        });

        // Update Institute info
        const updatedInstitute = await prisma.institute.update({
            where: { id: institute.id },
            data: {
                name: data.instituteName !== undefined ? data.instituteName : undefined,
                address: data.instituteAddress !== undefined ? data.instituteAddress : undefined,
                website: data.instituteWebsite !== undefined ? data.instituteWebsite : undefined,
                locationUrl: data.instituteLocationUrl !== undefined ? data.instituteLocationUrl : undefined,
                description: data.instituteDescription !== undefined ? data.instituteDescription : undefined,
                licenseNumber: data.licenseNumber !== undefined ? data.licenseNumber : undefined,
                licenseDocumentUrl: data.licenseDocumentUrl !== undefined ? data.licenseDocumentUrl : undefined,
                logo: data.logo !== undefined ? data.logo : undefined,
                phone: data.publicPhone !== undefined ? data.publicPhone : (data.phone !== undefined ? data.phone : undefined),
                email: data.publicEmail !== undefined ? data.publicEmail : (data.email !== undefined ? data.email : undefined),
                features: data.features !== undefined ? (typeof data.features === 'string' ? JSON.parse(data.features) : data.features) : undefined,
            },
        });


        auditService.logAction({
            action: 'UPDATE',
            entityName: 'Institute',
            entityId: 'system_log', // Default if ID is complex to resolve
            description: 'تعديل �…�„ف المعهد',
            performedBy: userId
        }).catch(e => console.error(e));

        return {
            id: updatedInstitute.id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            avatar: updatedUser.avatar,
            role: "institute_admin",
            instituteName: updatedInstitute.name,
            publicEmail: updatedInstitute.email,
            publicPhone: updatedInstitute.phone,
            instituteLogo: updatedInstitute.logo,
            instituteAddress: updatedInstitute.address,
            instituteWebsite: updatedInstitute.website,
            instituteLocationUrl: updatedInstitute.locationUrl,
            instituteDescription: updatedInstitute.description,
            licenseNumber: updatedInstitute.licenseNumber,
            licenseDocument: updatedInstitute.licenseDocumentUrl,
            licenseDocumentUrl: updatedInstitute.licenseDocumentUrl,
            verificationStatus: updatedInstitute.verificationStatus,
        };
    }

    // =====================================================
    // BANK ACCOUNTS MANAGEMENT
    // =====================================================

    async getBankAccounts(userId: string) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");

        return prisma.bankAccount.findMany({
            where: { instituteId: institute.id },
            orderBy: { createdAt: 'desc' }
        });
    }

    async addBankAccount(userId: string, data: { bankName: string; accountName: string; accountNumber: string; iban?: string; isActive?: boolean }) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");

        const count = await prisma.bankAccount.count({
            where: { instituteId: institute.id }
        });

        const shouldBeActive = count === 0 ? true : (data.isActive ?? false);

        if (shouldBeActive) {
            await prisma.bankAccount.updateMany({
                where: { instituteId: institute.id },
                data: { isActive: false }
            });
        }


        auditService.logAction({
            action: 'CREATE',
            entityName: 'BankAccount',
            entityId: 'system_log', // Default if ID is complex to resolve
            description: 'إضافة حساب بنكي جديد',
            performedBy: userId
        }).catch(e => console.error(e));

        return prisma.bankAccount.create({
            data: {
                instituteId: institute.id,
                bankName: data.bankName,
                accountName: data.accountName,
                accountNumber: data.accountNumber,
                iban: data.iban,
                isActive: shouldBeActive,
            }
        });
    }

    async updateBankAccount(userId: string, accountId: string, data: { bankName?: string; accountName?: string; accountNumber?: string; iban?: string; isActive?: boolean }) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");

        const account = await prisma.bankAccount.findFirst({
            where: { id: accountId, instituteId: institute.id }
        });

        if (!account) throw new Error("الحساب البنكي غير موجود أو لا تملك صلاحية التعديل عليه");

        if (data.isActive === true) {
            await prisma.bankAccount.updateMany({
                where: { instituteId: institute.id, id: { not: accountId } },
                data: { isActive: false }
            });
        }


        auditService.logAction({
            action: 'UPDATE',
            entityName: 'BankAccount',
            entityId: 'system_log', // Default if ID is complex to resolve
            description: 'تعديل حساب بنكي',
            performedBy: userId
        }).catch(e => console.error(e));

        return prisma.bankAccount.update({
            where: { id: accountId },
            data
        });
    }

    async deleteBankAccount(userId: string, accountId: string) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");

        const account = await prisma.bankAccount.findFirst({
            where: { id: accountId, instituteId: institute.id }
        });

        if (!account) throw new Error("الحساب البنكي غير موجود أو لا تملك صلاحية ا�„حذف");

        const wasActive = account.isActive;

        await prisma.bankAccount.delete({ where: { id: accountId } });

        if (wasActive) {
            const nextAccount = await prisma.bankAccount.findFirst({
                where: { instituteId: institute.id },
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
            entityId: 'system_log', // Default if ID is complex to resolve
            description: 'حذف حساب بنكي',
            performedBy: userId
        }).catch(e => console.error(e));

        return { success: true };
    }

    // =====================================================
    // STUDENT MANAGEMENT
    // =====================================================

    /**
     * Get all unique students enrolled in any course of this institute
     */
    async getInstituteStudents(userId: string) {
        const institute = await prisma.institute.findUnique({
            where: { userId },
        });

        if (!institute) {
            throw new Error("لم يتم العثور على المعهد");
        }

        const enrollments = await prisma.enrollment.findMany({
            where: {
                course: {
                    instituteId: institute.id,
                    trainerId: null,
                },
                deletedAt: null,
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        avatar: true,
                        status: true,
                        deletedAt: true,
                    },
                },
                course: {
                    select: {
                        id: true,
                        title: true,
                        trainer: { select: { name: true } },
                        staffTrainerIds: true,
                    },
                },
            },
            orderBy: { enrolledAt: "desc" },
        });

        const studentMap = new Map<string, any>();

        for (const e of enrollments) {
            if (e.student.deletedAt) continue;

            if (!studentMap.has(e.student.id)) {
                studentMap.set(e.student.id, {
                    ...e.student,
                    status: e.student.status.toLowerCase(),
                    enrolledCourses: [],
                    lastActivity: e.enrolledAt,
                });
            }

            const entry = studentMap.get(e.student.id);
            entry.enrolledCourses.push({
                courseId: e.course.id,
                courseTitle: e.course.title,
                enrollmentId: e.id,
                status: e.status.toLowerCase(),
                enrolledAt: e.enrolledAt,
                trainerName: e.course.trainer?.name || (e.course.staffTrainerIds?.length > 0 ? "مدرب معهد" : ""),
            });

            if (e.enrolledAt > entry.lastActivity) {
                entry.lastActivity = e.enrolledAt;
            }
        }

        const totalEarnings = await prisma.payment.aggregate({
            where: {
                status: "APPROVED",
                enrollment: {
                    course: {
                        instituteId: institute.id,
                        trainerId: null,
                    },
                },
            },
            _sum: { amount: true },
        });

        const students = Array.from(studentMap.values()).map(s => ({
            ...s,
            totalCourses: s.enrolledCourses.length,
        }));

        return {
            students,
            totalStudents: students.length,
            totalEnrollments: enrollments.length,
            totalEarnings: Number(totalEarnings._sum.amount || 0),
        };
    }

    // =====================================================
    // POST ANNOUNCEMENTS
    // =====================================================

    /**
     * Create and send an announcement to students and/or trainers
     */
    async createStudentAnnouncement(userId: string, data: {
        title: string;
        message: string;
        recipientId?: string;
        recipientIds?: string[]; // For batching
        courseId?: string;
        category?: string;
        status?: string;
        targetAudience?: string;
        scheduledAt?: string
    }) {
        const institute = await prisma.institute.findUnique({
            where: { userId },
            include: { user: true }
        });

        if (!institute) throw new Error("لم يتم العثور على بيانات المعهد");

        const instituteAdmin = institute.user;

        const contactFooter = `\n\n---\n🏛️ المعهد: ${institute.name}`;
        const fullMessage = data.message + contactFooter;

        // Fetch ALL course IDs for this institute
        const instituteCourses = await prisma.course.findMany({
            where: { instituteId: institute.id },
            select: { id: true }
        });
        const allCourseIds = instituteCourses.map(c => c.id);

        // Helper for single individual dispatch
        const dispatchToPerson = async (rId: string, announcementId: string, title: string, message: string) => {
            const user = await prisma.user.findUnique({ where: { id: rId } });
            if (user) {
                // To Student User
                await prisma.notification.create({
                    data: {
                        userId: user.id,
                        type: 'NEW_ANNOUNCEMENT' as any,
                        title,
                        message,
                        relatedEntityId: announcementId
                    }
                });
                if (user.email) {
                    mailerService.sendAnnouncementEmail(user.email, user.name, title, message, {
                        name: instituteAdmin?.name || 'مدير المعهد',
                        instituteName: institute.name
                    }).catch(e => console.error(`[Mailer-Async] Error:`, e));
                }
            } else {
                // To Institute Staff (Trainer)
                const staff = await prisma.instituteStaff.findFirst({
                    where: { id: rId, instituteId: institute.id }
                });
                if (staff?.email) {
                    mailerService.sendAnnouncementEmail(staff.email, staff.name, title, message, {
                        name: instituteAdmin?.name || 'مدير المعهد',
                        instituteName: institute.name
                    }).catch(e => console.error(`[Mailer-Async] Error:`, e));
                }
            }
        };

        // --- EXECUTION LOGIC ---

        // 1. If batch of recipients is specified (Selected Users)
        if (data.recipientIds && data.recipientIds.length > 0) {
            // Create ONE unified record
            // Add hidden marker \u200B to title if it's a selective batch
            const selectiveTitle = data.title + '\u200B';

            const announcement = await (prisma.announcement as any).create({
                data: {
                    title: selectiveTitle,
                    message: fullMessage,
                    targetAudience: (data.targetAudience?.toUpperCase() as any) || 'SINGLE_USER',
                    senderId: userId,
                    recipientId: data.recipientIds.length === 1 ? data.recipientIds[0] : null,
                    recipientIds: data.recipientIds || [], // PERSIST THE BATCH ARRAY
                    courseId: (data.courseId && data.courseId !== 'all') ? data.courseId : null,
                    category: (data.category?.toUpperCase() as any) || 'GENERAL',
                    status: (data.status?.toUpperCase() as any) || (data.scheduledAt ? 'SCHEDULED' : 'SENT'),
                    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
                    sentAt: (!data.scheduledAt) ? new Date() : null,
                }
            });

            if (announcement.status === 'SENT') {
                // Dispatch to everyone in parallel without waiting for emails
                Promise.all(data.recipientIds.map(rid => dispatchToPerson(rid, announcement.id, data.title, fullMessage)))
                    .catch(e => console.error(`[Batch-Dispatch] Error:`, e));
            }
            return announcement;
        }

        // 2. If single recipient is specified (Legacy/Simple)
        if (data.recipientId) {
            const announcement = await (prisma.announcement as any).create({
                data: {
                    title: data.title,
                    message: fullMessage,
                    targetAudience: 'SINGLE_USER',
                    senderId: userId,
                    recipientId: data.recipientId,
                    courseId: (data.courseId && data.courseId !== 'all') ? data.courseId : null,
                    category: (data.category?.toUpperCase() as any) || 'GENERAL',
                    status: (data.status?.toUpperCase() as any) || (data.scheduledAt ? 'SCHEDULED' : 'SENT'),
                    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
                    sentAt: (!data.scheduledAt) ? new Date() : null,
                }
            });

            if (announcement.status === 'SENT') {
                dispatchToPerson(data.recipientId, announcement.id, data.title, fullMessage);
            }
            return announcement;
        }

        // --- BROADCAST LOGIC ---
        const audience = data.targetAudience?.toUpperCase() || 'STUDENTS';

        const announcement = await (prisma.announcement as any).create({
            data: {
                title: data.title,
                message: fullMessage,
                targetAudience: audience as any,
                senderId: userId,
                recipientId: null,
                courseId: (data.courseId && data.courseId !== 'all') ? data.courseId : null,
                category: (data.category?.toUpperCase() as any) || 'GENERAL',
                status: (data.status?.toUpperCase() as any) || (data.scheduledAt ? 'SCHEDULED' : 'SENT'),
                scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
                sentAt: (!data.scheduledAt) ? new Date() : null,
            }
        });

        if (announcement.status === 'SENT') {
            // A. Trainers
            if (audience === 'TRAINERS' || audience === 'ALL') {
                const trainers = await prisma.instituteStaff.findMany({
                    where: { instituteId: institute.id, status: "ACTIVE" }
                });
                for (const t of trainers) {
                    if (t.email) {
                        mailerService.sendAnnouncementEmail(t.email, t.name, data.title, data.message, {
                            name: instituteAdmin?.name || 'مدير المعهد',
                            instituteName: institute.name
                        }).catch(e => console.error(e));
                    }
                }
            }
            // B. Students
            if (audience === 'STUDENTS' || audience === 'ALL') {
                const targetCourseIds = (data.courseId && data.courseId !== 'all') ? [data.courseId] : allCourseIds;
                const enrollments = await prisma.enrollment.findMany({
                    where: { courseId: { in: targetCourseIds }, status: 'ACTIVE', deletedAt: null },
                    select: { student: { select: { id: true, name: true, email: true } } },
                    distinct: ['studentId']
                });
                if (enrollments.length > 0) {
                    await prisma.notification.createMany({
                        data: enrollments.map(e => ({
                            userId: e.student.id,
                            type: 'NEW_ANNOUNCEMENT' as any,
                            title: data.title,
                            message: fullMessage,
                            relatedEntityId: announcement.id
                        })),
                        skipDuplicates: true
                    });
                    for (const { student } of enrollments) {
                        if (student.email) {
                            mailerService.sendAnnouncementEmail(student.email, student.name, data.title, data.message, {
                                name: instituteAdmin?.name || 'مدير المعهد',
                                instituteName: institute.name
                            }).catch(e => console.error(e));
                        }
                    }
                }
            }
        }

        auditService.logAction({
            action: 'CREATE',
            entityName: 'Announcement',
            entityId: 'system_log', // Default if ID is complex to resolve
            description: 'إرسال إعلان جديد',
            performedBy: userId
        }).catch(e => console.error(e));

        return announcement;
    }

    async getAnnouncements(userId: string) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error('لم يتم العثور على بيانات المعهد');

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
            targetAudience: a.targetAudience?.toUpperCase(),
            category: a.category?.toUpperCase() || 'GENERAL',
            status: a.status?.toUpperCase(),
            scheduledAt: a.scheduledAt,
            sentAt: a.sentAt,
            createdAt: a.createdAt,
            sender: a.sender,
            recipient: a.recipient,
            course: (a as any).course
        }));
    }

    /**
     * Update an announcement (only if it belongs to this institute and not yet sent)
     */
    async updateAnnouncement(userId: string, announcementId: string, data: { title?: string; message?: string }) {
        const existing = await (prisma.announcement as any).findFirst({
            where: { id: announcementId, senderId: userId }
        });
        if (!existing) throw new Error('الإعلان غير موجود أو لا تملك صلاحية تعديله');


        auditService.logAction({
            action: 'UPDATE',
            entityName: 'Announcement',
            entityId: 'system_log', // Default if ID is complex to resolve
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
     * Delete an announcement (only if it belongs to this institute)
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
            entityId: 'system_log', // Default if ID is complex to resolve
            description: 'حذف إعلان',
            performedBy: userId
        }).catch(e => console.error(e));

        return { success: true };
    }

    // =====================================================
    // COURSE MANAGEMENT
    // =====================================================

    /**
     * Get all courses for the institute
     */
    async getInstituteCourses(userId: string) {
        const institute = await prisma.institute.findUnique({
            where: { userId },
        });

        if (!institute) {
            throw new Error("لم يتم العثور على المعهد");
        }

        const courses = await prisma.course.findMany({
            where: {
                instituteId: institute.id,
                trainerId: null,
                deletedAt: null
            },
            include: {
                trainer: {
                    select: { id: true, name: true, email: true },
                },
                category: {
                    select: { id: true, name: true },
                },
                _count: {
                    select: { enrollments: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Build staff trainer data for courses with multiple trainers
        const allStaffIds = [...new Set(courses.flatMap(c => ((c as any).staffTrainerIds as string[]) || []))];
        const staffMap = new Map<string, { id: string; name: string; email: string | null }>();
        if (allStaffIds.length > 0) {
            const staffList = await prisma.instituteStaff.findMany({
                where: { id: { in: allStaffIds } },
                select: { id: true, name: true, email: true }
            });
            staffList.forEach(s => staffMap.set(s.id, s));
        }

        return courses.map((c) => {
            const course = c as any;
            // Build trainers list from staffTrainerIds if available, else fall back to staffTrainer
            const trainers = (course.staffTrainerIds || []).length > 0
                ? (course.staffTrainerIds as string[]).map(id => staffMap.get(id) || { id, name: '�', email: null })
                : [];

            return {
                id: c.id,
                title: c.title,
                description: c.description,
                shortDescription: c.shortDescription,
                image: c.image,
                price: Number(c.price),
                duration: c.duration,
                startDate: c.startDate,
                endDate: c.endDate,
                maxStudents: c.maxStudents,
                enrolledStudents: c._count.enrollments,
                status: c.status.toLowerCase(),
                trainerId: (trainers[0]?.id as string) || c.trainerId,
                trainer: trainers[0] || { id: null, name: '�', email: null },
                trainers, // قائمة جميع المدربين
                category: c.category?.name || "-",
                categoryId: c.categoryId,
                createdAt: c.createdAt,
                prerequisites: c.prerequisites ? c.prerequisites.split('\n') : [],
            };
        });
    }

    /**
     * Delete a course belonging to this institute
     */
    async deleteCourse(userId: string, courseId: string) {
        const institute = await prisma.institute.findUnique({
            where: { userId },
        });

        if (!institute) {
            throw new Error("لم يتم العثور على المعهد");
        }

        const course = await prisma.course.findFirst({
            where: { id: courseId, instituteId: institute.id, trainerId: null },
        });

        if (!course) {
            throw new Error("الدورة غير موجودة أو لا تنتمي لهذا المعهد");
        }

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

        await prisma.course.update({
            where: { id: courseId },
            data: { deletedAt: new Date() },
        });


        auditService.logAction({
            action: 'DELETE',
            entityName: 'Course',
            entityId: 'system_log', // Default if ID is complex to resolve
            description: 'حذف دورة',
            performedBy: userId
        }).catch(e => console.error(e));

        return { message: "تم حذف الدورة بنجاح" };
    }

    /**
     * Change the trainer for a course belonging to this institute
     */
    async changeTrainer(userId: string, courseId: string, newTrainerId: string) {
        const institute = await prisma.institute.findUnique({
            where: { userId },
        });

        if (!institute) {
            throw new Error("لم يتم العثور على المعهد");
        }

        const course = await prisma.course.findFirst({
            where: { id: courseId, instituteId: institute.id, trainerId: null },
        });

        if (!course) {
            throw new Error("الدورة غير موجودة أو لا تنتمي لهذا المعهد");
        }

        // Verify new trainer exists in InstituteStaff
        const staffTrainer = await prisma.instituteStaff.findFirst({
            where: { id: newTrainerId, instituteId: institute.id, status: "ACTIVE" },
        });

        if (!staffTrainer) {
            throw new Error("المدرب غير موجود أو غير نشط ف�Š طاقم المعهد");
        }

        await (prisma.course as any).update({
            where: { id: courseId },
            data: { staffTrainerIds: [newTrainerId], trainerId: null },
        });


        auditService.logAction({
            action: 'UPDATE',
            entityName: 'Course',
            entityId: 'system_log', // Default if ID is complex to resolve
            description: 'تغيير مدرب الدورة',
            performedBy: userId
        }).catch(e => console.error(e));

        return { message: "تم تغيير المدرب بنجاح" };
    }

    /**
     * Get list of available trainers (active trainers)
     */
    async getAvailableTrainers() {
        const trainers = await prisma.user.findMany({
            where: {
                role: "TRAINER",
                status: "ACTIVE",
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                status: true,
                createdAt: true,
                _count: {
                    select: {
                        coursesAsTrainer: {
                            where: { status: "ACTIVE" },
                        },
                    },
                },
            },
            orderBy: { name: "asc" },
        });

        return trainers.map((t) => ({
            id: t.id,
            name: t.name,
            email: t.email,
            phone: t.phone,
            status: t.status.toLowerCase(),
            createdAt: t.createdAt,
            activeCourses: (t as any)._count?.coursesAsTrainer ?? 0,
        }));
    }

    /**
     * Get all staff members for this institute
     */
    async getInstituteStaff(userId: string) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");

        return prisma.instituteStaff.findMany({
            where: { instituteId: institute.id },
            orderBy: { joinedAt: "desc" },
        });
    }

    /**
     * Get trainers (staff) for course creation dropdown
     */
    async getInstituteTrainers(userId: string) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");

        return prisma.instituteStaff.findMany({
            where: { instituteId: institute.id, status: "ACTIVE" },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                bio: true,
                avatar: true,
                specialties: true,
                status: true,
                joinedAt: true,
                notes: true,
            },
            orderBy: { name: "asc" },
        });
    }

    /**
     * Add a trainer to this institute's staff roster (standalone � no User account needed)
     */
    async addInstituteStaff(
        userId: string,
        data: {
            name: string;
            email?: string;
            phone?: string;
            bio?: string;
            avatar?: string;
            specialties?: string[];
            notes?: string;
        },
    ) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");
        if (!data.name) throw new Error("اسم المدرب مطلوب");


        auditService.logAction({
            action: 'CREATE',
            entityName: 'InstituteStaff',
            entityId: 'system_log', // Default if ID is complex to resolve
            description: 'إضافة عضو فر�Š�‚ عمل جديد',
            performedBy: userId
        }).catch(e => console.error(e));

        return prisma.instituteStaff.create({
            data: {
                instituteId: institute.id,
                name: data.name,
                email: data.email,
                phone: data.phone,
                bio: data.bio,
                avatar: data.avatar,
                specialties: data.specialties ?? [],
                notes: data.notes,
            },
        });
    }

    /**
     * Remove a staff member from this institute
     */
    async removeInstituteStaff(userId: string, staffId: string) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");

        const staff = await prisma.instituteStaff.findFirst({
            where: { id: staffId, instituteId: institute.id },
        });
        if (!staff) throw new Error("لم يتم العثور على عضو الطاقم");

        await prisma.instituteStaff.delete({ where: { id: staffId } });

        auditService.logAction({
            action: 'DELETE',
            entityName: 'InstituteStaff',
            entityId: 'system_log', // Default if ID is complex to resolve
            description: 'حذف عضو من فر�Š�‚ العمل',
            performedBy: userId
        }).catch(e => console.error(e));
    }

    /**
     * Toggle staff status ACTIVE ↔ INACTIVE
     */
    async updateInstituteStaffStatus(
        userId: string,
        staffId: string,
        status: "ACTIVE" | "INACTIVE",
    ) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");

        const staff = await prisma.instituteStaff.findFirst({
            where: { id: staffId, instituteId: institute.id },
        });
        if (!staff) throw new Error("لم يتم العثور على عضو الطاقم");


        auditService.logAction({
            action: 'UPDATE',
            entityName: 'InstituteStaff',
            entityId: 'system_log', // Default if ID is complex to resolve
            description: 'تحديث حالة عضو فر�Š�‚ العمل',
            performedBy: userId
        }).catch(e => console.error(e));

        return prisma.instituteStaff.update({
            where: { id: staffId },
            data: { status },
        });
    }

    /**
     * Update basic info of a staff member
     */
    async updateInstituteStaff(
        userId: string,
        staffId: string,
        data: {
            name?: string;
            email?: string | null;
            phone?: string | null;
            bio?: string | null;
            avatar?: string | null;
            notes?: string | null;
        },
    ) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");

        const staff = await prisma.instituteStaff.findFirst({
            where: { id: staffId, instituteId: institute.id },
        });
        if (!staff) throw new Error("لم يتم العثور على المدرب");


        auditService.logAction({
            action: 'UPDATE',
            entityName: 'InstituteStaff',
            entityId: 'system_log', // Default if ID is complex to resolve
            description: 'تعديل بيانات عضو فر�Š�‚ العمل',
            performedBy: userId
        }).catch(e => console.error(e));

        return prisma.instituteStaff.update({
            where: { id: staffId },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                email: data.email !== undefined ? data.email : undefined,
                phone: data.phone !== undefined ? data.phone : undefined,
                bio: data.bio !== undefined ? data.bio : undefined,
                ...(data.avatar !== undefined && { avatar: data.avatar }),
                notes: data.notes !== undefined ? data.notes : undefined,
            },
        });
    }

    // =====================================================
    // HALLS (ROOMS) MANAGEMENT
    // =====================================================

    /**
     * Parse room availability � supports both legacy array format and new object format
     */
    private parseRoomAvailability(availability: any): {
        slots: { day: string; startTime: string; endTime: string }[];
        blackoutPeriods: { id: string; label: string; startDate: string; endDate: string }[];
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
     * Get all active halls for an institute
     */
    async getInstituteHalls(userId: string) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");

        const halls = await prisma.room.findMany({
            where: { instituteId: institute.id, isActive: true },
            include: {
                bookings: { where: { status: { notIn: ['REJECTED', 'CANCELLED'] }, endDate: { gte: new Date() } } },
                sessions: { where: { status: { not: 'CANCELLED' }, startTime: { gte: new Date() } } }
            },
            orderBy: { name: "asc" },
        });

        const dayMap: Record<string, number> = {
            'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3, 'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
        };

        return halls.map(hall => {
            const avail = hall.availability as any;
            const slots = (avail?.slots || []).map((slot: any) => {
                const targetDay = dayMap[slot.day];
                const isUsed = hall.sessions.some(s => s.startTime.getDay() === targetDay) ||
                    hall.bookings.some(b => {
                        if (b.bookingMode === 'UNIFIED_TIME' && b.selectedDays.includes(slot.day as any)) return true;
                        // For custom time, just approximate by checking if it spans this day
                        const cur = new Date(b.startDate);
                        while (cur <= b.endDate) {
                            if (cur.getDay() === targetDay) return true;
                            cur.setDate(cur.getDate() + 1);
                        }
                        return false;
                    });
                return { ...slot, isUsed };
            });

            const bookedDatesSet = new Set<string>();
            hall.sessions.forEach(s => {
                const d = s.startTime;
                bookedDatesSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
            });
            hall.bookings.forEach(b => {
                if (b.bookingMode !== 'UNIFIED_TIME') return;
                const cur = new Date(b.startDate.toISOString().substring(0, 10) + 'T00:00:00');
                const end = new Date(b.endDate.toISOString().substring(0, 10) + 'T23:59:59');
                while (cur <= end) {
                    if (b.selectedDays.length > 0) {
                        const dayMapRev: Record<number, string> = { 0: 'SUNDAY', 1: 'MONDAY', 2: 'TUESDAY', 3: 'WEDNESDAY', 4: 'THURSDAY', 5: 'FRIDAY', 6: 'SATURDAY' };
                        if (b.selectedDays.includes(dayMapRev[cur.getDay()] as any)) {
                            bookedDatesSet.add(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`);
                        }
                    }
                    cur.setDate(cur.getDate() + 1);
                }
            });

            return {
                ...hall,
                availability: { ...avail, slots },
                bookedDates: Array.from(bookedDatesSet),
                institute: { name: institute.name },
                bookings: undefined,
                sessions: undefined
            };
        });
    }

    /**
     * Get availability for a specific hall (owner check via userId)
     */
    async getInstituteHallAvailability(userId: string, hallId: string, dateStr?: string) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");

        const room = await prisma.room.findFirst({
            where: { id: hallId, instituteId: institute.id },
        });

        if (!room) throw new Error("القاعة غير موجودة");

        const query: any = { roomId: room.id, status: { not: "CANCELLED" } };

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        query.startTime = { gte: yesterday };

        const bookedSessions = await prisma.session.findMany({
            where: query,
            select: { startTime: true, endTime: true }
        });

        const parsed = this.parseRoomAvailability((room as any).availability);
        const blackoutBlocked = this.expandBlackoutPeriods(parsed.blackoutPeriods);

        return {
            availability: parsed,
            bookedSessions: [...bookedSessions, ...blackoutBlocked]
        };
    }

    /**
     * Get availability for a specific hall by hallId only (no ownership check)
     * Used by trainers and students who don't own the hall
     */
    async getHallAvailabilityPublic(hallId: string, dateStr?: string) {
        const room = await prisma.room.findFirst({
            where: { id: hallId, isActive: true },
        });

        if (!room) throw new Error("القاعة غير موجودة أو غير نشطة");

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // 1. All non-cancelled RoomBookings for this room
        const activeRoomBookings = await prisma.roomBooking.findMany({
            where: {
                roomId: room.id,
                status: { not: 'CANCELLED' },
                endDate: { gte: yesterday },
            },
            select: { id: true, defaultStartTime: true, defaultEndTime: true, startDate: true, endDate: true, selectedDays: true, bookingMode: true }
        });

        const activeBookingIds = activeRoomBookings.map(rb => rb.id);

        // 2. Sessions tied to this room directly OR via any active RoomBooking
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

        // 3. Expand RoomBookings that have NO sessions yet into per-day blocked ranges
        const sessionBookingIds = new Set(
            (await prisma.session.findMany({
                where: { roomBookingId: { in: activeBookingIds } },
                select: { roomBookingId: true }
            })).map(s => s.roomBookingId)
        );

        const extraBlocked: { startTime: Date; endTime: Date }[] = [];
        for (const rb of activeRoomBookings.filter(rb => !sessionBookingIds.has(rb.id))) {
            const startStr = rb.startDate.toISOString().substring(0, 10);
            const cursor = new Date(startStr + 'T00:00:00');
            const endStr = rb.endDate.toISOString().substring(0, 10);
            const end = new Date(endStr + 'T23:59:59');
            const dayMap: Record<string, number> = {
                'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3, 'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
            };
            while (cursor <= end) {
                if (rb.bookingMode === 'UNIFIED_TIME' && rb.selectedDays && Array.isArray(rb.selectedDays) && rb.selectedDays.length > 0) {
                    const selectedDaysNumbers = rb.selectedDays.map((d: string) => dayMap[d]);
                    if (!selectedDaysNumbers.includes(cursor.getDay())) {
                        cursor.setDate(cursor.getDate() + 1);
                        continue;
                    }
                }
                const dateStr = cursor.toISOString().substring(0, 10);
                const sTime = rb.defaultStartTime.toISOString().substring(11, 16);
                const eTime = rb.defaultEndTime.toISOString().substring(11, 16);
                extraBlocked.push({
                    startTime: new Date(`${dateStr}T${sTime}:00`),
                    endTime: new Date(`${dateStr}T${eTime}:00`),
                });
                cursor.setDate(cursor.getDate() + 1);
            }
        }

        const parsed = this.parseRoomAvailability((room as any).availability);
        const blackoutBlocked = this.expandBlackoutPeriods(parsed.blackoutPeriods);

        return {
            availability: parsed,
            bookedSessions: [...sessions, ...extraBlocked, ...blackoutBlocked]
        };
    }

    /**
     * Add a new hall
     */
    async addInstituteHall(
        userId: string,
        data: {
            name: string;
            capacity: number;
            location?: string;
            locationUrl?: string;
            type?: string;
            description?: string;
            pricePerHour: number;
            facilities: string[];
            image?: string;
            availability?: any;
        },
    ) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");


        auditService.logAction({
            action: 'CREATE',
            entityName: 'Room',
            entityId: 'system_log', // Default if ID is complex to resolve
            description: 'إضافة قاعة جديدة',
            performedBy: userId
        }).catch(e => console.error(e));

        return prisma.room.create({
            data: {
                ...data,
                instituteId: institute.id,
            },
        });
    }

    async validateInstituteHallUpdate(userId: string, hallId: string, data: any) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");

        const room = await prisma.room.findFirst({
            where: { id: hallId, instituteId: institute.id },
            include: {
                bookings: {
                    where: { status: { notIn: ['REJECTED', 'CANCELLED'] }, endDate: { gte: new Date() } }
                },
                sessions: {
                    where: { status: { not: 'CANCELLED' }, startTime: { gte: new Date() } }
                }
            }
        });
        if (!room) throw new Error("لم يتم العثور على القاعة");

        let oldAvailSlots: any[] = [];
        if (Array.isArray(room.availability)) {
            oldAvailSlots = room.availability;
        } else if (typeof room.availability === 'object' && room.availability) {
            oldAvailSlots = (room.availability as any).slots || [];
        }
        let newAvailSlots: any[] = [];
        let newBlackoutPeriods: any[] = [];
        if (typeof data.availability === 'string') {
            try {
                const parsed = JSON.parse(data.availability);
                newAvailSlots = parsed.slots || [];
                newBlackoutPeriods = parsed.blackoutPeriods || [];
            } catch { }
        } else {
            newAvailSlots = data.availability?.slots || [];
            newBlackoutPeriods = data.availability?.blackoutPeriods || [];
        }

        console.log("Validation Debug - oldAvailSlots:", oldAvailSlots);
        console.log("Validation Debug - newAvailSlots:", newAvailSlots);
        console.log("Validation Debug - newBlackoutPeriods:", newBlackoutPeriods);

        if (newAvailSlots.length === 0 && newBlackoutPeriods.length === 0) {
            return { affectedCourses: 0, affectedBookings: 0 };
        }

        let isReduction = false;
        if (oldAvailSlots.length === 0 && newAvailSlots.length > 0) {
            isReduction = true;
        } else {
            for (const oldSlot of oldAvailSlots) {
                const oldStartMin = parseInt(oldSlot.startTime.split(':')[0]) * 60 + parseInt(oldSlot.startTime.split(':')[1]);
                const oldEndMin = parseInt(oldSlot.endTime.split(':')[0]) * 60 + parseInt(oldSlot.endTime.split(':')[1]);
                let covered = false;
                for (const newSlot of newAvailSlots) {
                    if (newSlot.day?.toUpperCase() !== oldSlot.day?.toUpperCase()) continue;
                    const newStartMin = parseInt(newSlot.startTime.split(':')[0]) * 60 + parseInt(newSlot.startTime.split(':')[1]);
                    const newEndMin = parseInt(newSlot.endTime.split(':')[0]) * 60 + parseInt(newSlot.endTime.split(':')[1]);
                    if (newStartMin <= oldStartMin && newEndMin >= oldEndMin) {
                        covered = true;
                        break;
                    }
                }
                if (!covered) {
                    console.log("Validation Debug - slot not covered:", oldSlot);
                    isReduction = true;
                    break;
                }
            }
        }

        console.log("Validation Debug - isReduction:", isReduction);

        if (!isReduction && newBlackoutPeriods.length === 0) {
            return { affectedCourses: 0, affectedBookings: 0 };
        }

        const affectedCourses = new Set<string>();
        const affectedBookings = new Set<string>();

        const dayMap: Record<string, number> = {
            'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3, 'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
        };

        const checkTimeFit = (sessionDay: number, sessionStart: Date, sessionEnd: Date) => {
            if (newAvailSlots.length === 0) return true;
            const startMin = sessionStart.getHours() * 60 + sessionStart.getMinutes();
            const endMin = sessionEnd.getHours() * 60 + sessionEnd.getMinutes();

            for (const slot of newAvailSlots) {
                const upperDay = slot.day?.toUpperCase() || '';
                if (dayMap[upperDay] !== sessionDay) continue;

                const sSplit = slot.startTime.split(':');
                const slotStart = parseInt(sSplit[0]) * 60 + parseInt(sSplit[1]);
                const eSplit = slot.endTime.split(':');
                const slotEnd = parseInt(eSplit[0]) * 60 + parseInt(eSplit[1]);

                if (startMin >= slotStart && endMin <= slotEnd) {
                    return true;
                }
            }
            console.log(`Validation Debug - checkTimeFit FAILED for session: day=${sessionDay}, startMin=${startMin}, endMin=${endMin}, slots:`, JSON.stringify(newAvailSlots));
            return false;
        };

        const isInBlackout = (checkStart: Date, checkEnd: Date) => {
            for (const bp of newBlackoutPeriods) {
                const bpStart = new Date(bp.startDate + 'T00:00:00');
                const bpEnd = new Date(bp.endDate + 'T23:59:59');
                if (checkStart <= bpEnd && checkEnd >= bpStart) {
                    return true;
                }
            }
            return false;
        };

        for (const session of room.sessions) {
            const sessionDay = session.startTime.getDay();
            if (!checkTimeFit(sessionDay, session.startTime, session.endTime) || isInBlackout(session.startTime, session.endTime)) {
                if (session.courseId) affectedCourses.add(session.courseId);
                if (session.roomBookingId) affectedBookings.add(session.roomBookingId);
            }
        }

        for (const booking of room.bookings) {
            // CUSTOM_TIME bookings are validated through their individual sessions in the loop above.
            if (booking.bookingMode === 'CUSTOM_TIME') continue;

            let fits = true;
            const startStr = booking.startDate.toISOString().substring(0, 10);
            const current = new Date(startStr + 'T00:00:00');
            const endStr = booking.endDate.toISOString().substring(0, 10);
            const end = new Date(endStr + 'T23:59:59');

            while (current <= end) {
                const day = current.getDay();
                if (booking.bookingMode === 'UNIFIED_TIME' && booking.selectedDays.length > 0) {
                    const selectedDaysNumbers = booking.selectedDays.map((d: string) => dayMap[d]);
                    if (!selectedDaysNumbers.includes(day)) {
                        current.setDate(current.getDate() + 1);
                        continue;
                    }
                }

                const curStart = new Date(current);
                curStart.setHours(booking.defaultStartTime.getHours(), booking.defaultStartTime.getMinutes());
                const curEnd = new Date(current);
                curEnd.setHours(booking.defaultEndTime.getHours(), booking.defaultEndTime.getMinutes());

                if (!checkTimeFit(day, curStart, curEnd) || isInBlackout(curStart, curEnd)) {
                    fits = false;
                    break;
                }
                current.setDate(current.getDate() + 1);
            }

            if (!fits) {
                affectedBookings.add(booking.id);
                if (booking.courseId) affectedCourses.add(booking.courseId);
            }
        }

        return {
            affectedCourses: affectedCourses.size,
            affectedBookings: affectedBookings.size
        };
    }

    /**
     * Update an existing hall
     */
    async updateInstituteHall(
        userId: string,
        hallId: string,
        data: Partial<{
            name: string;
            capacity: number;
            location: string | null;
            locationUrl: string | null;
            type: string;
            description: string | null;
            pricePerHour: number;
            facilities: string[];
            image: string | null;
            isActive: boolean;
            availability?: any;
        }>,
    ) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");

        const hall = await prisma.room.findFirst({
            where: { id: hallId, instituteId: institute.id },
        });
        if (!hall) throw new Error("لم يتم العثور على القاعة");

        if (data.availability !== undefined) {
            const validation = await this.validateInstituteHallUpdate(userId, hallId, { availability: data.availability });
            if (validation.affectedCourses > 0 || validation.affectedBookings > 0) {
                throw new Error("لا يمكن حفظ التعديلات بسبب تأثيرها على دورات أو حجوزات نشطة. يرجى مراجعة ا�„فترات.");
            }
        }

        auditService.logAction({
            action: 'UPDATE',
            entityName: 'Room',
            entityId: hallId, // Store actual ID
            description: `تعديل قاعة. القيم القديمة: ${JSON.stringify({ capacity: hall.capacity, pricePerHour: hall.pricePerHour, availability: hall.availability })}. القيم الجديدة: ${JSON.stringify({ capacity: data.capacity, pricePerHour: data.pricePerHour, availability: data.availability })}`,
            performedBy: userId
        }).catch(e => console.error(e));

        return prisma.room.update({
            where: { id: hallId },
            data,
        });
    }

    /**
     * Delete a hall
     */
    async removeInstituteHall(userId: string, hallId: string) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");

        const hall = await prisma.room.findFirst({
            where: { id: hallId, instituteId: institute.id },
        });
        if (!hall) throw new Error("لم يتم العثور على القاعة");

        // Check if there are active bookings
        const count = await prisma.roomBooking.count({
            where: { roomId: hallId },
        });

        if (count > 0) {
            // Soft delete by setting isActive to false if there are bookings
            return prisma.room.update({
                where: { id: hallId },
                data: { isActive: false },
            });
        }


        auditService.logAction({
            action: 'DELETE',
            entityName: 'Room',
            entityId: 'system_log', // Default if ID is complex to resolve
            description: 'حذف قاعة',
            performedBy: userId
        }).catch(e => console.error(e));

        return prisma.room.delete({
            where: { id: hallId },
        });
    }

    /**
     * Get all room bookings for an institute's halls
     */
    async getInstituteRoomBookings(userId: string) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");

        return prisma.roomBooking.findMany({
            where: {
                room: {
                    instituteId: institute.id,
                },
            },
            include: {
                room: {
                    select: { id: true, name: true },
                },
                course: {
                    select: { id: true, title: true },
                },
                requestedBy: {
                    select: { id: true, name: true, email: true, phone: true },
                },
                approvedBy: {
                    select: { id: true, name: true },
                },
                payments: true,
                sessions: {
                    orderBy: { startTime: "asc" },
                    select: {
                        id: true,
                        startTime: true,
                        endTime: true,
                        status: true,
                        topic: true,
                        type: true,
                        location: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    /**
     * Get all unique direct hall bookers for this institute (for announcement targeting).
     * Returns one entry per unique requester with a list of halls they booked.
     */
    async getDirectBookers(userId: string) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error('لم يتم العثور على المعهد');

        const bookings = await prisma.roomBooking.findMany({
            where: {
                room: { instituteId: institute.id },
                status: { not: 'CANCELLED' },
                requestedById: { not: null },
                NOT: { requestedById: userId },
            },
            include: {
                requestedBy: {
                    select: { id: true, name: true, email: true, phone: true }
                },
                room: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Group by userId → keep unique bookers with their booked halls
        const bookerMap = new Map<string, {
            id: string;
            name: string;
            email: string | null;
            phone: string | null;
            bookedHalls: { bookingId: string; hallName: string; status: string }[];
        }>();

        for (const booking of bookings) {
            if (!booking.requestedBy) continue;
            const uid = booking.requestedBy.id;
            if (!bookerMap.has(uid)) {
                bookerMap.set(uid, {
                    id: uid,
                    name: booking.requestedBy.name,
                    email: booking.requestedBy.email,
                    phone: booking.requestedBy.phone,
                    bookedHalls: []
                });
            }
            bookerMap.get(uid)!.bookedHalls.push({
                bookingId: booking.id,
                hallName: booking.room.name,
                status: booking.status
            });
        }

        return Array.from(bookerMap.values());
    }

    /**
     * Update room booking status (Approve/Reject)
     */
    async updateRoomBookingStatus(
        userId: string,
        bookingId: string,
        data: {
            status: "APPROVED" | "REJECTED";
            notes?: string;
            adminId: string;
            roomId?: string;
        },
    ) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");

        const booking = await prisma.roomBooking.findFirst({
            where: {
                id: bookingId,
                room: {
                    instituteId: institute.id,
                },
            },
            include: { payments: true }
        });

        if (!booking) throw new Error("لم يتم العثور على طلب الحجز");

        const updateData: any = {
            status: data.status,
            approvedById: data.adminId, // Track who approved/rejected it
        };

        if (data.notes && data.status === "REJECTED") {
            updateData.rejectionReason = data.notes;
        } else if (data.notes) {
            updateData.notes = data.notes;
        }

        if (data.roomId && data.status === "APPROVED") {
            // Allow changing the room when approving
            updateData.roomId = data.roomId;
        }

        const updatedBooking = await prisma.roomBooking.update({
            where: { id: bookingId },
            data: updateData,
            include: {
                room: { select: { id: true, name: true } },
                requestedBy: { select: { id: true, name: true, email: true, phone: true } },
                payments: true
            },
        });

        // Cascade status to the LATEST pending Payment and Course if APPROVED or REJECTED
        if (data.status === "APPROVED") {
            if (updatedBooking.payments && updatedBooking.payments.length > 0) {
                // Only update the latest pending payment
                const latestPayment = [...updatedBooking.payments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
                if (latestPayment && latestPayment.status === "PENDING_REVIEW") {
                    await prisma.payment.update({
                        where: { id: latestPayment.id },
                        data: {
                            status: "APPROVED",
                            reviewedBy: data.adminId,
                            reviewedAt: new Date(),
                            notes: data.notes
                        }
                    });
                }
            }
            if (booking.courseId) {
                const targetCourse = await prisma.course.findUnique({
                    where: { id: booking.courseId },
                    select: { status: true }
                });

                // Always set course to ACTIVE when booking is approved
                await prisma.course.update({
                    where: { id: booking.courseId },
                    data: { status: "ACTIVE" }
                });

                if (targetCourse?.status === 'PENDING_MINIMUM' || targetCourse?.status === 'PENDING_REVIEW') {
                    // Notify any existing preliminary students
                    await this.activateCourseAndNotifyStudents(booking.courseId);
                }
            }

            await prisma.session.updateMany({
                where: { roomBookingId: bookingId },
                data: { status: "SCHEDULED" }
            });
        } else if (data.status === "REJECTED") {
            // Also reject the latest pending payment if the booking is rejected
            if (updatedBooking.payments && updatedBooking.payments.length > 0) {
                const latestPayment = [...updatedBooking.payments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
                if (latestPayment && latestPayment.status === "PENDING_REVIEW") {
                    await prisma.payment.update({
                        where: { id: latestPayment.id },
                        data: {
                            status: "REJECTED",
                            reviewedBy: data.adminId,
                            reviewedAt: new Date(),
                            rejectionReason: data.notes
                        }
                    });
                }
            }
        }

        // ── Notify the Requester (Trainer) ──
        if (updatedBooking.requestedBy) {
            const requester = updatedBooking.requestedBy;
            const roomName = updatedBooking.room.name;

            if (data.status === "APPROVED") {
                await notificationService.createNotification({
                    userId: requester.id,
                    type: 'BOOKING_STATUS_CHANGE',
                    title: 'تم قبول حجز القاعة',
                    message: `تمت ا�„�…�ˆاف�‚ة على حجزك لقاعة "${roomName}"`,
                    relatedEntityId: bookingId,
                    actionUrl: '/trainer/halls', // usually bookings but halls has the list maybe
                    emailFn: requester.email ? () => mailerService.sendBookingApproved(requester.email!, requester.name, roomName) : undefined,
                    whaFn: requester.phone ? () => whatsAppService.notifyBookingApproved(requester.phone!, requester.name, roomName) : undefined,
                });
            } else if (data.status === "REJECTED") {
                await notificationService.createNotification({
                    userId: requester.id,
                    type: 'BOOKING_REJECTED',
                    title: 'تم رفض حجز القاعة',
                    message: `تم رفض حجزك لقاعة "${roomName}".${data.notes ? ` السبب: ${data.notes}` : ''}`,
                    relatedEntityId: bookingId,
                    actionUrl: '/trainer/halls',
                    emailFn: requester.email ? () => mailerService.sendBookingRejected(requester.email!, requester.name, roomName, data.notes) : undefined,
                    whaFn: requester.phone ? () => whatsAppService.notifyBookingRejected(requester.phone!, requester.name, roomName, data.notes) : undefined,
                });
            }
        }


        auditService.logAction({
            action: 'UPDATE',
            entityName: 'RoomBooking',
            entityId: 'system_log', // Default if ID is complex to resolve
            description: 'تحديث حالة حجز قاعة',
            performedBy: userId
        }).catch(e => console.error(e));

        return updatedBooking;

    }

    // =====================================================
    // COURSE STUDENTS MANAGEMENT
    // =====================================================

    /**
     * Get course details and enrolled students for an institute's course
     */
    async getCourseStudents(userId: string, courseId: string) {
        const institute = await prisma.institute.findUnique({
            where: { userId },
        });

        if (!institute) {
            throw new Error("لم يتم العثور على المعهد");
        }

        const course = await prisma.course.findFirst({
            where: { id: courseId, instituteId: institute.id, trainerId: null },
            include: {
                trainer: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        if (!course) {
            throw new Error("الدورة غير موجودة أو لا تنتمي لهذا المعهد");
        }

        const enrollments = await prisma.enrollment.findMany({
            where: {
                courseId,
                deletedAt: null,
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
            },
            orderBy: { enrolledAt: "desc" },
        });

        return {
            course: {
                id: course.id,
                title: course.title,
                maxStudents: course.maxStudents,
                trainer: course.trainer,
            },
            enrollments: enrollments.map((e) => ({
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
     * Unenroll a student from a course (set status to CANCELLED)
     */
    async unenrollStudent(
        userId: string,
        courseId: string,
        enrollmentId: string,
        reason: string,
    ) {
        const institute = await prisma.institute.findUnique({
            where: { userId },
        });

        if (!institute) {
            throw new Error("لم يتم العثور على المعهد");
        }

        const course = await prisma.course.findFirst({
            where: { id: courseId, instituteId: institute.id },
        });

        if (!course) {
            throw new Error("الدورة غير موجودة أو لا تنتمي لهذا المعهد");
        }

        return prisma.$transaction(async (tx) => {
            // Delete associated payments
            await tx.payment.deleteMany({
                where: { enrollmentId: enrollmentId }
            });

            // Update enrollment status
            await tx.enrollment.update({
                where: { id: enrollmentId },
                data: {
                    status: "CANCELLED",
                    cancellationReason: reason,
                },
            });


            auditService.logAction({
                action: 'UPDATE',
                entityName: 'Enrollment',
                entityId: 'system_log', // Default if ID is complex to resolve
                description: 'إلغاء تسجيل طالب',
                performedBy: userId
            }).catch(e => console.error(e));

            return { message: "تم إلغاء تسجيل الطالب بنجاح" };
        });
    }

    /**
     * Get course details by ID
     */
    async getCourseById(userId: string, courseId: string) {
        const institute = await prisma.institute.findUnique({
            where: { userId },
        });

        if (!institute) {
            throw new Error("لم يتم العثور على المعهد");
        }

        const course = await prisma.course.findFirst({
            where: { id: courseId, instituteId: institute.id, trainerId: null },
            include: {
                trainer: {
                    select: { id: true, name: true, email: true },
                },
                category: {
                    select: { id: true, name: true },
                },
                _count: {
                    select: { enrollments: true },
                },
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

        if (!course) {
            throw new Error("الدورة غير موجودة أو لا تنتمي لهذا المعهد");
        }

        const staffTrainerIds = (course as any).staffTrainerIds as string[] || [];
        const staffTrainers = staffTrainerIds.length > 0
            ? await prisma.instituteStaff.findMany({
                where: { id: { in: staffTrainerIds } },
                select: { id: true, name: true, avatar: true }
            })
            : [];

        return {
            ...course,
            price: Number(course.price),
            enrolledStudents: course._count.enrollments,
            trainer: course.trainer ? {
                id: course.trainer.id,
                name: course.trainer.name,
                email: course.trainer.email,
            } : (((course as any).staffTrainerIds?.length > 0) ? {
                id: (course as any).staffTrainerIds[0],
                name: "مدرب معهد",
                email: null,
            } : {
                id: null,
                name: "غير محدد",
                email: null,
            }),
            trainers: staffTrainers,
            category: course.category?.name || "-",
            deliveryType: ['FLEXIBLE', 'CAPACITY_BASED'].includes(course.bookingTrigger) ? 'flexible'
                : (course as any).sessions?.[0]?.type === 'ONLINE' ? 'online'
                    : (course as any).sessions?.length > 0 ? 'hybrid' : 'online',
            hallId: (course as any).sessions?.[0]?.roomId ?? null,
            prerequisites: course.prerequisites ? course.prerequisites.split('\n') : [],
            sessions: ((course as any).sessions ?? []).map((s: any) => ({
                id: s.id,
                startTime: s.startTime,
                endTime: s.endTime,
                topic: s.topic ?? '',
                location: s.location ?? '',
                meetingLink: s.meetingLink ?? '',
                type: s.type ?? '',
            })),
            roomBooking: (course as any).roomBookings?.[0] ? {
                id: (course as any).roomBookings[0].id,
                status: (course as any).roomBookings[0].status.toLowerCase(),
                rejectionReason: (course as any).roomBookings[0].rejectionReason,
                totalPrice: Number((course as any).roomBookings[0].totalPrice),
                payment: (course as any).roomBookings[0].payments?.[0] ? {
                    id: (course as any).roomBookings[0].payments[0].id,
                    status: (course as any).roomBookings[0].payments[0].status.toLowerCase(),
                    amount: Number((course as any).roomBookings[0].payments[0].amount),
                    receipt: (course as any).roomBookings[0].payments[0].depositSlipImage
                } : null
            } : null,
        };
    }

    /**
     * Update course details
     */
    async updateCourse(userId: string, courseId: string, data: any) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");

        const course = await prisma.course.findFirst({
            where: { id: courseId, instituteId: institute.id, trainerId: null },
        });
        if (!course) throw new Error("الدورة غير موجودة أو لا تنتمي لهذا المعهد");

        // Validate trainers if provided
        let parsedTrainerIds: string[] = [];
        if (data.trainerIds) {
            try {
                parsedTrainerIds = typeof data.trainerIds === 'string' ? JSON.parse(data.trainerIds) : data.trainerIds;
                if (!Array.isArray(parsedTrainerIds)) parsedTrainerIds = [];
            } catch {
                parsedTrainerIds = [];
            }
            if (parsedTrainerIds.length > 0) {
                const staffTrainers = await prisma.instituteStaff.findMany({
                    where: { id: { in: parsedTrainerIds }, instituteId: institute.id, status: "ACTIVE" },
                });
                if (staffTrainers.length !== parsedTrainerIds.length) {
                    throw new Error("بعض المدربين المحددين غير موجودين أو غير نشطين");
                }
            }
        } else if (data.trainerId) {
            const staffTrainer = await prisma.instituteStaff.findFirst({
                where: { id: data.trainerId, instituteId: institute.id, status: "ACTIVE" },
            });
            if (!staffTrainer) throw new Error("المدرب غير موجود أو غير نشط ف�Š قائمة مدربي المعهد");
            parsedTrainerIds = [data.trainerId];
        }

        const updateData: any = {
            ...(data.title !== undefined && { title: data.title }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.shortDescription !== undefined && { shortDescription: data.shortDescription }),
            ...(data.image !== undefined && { image: data.image }),
            ...(data.price !== undefined && { price: Number(data.price) }),
            ...(data.duration !== undefined && { duration: Number(data.duration) }),
            ...(data.maxStudents !== undefined && { maxStudents: Number(data.maxStudents) }),
            ...(data.minStudents !== undefined && data.minStudents !== '' && { minStudents: Number(data.minStudents) }),
            ...(data.startDate && { startDate: new Date(data.startDate) }),
            ...(data.endDate && { endDate: new Date(data.endDate) }),
            ...(data.categoryId !== undefined && { categoryId: data.categoryId || null }),
            ...(data.status && { status: data.status.toUpperCase() }),
            ...((parsedTrainerIds.length > 0 || data.trainerIds !== undefined || data.trainerId !== undefined) && { staffTrainerIds: parsedTrainerIds, trainerId: null }),
            ...(data.bookingTrigger !== undefined && { bookingTrigger: data.bookingTrigger }),
            ...(data.objectives !== undefined && { objectives: data.objectives ?? [] }),
            ...(data.prerequisites !== undefined && { prerequisites: data.prerequisites?.length ? data.prerequisites.join('\n') : null }),
            ...(data.tags !== undefined && { tags: data.tags ?? [] }),
        };

        const updatedCourse = await (prisma.course as any).update({
            where: { id: courseId },
            data: updateData,
        });

        // ── PENDING_MINIMUM → ACTIVE transition ──────────────────────────────────
        // When the owner completes course setup and publishes it, notify all waiting students.
        const prevStatus = course.status as string;
        const newStatus = updateData.status as string | undefined;
        if (prevStatus === 'PENDING_MINIMUM' && newStatus === 'ACTIVE') {
            // Fire-and-forget: move students to PENDING_PAYMENT + send notifications
            this.activateCourseAndNotifyStudents(courseId).catch(e =>
                console.error('[InstituteService] activateCourseAndNotifyStudents:', e),
            );
        }

        // If publishing (ACTIVE) with sessions payload, create sessions
        if (data.status?.toUpperCase() === 'ACTIVE' && Array.isArray(data.sessions) && data.sessions.length > 0) {
            const isFlexible = data.deliveryType === 'flexible';
            const sessionType = data.deliveryType === 'online' ? 'ONLINE' : 'IN_PERSON';
            const mappedSessions = data.sessions.map((s: any) => ({
                startTime: new Date(`${s.date}T${s.startTime}`),
                endTime: new Date(`${s.date}T${s.endTime}`),
                type: sessionType,
                status: 'SCHEDULED' as const,
                location: s.location || '',
                meetingLink: s.meetingLink || null,
                topic: s.topic || '',
                courseId,
            }));

            // Snapshot old sessions before deletion (for change detection)
            const oldSessions = await prisma.session.findMany({
                where: { courseId },
                select: { startTime: true, endTime: true }
            });

            // Delete old sessions first
            await prisma.session.deleteMany({ where: { courseId } });

            if (data.hallId) {
                const room = await prisma.room.findUnique({ where: { id: data.hallId } });
                if (!room) throw new Error('القاعة غير موجودة');

                const totalHours = mappedSessions.reduce((acc: number, s: any) =>
                    acc + (s.endTime.getTime() - s.startTime.getTime()) / 3600000, 0);
                const totalPrice = totalHours * Number(room.pricePerHour);
                const sorted = [...mappedSessions].sort((a: any, b: any) => a.startTime - b.startTime);

                const roomBooking = await prisma.roomBooking.create({
                    data: {
                        bookingMode: 'CUSTOM_TIME',
                        startDate: sorted[0].startTime,
                        endDate: sorted[sorted.length - 1].endTime,
                        selectedDays: [],
                        defaultStartTime: sorted[0].startTime,
                        defaultEndTime: sorted[sorted.length - 1].endTime,
                        status: 'APPROVED',
                        totalPrice,
                        roomId: room.id,
                        requestedById: userId,
                        courseId,
                        purpose: `حجز لدورة: ${updatedCourse.title}`
                    }
                });

                if (data.paymentReceiptPath) {
                    await prisma.payment.create({
                        data: {
                            amount: totalPrice,
                            currency: 'YER',
                            depositSlipImage: data.paymentReceiptPath,
                            notes: `إيصال دفع لحجز قاعة (${room.name})`,
                            status: 'APPROVED',
                            roomBookingId: roomBooking.id
                        }
                    });
                }

                await prisma.session.createMany({
                    data: mappedSessions.map((s: any) => ({ ...s, roomBookingId: roomBooking.id, roomId: room.id }))
                });
            } else {
                await prisma.session.createMany({ data: mappedSessions });
            }

            // ── Notify enrolled students if schedule actually changed ──
            const hasChanged = oldSessions.length !== mappedSessions.length ||
                oldSessions.some((old: any, i: number) => {
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
                                title: `🗓️ تحديث الجدول الدراسي لدورة "${updatedCourse.title}"`,
                                message: `تم تحديث جدول دورة "${updatedCourse.title}" بالكامل (${count} جلسة).${reason ? ` السبب: ${reason}` : ''}`,
                                relatedEntityId: courseId,
                                actionUrl: '/student/courses',
                                emailFn: student.email
                                    ? () => mailerService.sendSessionsRescheduled(student.email!, student.name, updatedCourse.title, count, reason)
                                    : undefined,
                                whaFn: student.phone
                                    ? () => whatsAppService.notifySessionsRescheduled(student.phone!, student.name, updatedCourse.title, count, reason)
                                    : undefined,
                            });
                        }
                    } catch (err) {
                        console.error('[institute.updateCourse] Failed to notify students of schedule change:', err);
                    }
                });
            }
        }


        auditService.logAction({
            action: 'UPDATE',
            entityName: 'Course',
            entityId: 'system_log', // Default if ID is complex to resolve
            description: 'تعديل بيانات دورة',
            performedBy: userId
        }).catch(e => console.error(e));

        return updatedCourse;
    }

    /**
     * Get all course categories
     */
    async getCategories() {
        return prisma.courseCategory.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        });
    }

    /**
     * Create a new category (if it doesn't already exist)
     */
    async createCategory(name: string) {
        if (!name || !name.trim()) throw new Error("اسم ا�„تص�†�Šف مطلوب");
        const trimmed = name.trim();
        const existing = await prisma.courseCategory.findFirst({
            where: { name: { equals: trimmed, mode: "insensitive" } },
        });
        if (existing) return existing;
        // Auto-generate unique slug from name (e.g. "تطوير الويب" → "twyr-ob-1234")
        const base = trimmed
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^\w\u0600-\u06FF-]/g, "")
            .substring(0, 40);
        const slug = `${base}-${Date.now()}`;
        return prisma.courseCategory.create({
            data: { name: trimmed, slug },
            select: { id: true, name: true },
        });
    }

    async createTag(name: string) {
        if (!name || !name.trim()) throw new Error("اسم الوسم مطلوب");
        const trimmed = name.trim();
        const existing = await prisma.tag.findFirst({
            where: { name: { equals: trimmed, mode: "insensitive" } },
        });
        if (existing) return existing;
        const base = trimmed
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^\w\u0600-\u06FF-]/g, "")
            .substring(0, 40);
        const slug = `${base}-${Date.now()}`;
        return prisma.tag.create({
            data: { name: trimmed, slug },
            select: { id: true, name: true, color: true }
        });
    }

    /**
     * Get all halls (rooms) for the institute
     */
    async getHalls(userId: string) {
        const institute = await prisma.institute.findUnique({
            where: { userId },
        });

        if (!institute) {
            throw new Error("لم يتم العثور على المعهد");
        }

        return prisma.room.findMany({
            where: {
                instituteId: institute.id,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                capacity: true,
                pricePerHour: true,
                image: true,
                facilities: true,
            },
            orderBy: { name: "asc" },
        });
    }

    /**
     * Create a new course
     */
    async createCourse(userId: string, data: any, paymentReceiptPath?: string) {
        const institute = await prisma.institute.findUnique({
            where: { userId },
        });

        if (!institute) {
            throw new Error("لم يتم العثور على المعهد");
        }

        // Support both trainerIds[] (new) and trainerId (legacy)
        const trainerIds: string[] = Array.isArray(data.trainerIds)
            ? data.trainerIds
            : data.trainerId
                ? [data.trainerId]
                : [];

        // Validate all trainers belong to this institute and are active
        if (trainerIds.length > 0) {
            const validTrainers = await prisma.instituteStaff.findMany({
                where: { id: { in: trainerIds }, instituteId: institute.id, status: "ACTIVE" },
            });

            if (validTrainers.length !== trainerIds.length) {
                throw new Error("بعض المدربين غير موجودين أو غير نشطين ف�Š طاقم المعهد");
            }
        }

        // Validate required numeric fields
        if (data.minStudents === undefined || data.minStudents === '' || data.minStudents === null) {
            throw new Error("يرجى تحديد الحد الأدنى لعدد الطلاب");
        }

        // Create course
        const isFlexible = data.deliveryType === 'flexible';
        const sessionType = data.deliveryType === 'online' ? 'ONLINE' : 'IN_PERSON';

        // Provide a robust fallback for creating nested sessions
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

        const course = await (prisma.course as any).create({
            data: {
                title: data.title,
                description: data.description,
                shortDescription: data.shortDescription,
                price: Number(data.price),
                duration: Number(data.duration),
                startDate: finalStartDate,
                endDate: finalEndDate,
                maxStudents: Number(data.maxStudents),
                minStudents: data.minStudents !== undefined && data.minStudents !== '' ? Number(data.minStudents) : undefined,
                status: (data.status as any) || 'DRAFT',
                bookingTrigger: isFlexible ? 'FLEXIBLE' : (data.bookingTrigger || 'IMMEDIATE'),
                image: data.image,
                staffTrainerIds: trainerIds,    // Store all IDs
                trainerId: null,
                instituteId: institute.id,
                categoryId: data.categoryId,
                objectives: data.objectives || [],
                prerequisites: data.prerequisites ? data.prerequisites.join('\n') : null,
                tags: data.tags || [],
                // We will create sessions separately if there's a hall to link them to RoomBooking
                sessions: data.hallId ? undefined : {
                    create: mappedSessions
                }
            },
        });

        if (data.hallId && mappedSessions.length > 0) {
            const room = await prisma.room.findUnique({ where: { id: data.hallId } });
            if (!room) throw new Error("القاعة المحددة غير موجودة");

            // Calculate total hours to exact decimal (e.g., 2.5 hours)
            const totalHours = mappedSessions.reduce((acc: number, session: any) => {
                const diffMs = session.endTime.getTime() - session.startTime.getTime();
                return acc + (diffMs / (1000 * 60 * 60));
            }, 0);

            const totalPrice = totalHours * Number(room.pricePerHour);

            // Determine unique dates to extract DayOfWeek (Optional depending on strictly how the enum is used)
            // For now, CUSTOM_TIME mode handles diverse session windows.
            const roomBooking = await prisma.roomBooking.create({
                data: {
                    bookingMode: "CUSTOM_TIME",
                    startDate: finalStartDate!, // guaranteed non-null � only reached when sessions exist
                    endDate: finalEndDate!,
                    selectedDays: [], // Can be populated if needed
                    defaultStartTime: mappedSessions[0].startTime,
                    defaultEndTime: mappedSessions[0].endTime,
                    status: "APPROVED", // Auto-approved for Institute Owner
                    totalPrice: totalPrice,
                    roomId: room.id,
                    requestedById: userId,
                    courseId: course.id,
                    purpose: `حجز لدورة: ${course.title}`
                }
            });

            // Create Payment Request (Internal for institute owner)
            if (paymentReceiptPath) {
                await prisma.payment.create({
                    data: {
                        amount: totalPrice,
                        currency: "YER",
                        depositSlipImage: paymentReceiptPath,
                        notes: `إيصال دفع حجز قاعة للدورة: ${course.title}`,
                        status: "APPROVED", // Auto-approved for Institute Owner
                        roomBookingId: roomBooking.id
                    }
                });
            }

            // Create explicitly linked sessions using createMany
            await prisma.session.createMany({
                data: mappedSessions.map((session: any) => ({
                    ...session,
                    courseId: course.id,
                    roomBookingId: roomBooking.id,
                    roomId: room.id
                }))
            });
        }


        auditService.logAction({
            action: 'CREATE',
            entityName: 'Course',
            entityId: 'system_log', // Default if ID is complex to resolve
            description: 'إنشاء دورة جديدة',
            performedBy: userId
        }).catch(e => console.error(e));

        return course;
    }

    // =====================================================
    // MINIMUM ENROLLMENT THRESHOLD LOGIC
    // =====================================================

    /**
     * Check if a PENDING_MINIMUM course has reached its minimum student threshold.
     * If yes, notify the owner ONLY � students await owner to complete course setup.
     * Called every time a preliminary enrollment is accepted.
     */
    private async checkAndTriggerMinimumThreshold(courseId: string): Promise<void> {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                institute: { include: { user: { select: { id: true, name: true, email: true } } } },
                trainer: { select: { id: true, name: true, email: true } },
            },
        });

        if (!course || course.status !== 'PENDING_MINIMUM') return;

        // Count students currently in PRELIMINARY_APPROVED state for this course
        const acceptedCount = await prisma.enrollment.count({
            where: { courseId, status: 'PRELIMINARY_APPROVED', deletedAt: null },
        });

        if (acceptedCount < course.minStudents) return; // Threshold not yet reached

        // Guard: avoid duplicate notifications (check if owner was already notified)
        const ownerUserId = course.institute?.userId || course.trainerId;
        if (!ownerUserId) return;

        const alreadyNotified = await prisma.notification.findFirst({
            where: { userId: ownerUserId, type: 'MINIMUM_REACHED' as any, relatedEntityId: courseId },
        });
        if (alreadyNotified) return;

        // Determine setup URL based on owner type
        const setupPath = course.institute
            ? `/institute/courses/${courseId}/edit?tab=schedule`
            : `/trainer/courses/${courseId}/edit?tab=schedule`;
        const setupUrl = `${FRONTEND_URL}${setupPath}`;

        const ownerName = course.institute?.user?.name || course.trainer?.name || 'المالك';
        const ownerEmail = course.institute?.user?.email || course.trainer?.email;

        // Notify course owner
        await notificationService.createNotification({
            userId: ownerUserId,
            type: 'MINIMUM_REACHED',
            title: `🎉 اكتمل الحد الأدنى ف�Š دورة "${course.title}"`,
            message: `وصل عدد الطلاب المقبولين مبدئياً إلى ${course.minStudents}. يرجى إكمال إعداد الدورة (القاعة + الجلسات) �„تفع�Š�„�‡ا وإشعار الطلاب.`,
            actionUrl: setupPath,
            relatedEntityId: courseId,
            emailFn: ownerEmail
                ? () => mailerService.sendMinimumReachedEmail(ownerEmail, ownerName, course.title, course.minStudents, setupUrl)
                : undefined,
        });
    }

    /**
     * Public entry point: owner manually activates a PENDING_MINIMUM online course.
     * Validates the course belongs to the caller, threshold is met, and then
     * calls activateCourseAndNotifyStudents.
     */
    async activatePendingMinimumCourse(userId: string, courseId: string): Promise<{ courseId: string }> {
        // Resolve ownership � works for institute or trainer
        const institute = await prisma.institute.findUnique({ where: { userId } });

        let course: any;
        if (institute) {
            course = await (prisma.course as any).findFirst({
                where: { id: courseId, instituteId: institute.id },
                include: { _count: { select: { enrollments: { where: { status: 'PRELIMINARY_APPROVED', deletedAt: null } } } } }
            });
        } else {
            // Trainer ownership check
            course = await (prisma.course as any).findFirst({
                where: { id: courseId, trainer: { userId } },
                include: { _count: { select: { enrollments: { where: { status: 'PRELIMINARY_APPROVED', deletedAt: null } } } } }
            });
        }

        if (!course) throw new Error('الدورة غير موجودة أو لا تنتمي لك');
        if (course.status !== 'PENDING_MINIMUM') throw new Error('هذه الدورة لا تحتاج إلى تفع�Š�„ يدوي');

        const acceptedCount = course._count.enrollments;
        if (acceptedCount < course.minStudents) {
            throw new Error(`لم يكتمل الحد الأدنى بعد (${acceptedCount}/${course.minStudents})`);
        }

        await this.activateCourseAndNotifyStudents(courseId);

        auditService.logAction({
            action: 'UPDATE',
            entityName: 'Course',
            entityId: 'system_log', // Default if ID is complex to resolve
            description: 'تفع�Š�„ دورة كانت معلقة بانتظار الحد الأدنى',
            performedBy: userId
        }).catch(e => console.error(e));

        return { courseId };
    }

    /**
     * Called when the owner transitions a PENDING_MINIMUM course to ACTIVE (has completed setup).
     * Moves all accepted-preliminary students to PENDING_PAYMENT and notifies them.
     */
    private async activateCourseAndNotifyStudents(courseId: string): Promise<void> {
        const enrollments = await prisma.enrollment.findMany({
            where: { courseId, status: 'PRELIMINARY_APPROVED', deletedAt: null },
            include: {
                student: { select: { id: true, name: true, email: true } },
                course: { select: { title: true } },
            },
        });

        if (enrollments.length === 0) return;

        const courseTitle = enrollments[0].course.title;
        const courseUrl = `${FRONTEND_URL}/student/courses/${courseId}`;

        // Batch-move all PRELIMINARY_APPROVED enrollments → PENDING_PAYMENT
        await prisma.enrollment.updateMany({
            where: { courseId, status: 'PRELIMINARY_APPROVED', deletedAt: null },
            data: { status: 'PENDING_PAYMENT' },
        });

        // Batch-create in-platform notifications
        await prisma.notification.createMany({
            data: enrollments.map(e => ({
                userId: e.student.id,
                type: 'COURSE_READY_FOR_PAYMENT' as any,
                title: '🎓 الدورة جاهزة! أكمل عملية ا�„دفع',
                message: `اكتملت إعدادات دورة "${courseTitle}". يرجى إكمال عملية ا�„دفع لتأكيد مقعدك.`,
                actionUrl: `/student/courses/${courseId}`,
                relatedEntityId: courseId,
            })),
            skipDuplicates: true,
        });

        // Fire emails (fire-and-forget)
        for (const enrollment of enrollments) {
            if (enrollment.student.email) {
                mailerService
                    .sendCourseReadyForPaymentEmail(
                        enrollment.student.email,
                        enrollment.student.name,
                        courseTitle,
                        courseUrl,
                    )
                    .catch(e => console.error('[Mailer] sendCourseReadyForPaymentEmail:', e));
            }
        }
    }

    /**
     * Get all sessions taking place in this institute's halls OR for courses owned by this institute
     */
    async getSchedule(userId: string) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error('لم يتم العثور على المعهد');

        // Get sessions only for courses CREATED by this institute (not external trainers)
        const sessions = await prisma.session.findMany({
            where: {
                course: {
                    instituteId: institute.id,
                    trainerId: null, // Only institute-owned courses, not external trainer courses
                }
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        enrollments: {
                            where: { status: { in: ['ACTIVE', 'PRELIMINARY_APPROVED', 'PENDING_PAYMENT'] } },
                            select: { id: true }
                        }
                    }
                },
                room: { select: { name: true } }
            },
            orderBy: { startTime: 'asc' }
        });

        return sessions.map(s => ({
            id: s.id,
            title: s.topic || 'جلسة تدريبية',
            courseId: s.course?.id ?? null,
            courseTitle: s.course?.title ?? '�',
            startTime: s.startTime,
            endTime: s.endTime,
            type: s.type.toLowerCase(),
            status: s.status.toLowerCase(),
            meetingLink: s.meetingLink ?? null,
            location: s.room?.name || s.location || (s.type === 'ONLINE' ? 'أونلاين' : 'غير محدد'),
            enrolledStudents: s.course?.enrollments.length ?? 0,
            roomId: s.roomId ?? null
        }));
    }

    /**
     * Reschedule or cancel a session in one of this institute's halls
     */
    async updateSession(userId: string, sessionId: string, data: { startTime?: Date; endTime?: Date; status?: string; meetingLink?: string; updateAll?: boolean; reason?: string }) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error('لم يتم العثور على المعهد');

        const rooms = await prisma.room.findMany({
            where: { instituteId: institute.id },
            select: { id: true }
        });
        const roomIds = rooms.map(r => r.id);

        const session = await prisma.session.findFirst({
            where: {
                id: sessionId,
                OR: [
                    { roomId: { in: roomIds } },
                    { roomBooking: { roomId: { in: roomIds } } },
                    { course: { instituteId: institute.id } }
                ]
            }
        });
        if (!session) throw new Error('الجلسة غير موجودة أو لا تنتمي لقاعات هذا المعهد');

        // Conflict check for reschedule
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
            // In getHallAvailabilityPublic, these act as blocks for the whole day range
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
            description: 'تعديل جلسة تدريبية',
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

        // ── Notify enrolled students about the session change ──
        if ((data.startTime || data.endTime) && session.courseId) {
            setImmediate(async () => {
                try {
                    const course = await prisma.course.findUnique({
                        where: { id: session.courseId! },
                        select: { title: true }
                    });
                    const courseTitle = course?.title ?? 'الدورة';

                    const enrollments = await prisma.enrollment.findMany({
                        where: {
                            courseId: session.courseId!,
                            status: { in: ['ACTIVE', 'PRELIMINARY_APPROVED', 'PENDING_PAYMENT'] },
                            deletedAt: null
                        },
                        select: { student: { select: { id: true, name: true, email: true, phone: true } } }
                    });

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
                            type: 'SESSION_REMINDER' as any,
                            title: `📅 تعديل موعد جلسة في دورة "${courseTitle}"`,
                            message: `تم تعديل موعد جلسة${session.topic ? ` "${session.topic}"` : ''} في دورة "${courseTitle}".${data.reason ? ` السبب: ${data.reason}` : ''}`,
                            relatedEntityId: session.courseId ?? undefined,
                            actionUrl: '/student/courses',
                            emailFn: student.email
                                ? () => mailerService.sendSessionUpdated(student.email!, student.name, courseTitle, changes, data.reason)
                                : undefined,
                            whaFn: student.phone
                                ? () => whatsAppService.notifySessionUpdated(student.phone!, student.name, courseTitle, { oldStart: changes.oldStart, newStart: changes.newStart, topic: changes.topic }, data.reason)
                                : undefined,
                        });
                    }
                } catch (err) {
                    console.error('[institute.updateSession] Failed to notify students:', err);
                }
            });
        }

        return updated;
    }

    /**
     * Get enrollments for courses owned by this institute
     */
    async getEnrollments(userId: string) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");

        return prisma.enrollment.findMany({
            where: {
                course: {
                    instituteId: institute.id,
                    trainerId: null
                },
                deletedAt: null
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
     * For PENDING_MINIMUM courses: accepting a preliminary enrollment triggers a threshold check.
     */
    async updateEnrollmentStatus(userId: string, enrollmentId: string, status: 'ACTIVE' | 'CANCELLED' | 'REJECT_PAYMENT' | 'REJECT_ENROLLMENT', reason?: string) {
        const institute = await prisma.institute.findUnique({ where: { userId } });
        if (!institute) throw new Error("لم يتم العثور على المعهد");

        const enrollment = await prisma.enrollment.findFirst({
            where: {
                id: enrollmentId,
                course: { instituteId: institute.id, trainerId: null },
                deletedAt: null,
            },
            include: {
                payments: true,
                course: true,
                student: { select: { id: true, name: true, email: true, phone: true } },
            },
        });

        if (!enrollment) {
            throw new Error('التسجيل غير موجود أو لا تنتمي لدورات المعهد');
        }

        // ── Reject Payment ────────────────────────────────────────────────────────
        if (status === 'REJECT_PAYMENT') {
            const latestPayment = enrollment.payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
            if (!latestPayment || latestPayment.status !== 'PENDING_REVIEW') {
                throw new Error('لا يوجد دفعة معلقة للمراجعة');
            }

            await prisma.payment.update({
                where: { id: latestPayment.id },
                data: {
                    status: 'REJECTED',
                    reviewedBy: userId,
                    reviewedAt: new Date(),
                    rejectionReason: reason || 'تم ا�„رفض من قبل المعهد',
                },
            });

            // Notify student about payment rejection
            await notificationService.createNotification({
                userId: enrollment.student.id,
                type: 'PAYMENT_REJECTED',
                title: 'تم رفض سند ا�„دفع',
                message: `تم رفض سند ا�„دفع الخاص بك ف�Š دورة "${enrollment.course.title}".${reason ? ` السبب: ${reason}` : ''}`,
                actionUrl: `/student/courses/${enrollment.courseId}`,
                relatedEntityId: enrollmentId,
                emailFn: enrollment.student.email
                    ? () => mailerService.sendPaymentRejected(enrollment.student.email!, enrollment.student.name, enrollment.course.title, reason)
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
                    rejectedById: userId,
                } as any,
            });

            await notificationService.createNotification({
                userId: enrollment.student.id,
                type: 'ENROLLMENT_REJECTED',
                title: 'تم رفض طلب التسجيل',
                message: `تم رفض طلب تسجيلك ف�Š دورة "${enrollment.course.title}". السبب: ${String(reason).trim()}. يمكنك تعديل بياناتك ثم إرسال طلب تسجيل جديد.`,
                actionUrl: `/student/courses/${enrollment.courseId}`,
                relatedEntityId: enrollmentId,
            });

            return updated;
        }

        // ── Cancel Enrollment ─────────────────────────────────────────────────────
        if (status === 'CANCELLED') {
            await prisma.$transaction(async (tx) => {
                await tx.payment.deleteMany({ where: { enrollmentId } });
                await tx.enrollment.update({
                    where: { id: enrollmentId },
                    data: { status: 'CANCELLED', cancellationReason: reason },
                });
            });

            // Notify student about rejection/cancellation
            const isCancellation = enrollment.status === 'ACTIVE' || enrollment.status === 'COMPLETED';
            const title = isCancellation ? 'تم إلغاء تسجيلك' : 'تم رفض طلب التسجيل';
            const messageAction = isCancellation ? 'تم إلغاء تسجيلك ف�Š دورة' : 'تم رفض طلب تسجيلك ف�Š دورة';
            const message = `${messageAction} "${enrollment.course.title}".${reason ? ` السبب: ${reason}` : ''}`;

            await notificationService.createNotification({
                userId: enrollment.student.id,
                type: 'ENROLLMENT_REJECTED',
                title: title,
                message: message,
                actionUrl: `/student/courses/${enrollment.courseId}`,
                relatedEntityId: enrollmentId,
                emailFn: enrollment.student.email ? () => mailerService.sendEnrollmentRejected(enrollment.student.email!, enrollment.student.name, enrollment.course.title, reason, isCancellation) : undefined,
                whaFn: enrollment.student.phone ? () => whatsAppService.notifyEnrollmentRejected(enrollment.student.phone!, enrollment.student.name, enrollment.course.title, reason, isCancellation) : undefined,
            });

            return { message: 'تم إلغاء التسجيل بنجاح' };
        }

        // ── Accept Preliminary → determine next status ────────────────────────────
        return prisma.$transaction(async (tx) => {
            const isPendingMinimumCourse = enrollment.course.status === 'PENDING_MINIMUM';
            const price = Number(enrollment.course.price);

            let targetStatus: EnrollmentStatus;

            if (enrollment.status === 'PRELIMINARY') {
                if (isPendingMinimumCourse) {
                    // Transition to PRELIMINARY_APPROVED � student waits for minimum threshold + owner setup
                    targetStatus = 'PRELIMINARY_APPROVED';
                } else if (price > 0) {
                    targetStatus = 'PENDING_PAYMENT';
                } else {
                    targetStatus = 'ACTIVE';
                }
            } else if (status === 'ACTIVE' && enrollment.payments.length > 0) {
                // Owner is approving the payment receipt
                targetStatus = 'ACTIVE';
            } else {
                targetStatus = status as EnrollmentStatus;
            }

            const updatePayload: any = { status: targetStatus };
            if (reason) updatePayload.cancellationReason = reason;

            const updatedEnrollment = await tx.enrollment.update({
                where: { id: enrollmentId },
                data: updatePayload,
            });

            // If payment is being approved simultaneously, mark latest payment as APPROVED
            if (targetStatus === 'ACTIVE' && enrollment.payments.length > 0) {
                const latestPayment = enrollment.payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
                if (latestPayment?.status === 'PENDING_REVIEW') {
                    await tx.payment.update({
                        where: { id: latestPayment.id },
                        data: { status: 'APPROVED', reviewedBy: userId, reviewedAt: new Date(), notes: 'تم القبول من قبل المعهد' },
                    });
                }
            }

            // ── Post-transaction notifications ────────────────────────────────────
            // (run after commit to avoid notification on rolled-back transactions)
            setImmediate(async () => {
                try {
                    if (isPendingMinimumCourse && targetStatus === 'PRELIMINARY_APPROVED') {
                        // Notify student: accepted but waiting for minimum threshold
                        const courseUrl = `${FRONTEND_URL}/student/courses/${enrollment.courseId}`;
                        await notificationService.createNotification({
                            userId: enrollment.student.id,
                            type: 'PRELIMINARY_ACCEPTED_WAITING',
                            title: 'تم قبول تسجيلك المبدئي ✓',
                            message: `�‚ُب�„ طلبك ف�Š دورة "${enrollment.course.title}". الدورة بانتظار اكتمال الحد الأدنى من الطلاب (${enrollment.course.minStudents}). سيتم إشعارك عند جاهزية الدورة.`,
                            actionUrl: `/student/courses/${enrollment.courseId}`,
                            relatedEntityId: enrollmentId,
                            emailFn: enrollment.student.email
                                ? () => mailerService.sendPreliminaryAcceptedWaitingEmail(
                                    enrollment.student.email!,
                                    enrollment.student.name,
                                    enrollment.course.title,
                                    enrollment.course.minStudents,
                                    courseUrl,
                                )
                                : undefined,
                        });

                        // Check if minimum threshold has now been reached
                        await this.checkAndTriggerMinimumThreshold(enrollment.courseId);

                    } else if (targetStatus === 'PENDING_PAYMENT') {
                        // Normal course: accepted and payment required
                        await notificationService.createNotification({
                            userId: enrollment.student.id,
                            type: 'ENROLLMENT_PRELIMINARY_ACCEPTED',
                            title: 'تم قبول طلبك المبدئي',
                            message: `تم قبول تسجيلك ف�Š دورة "${enrollment.course.title}". يرجى إكمال عملية ا�„دفع.`,
                            actionUrl: `/student/courses/${enrollment.courseId}`,
                            relatedEntityId: enrollmentId,
                            emailFn: enrollment.student.email
                                ? () => mailerService.sendEnrollmentPreliminaryAccepted(
                                    enrollment.student.email!,
                                    enrollment.student.name,
                                    enrollment.course.title,
                                )
                                : undefined,
                        });

                    } else if (targetStatus === 'ACTIVE') {
                        // Payment approved → full access
                        await notificationService.createNotification({
                            userId: enrollment.student.id,
                            type: 'PAYMENT_APPROVED',
                            title: 'تم قبول ا�„دفع ✓',
                            message: `تم التحقق من دفعت�ƒ لدورة "${enrollment.course.title}" �ˆا�„�…�ˆاف�‚ة عليها. تسجيلك مكتمل الآن.`,
                            actionUrl: `/student/courses/${enrollment.courseId}`,
                            relatedEntityId: enrollmentId,
                            emailFn: enrollment.student.email
                                ? () => mailerService.sendPaymentApproved(
                                    enrollment.student.email!,
                                    enrollment.student.name,
                                    enrollment.course.title,
                                )
                                : undefined,
                        });
                    }
                } catch (notifErr) {
                    console.error('[InstituteService] updateEnrollmentStatus notification error:', notifErr);
                }
            });


            auditService.logAction({
                action: 'UPDATE',
                entityName: 'Enrollment',
                entityId: 'system_log', // Default if ID is complex to resolve
                description: 'تحديث حالة تسجيل طالب',
                performedBy: userId
            }).catch(e => console.error(e));

            return updatedEnrollment;
        });
    }

    /**
     * Get all public approved institutes
     */
    async getPublicInstitutes() {
        const institutes = await prisma.institute.findMany({
            where: {
                verificationStatus: 'APPROVED',
                deletedAt: null
            },
            select: {
                id: true,
                name: true,
                description: true,
                logo: true,
                address: true,
                courses: {
                    where: { status: 'ACTIVE' },
                    select: {
                        categoryId: true,
                        category: { select: { name: true } },
                        enrollments: { select: { id: true } }
                    }
                },
                _count: {
                    select: {
                        courses: { where: { status: 'ACTIVE' } },
                        staff: { where: { status: 'ACTIVE' } }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return institutes.map(inst => {
            const categories = Array.from(new Set(inst.courses.map(c => c.category?.name).filter(Boolean)));
            const studentsCount = inst.courses.reduce((acc, course) => acc + course.enrollments.length, 0);

            return {
                id: inst.id,
                name: inst.name,
                description: inst.description || '',
                logo: inst.logo,
                location: inst.address || 'غير محدد',
                rating: 5.0, // Default rating for now
                studentsCount,
                coursesCount: inst._count.courses,
                staffCount: inst._count.staff,
                categories,
                coverImage: `https://placehold.co/600x200/2563eb/ffffff?text=${encodeURIComponent(inst.name)}`
            };
        });
    }

    /**
     * Get a single public approved institute by ID
     */
    async getPublicInstituteById(id: string) {
        const institute = await prisma.institute.findFirst({
            where: {
                id,
                verificationStatus: 'APPROVED',
                deletedAt: null
            },
            select: {
                id: true,
                name: true,
                description: true,
                logo: true,
                address: true,
                email: true,
                phone: true,
                website: true,
                locationUrl: true,
                features: true,
                courses: {
                    where: { status: 'ACTIVE' },
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        image: true,
                        categoryId: true,
                        category: { select: { name: true } },
                        enrollments: { select: { id: true } }
                    }
                },
                staff: {
                    where: { status: 'ACTIVE' },
                    select: {
                        id: true,
                        name: true,
                        specialties: true,
                        instituteId: true,
                        avatar: true
                    }
                },
                _count: {
                    select: {
                        courses: { where: { status: 'ACTIVE' } },
                        staff: { where: { status: 'ACTIVE' } }
                    }
                }
            }
        });

        if (!institute) {
            throw new Error('المعهد غير موجود أو غير مصرح له');
        }

        const studentsCount = institute.courses.reduce((acc, course) => acc + course.enrollments.length, 0);

        // Fetch user avatars for staff if applicable. 
        // This is a bit complex in SQL because staff is a separate model without user relation directly in staff (it's often text).
        // For simplicity, we just map what we have.

        return {
            id: institute.id,
            name: institute.name,
            description: institute.description || '',
            logo: institute.logo,
            email: institute.email,
            phone: institute.phone,
            website: institute.website,
            locationUrl: institute.locationUrl,
            location: institute.address || 'غير محدد',
            rating: 5.0, // Default rating for now
            reviewCount: 0, // Mock for now
            studentsCount,
            coursesCount: institute._count.courses,
            staffCount: institute._count.staff,
            courses: institute.courses.map(c => ({
                id: c.id,
                title: c.title,
                price: Number(c.price),
                image: c.image,
                category: c.category?.name || 'عام',
                students: c.enrollments.length,
                rating: 5.0 // Mock string
            })),
            trainers: institute.staff.map(s => ({
                id: s.id,
                name: s.name,
                role: s.specialties[0] || 'مدرب',
                avatar: s.avatar
            })),
            features: institute.features || [],
            coverImage: `https://placehold.co/1200x300/2563eb/ffffff?text=${encodeURIComponent(institute.name)}`
        };
    }
}

export default new InstituteService();

