/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */
import prisma from '../config/database';
import notificationService from './notification.service';
import { mailerService } from './mailer.service';
import { whatsAppService } from './whatsapp.service';
import { auditService } from "./audit.service";

class StudentService {
    /**
     * Get dashboard data for the student
     */
    async getDashboard(userId: string) {
        // 1. Get user with profile details
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, avatar: true },
        });

        if (!user) throw new Error("المستخدم غير موجود");

        // 2. Get active enrollments for the student
        const enrollments = await prisma.enrollment.findMany({
            where: {
                studentId: userId,
                status: { in: ['ACTIVE', 'COMPLETED'] },
                deletedAt: null
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        shortDescription: true,
                        image: true,
                        category: { select: { name: true } },
                        trainer: { select: { id: true, name: true, avatar: true } },
                        staffTrainerIds: true
                    }
                }
            },
            take: 4, // Show up to 4 current courses
            orderBy: { enrolledAt: 'desc' }
        });

        const allStaffIds = Array.from(new Set(
            enrollments.flatMap(e => (e.course.staffTrainerIds as string[]) || [])
        ));

        const staffDetailsMap = new Map<string, { name: string, avatar: string | null }>();
        if (allStaffIds.length > 0) {
            const staff = await prisma.instituteStaff.findMany({
                where: { id: { in: allStaffIds } },
                select: { id: true, name: true, avatar: true }
            });
            staff.forEach(s => staffDetailsMap.set(s.id, { name: s.name, avatar: s.avatar }));
        }

        const currentCourses = enrollments.map((e: any) => {
            const staffIds = (e.course.staffTrainerIds as string[]) || [];

            const trainersList = staffIds.length > 0
                ? staffIds.map((id: string) => {
                    const details = staffDetailsMap.get(id);
                    return {
                        id,
                        name: details?.name || 'مدرب المعهد',
                        avatar: details?.avatar || null
                    }
                })
                : [{
                    id: e.course.trainer?.id || 'unknown',
                    name: e.course.trainer?.name || 'مدرب',
                    avatar: e.course.trainer?.avatar || null
                }];

            return {
                id: e.course.id,
                title: e.course.title,
                shortDescription: e.course.shortDescription || '',
                trainer: trainersList.map(t => t.name).join('، '),
                trainers: trainersList,
                image: e.course.image,
                category: e.course.category?.name || 'عام',
            };
        });

        // 3. Get recent notifications
        const recentNotificationsRaw = await prisma.notification.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        const recentNotifications = recentNotificationsRaw.map(n => {
            let title = 'إشعار جديد';
            let message = 'لديك إشعار جديد في المنصة';
            let type = 'info';

            switch (n.type) {
                case 'COURSE_ENROLLMENT':
                    title = 'تسجيل ناجح';
                    message = 'تم تسجيلك بنجاح في الدورة';
                    type = 'success';
                    break;
                case 'PAYMENT_APPROVED':
                    title = 'تم قبول الدفع';
                    message = 'تم تأكيد الدفعة بنجاح';
                    type = 'success';
                    break;
                case 'PAYMENT_REJECTED':
                    title = 'تم رفض الدفع';
                    message = 'يرجى مراجعة إيصال الدفع والمحاولة مرة أخرى';
                    type = 'warning';
                    break;
                case 'SESSION_REMINDER':
                    title = 'تذكير بالدرس';
                    message = 'لديك درس قريب، يرجى الاستعداد';
                    type = 'reminder';
                    break;
                case 'ENROLLMENT_REJECTED':
                    title = 'تم رفض طلب التسجيل';
                    message = 'تم رفض طلب تسجيلك في الدورة';
                    type = 'warning';
                    break;
                case 'PRELIMINARY_ACCEPTED_WAITING':
                    title = 'تم قبولك مبدئياً';
                    message = 'الدورة بانتظار اكتمال العدد، سيتم إشعارك عند الجاهزية';
                    type = 'info';
                    break;
                case 'COURSE_READY_FOR_PAYMENT':
                    title = 'الدورة جاهزة! أكمل الدفع';
                    message = 'اكتملت إعدادات الدورة، يرجى إكمال عملية الدفع';
                    type = 'success';
                    break;
                case 'NEW_ANNOUNCEMENT':
                    title = 'إعلان جديد';
                    message = 'تم نشر إعلان جديد في إحدى دوراتك';
                    type = 'material';
                    break;
            }

            return {
                id: n.id,
                title,
                message,
                time: n.createdAt,
                type,
                isRead: n.isRead,
                actionUrl: n.actionUrl
            };
        });

        // 4. Get wishlisted course IDs
        const wishlists = await prisma.wishlist.findMany({
            where: { studentId: userId },
            select: { courseId: true }
        });

        const favoriteIds = wishlists.map(w => w.courseId);

        // 5. Get some stats
        const activeCoursesCount = await prisma.enrollment.count({
            where: {
                studentId: userId,
                status: 'ACTIVE',
                deletedAt: null
            }
        });

        const completedCoursesCount = await prisma.enrollment.count({
            where: {
                studentId: userId,
                status: 'COMPLETED',
                deletedAt: null
            }
        });

        return {
            user,
            currentCourses,
            recentNotifications,
            favoriteIds,
            stats: {
                activeCourses: activeCoursesCount,
                completedCourses: completedCoursesCount
            }
        };
    }

    async getMyCourses(userId: string) {
        const now = new Date();
        const enrollments = await prisma.enrollment.findMany({
            where: {
                studentId: userId,
                deletedAt: null
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        shortDescription: true,
                        description: true,
                        image: true,
                        category: { select: { name: true } },
                        trainer: { select: { id: true, name: true, avatar: true } },
                        staffTrainerIds: true,
                        startDate: true,
                        endDate: true,
                        price: true,
                        sessions: {
                            where: {
                                status: 'SCHEDULED',
                                startTime: { gte: now }
                            },
                            orderBy: {
                                startTime: 'asc'
                            },
                            take: 1,
                            include: {
                                room: { select: { id: true, name: true, locationUrl: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { enrolledAt: 'desc' }
        });

        // Collect all staff trainer IDs to fetch their names in bulk
        const allStaffIds = Array.from(new Set(
            enrollments.flatMap(e => (e.course.staffTrainerIds as string[]) || [])
        ));

        const staffDetailsMap = new Map<string, { name: string, avatar: string | null }>();
        if (allStaffIds.length > 0) {
            const staff = await prisma.instituteStaff.findMany({
                where: { id: { in: allStaffIds } },
                select: { id: true, name: true, avatar: true }
            });
            staff.forEach(s => staffDetailsMap.set(s.id, { name: s.name, avatar: s.avatar }));
        }

        return enrollments.map((e: any) => {
            const staffIds = (e.course.staffTrainerIds as string[]) || [];

            // Detailed trainers list for flexible UI rendering
            const trainersList = staffIds.length > 0
                ? staffIds.map(id => {
                    const details = staffDetailsMap.get(id);
                    return {
                        id,
                        name: details?.name || 'مدرب المعهد',
                        avatar: details?.avatar || null
                    }
                })
                : [{
                    id: e.course.trainer?.id || 'unknown',
                    name: e.course.trainer?.name || 'مدرب',
                    avatar: e.course.trainer?.avatar || null
                }];

            const trainerName = trainersList.map(t => t.name).join('، ');

            return {
                id: e.id,
                status: e.status,
                rejectionReason: (e as any).rejectionReason || null,
                progress: 0,
                enrolledAt: e.enrolledAt,
                course: {
                    id: e.course.id,
                    title: e.course.title,
                    shortDescription: e.course.shortDescription || '',
                    description: e.course.description || '',
                    trainer: {
                        id: trainersList[0].id,
                        name: trainerName,
                        avatar: trainersList[0].avatar
                    },
                    trainers: trainersList, // New array for advanced UI
                    image: e.course.image,
                    category: e.course.category?.name || 'عام',
                    startDate: e.course.startDate,
                    endDate: e.course.endDate,
                    price: e.course.price,
                    roomId: (e.course.sessions[0] as any)?.room?.id ?? null,
                    roomName: (e.course.sessions[0] as any)?.room?.name ?? null
                },
                nextSession: e.course.sessions[0] ? {
                    id: e.course.sessions[0].id,
                    topic: e.course.sessions[0].topic,
                    startTime: e.course.sessions[0].startTime,
                    endTime: e.course.sessions[0].endTime,
                    type: e.course.sessions[0].type
                } : null
            };
        });
    }

    /**
     * Get the student's enrollment status for a specific course
     */
    async getEnrollmentStatus(userId: string, courseId: string) {
        const enrollment = await prisma.enrollment.findUnique({
            where: {
                studentId_courseId: {
                    studentId: userId,
                    courseId: courseId
                }
            },
            include: {
                payments: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1
                }
            }
        });

        if (!enrollment || enrollment.deletedAt || enrollment.status === 'CANCELLED') {
            return { status: 'NONE', id: enrollment?.id };
        }

        // Map database status to frontend expected status
        let status = 'NONE';
        if (enrollment.status === 'PRELIMINARY') {
            status = 'PENDING_APPROVAL';
        } else if (enrollment.status === 'PRELIMINARY_APPROVED') {
            status = 'PRELIMINARY_APPROVED';
        } else if (enrollment.status === 'PENDING_PAYMENT') {
            // Check if there is a payment under review
            const latestPayment = enrollment.payments[0];
            if (latestPayment && latestPayment.status === 'PENDING_REVIEW') {
                status = 'PAYMENT_CONFIRMED'; // Meaning they submitted the receipt, waiting for trainer
            } else if (latestPayment && latestPayment.status === 'REJECTED') {
                status = 'PAYMENT_REJECTED';
            } else {
                status = 'APPROVED'; // Wait for payment upload
            }
        } else if ((enrollment.status as any) === 'REJECTED') {
            status = 'ENROLLMENT_REJECTED';
        } else if (enrollment.status === 'ACTIVE' || enrollment.status === 'COMPLETED') {
            status = 'ENROLLED';
        }

        return { status, id: enrollment.id, rejectionReason: (enrollment as any).rejectionReason || null };
    }

    /**
     * Get certificate data for an enrollment
     */
    async getEnrollmentCertificateData(userId: string, enrollmentId: string) {
        const enrollment = await prisma.enrollment.findUnique({
            where: { id: enrollmentId },
            include: {
                student: true,
                course: {
                    include: {
                        trainer: true,
                        institute: true
                    }
                }
            }
        });

        if (!enrollment || enrollment.studentId !== userId || (enrollment.status !== 'ACTIVE' && enrollment.status !== 'COMPLETED')) {
            throw new Error('التسجيل غير موجود أو غير مؤهل لإصدار شهادة');
        }

        const course = enrollment.course;

        let trainerName = course.trainer?.name;

        // Handle institute staff trainers
        const staffTrainerIds = (course as any).staffTrainerIds as string[] | undefined;
        if (staffTrainerIds && staffTrainerIds.length > 0) {
            const staffTrainers = await prisma.instituteStaff.findMany({
                where: { id: { in: staffTrainerIds } },
                select: { name: true }
            });
            if (staffTrainers.length > 0) {
                trainerName = staffTrainers.map(t => t.name).join(' و ');
            }
        }

        if (!trainerName) {
            trainerName = 'غير محدد';
        }

        const instituteName = course.institute?.name;

        // Return standard data package
        return {
            studentName: enrollment.student.name,
            courseTitle: course.title,
            duration: course.duration,
            startDate: course.startDate,
            endDate: course.endDate,
            trainerName,
            instituteName,
            enrolledAt: enrollment.enrolledAt,
            issueDate: new Date()
        };
    }


    /**
     * Pre-register a student to a course (initial application)
     */
    async preRegisterCourse(userId: string, courseId: string, fullName: string, email: string, phone: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error("المستخدم غير موجود");

        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) throw new Error("الدورة غير موجودة");

        if (course.trainerId === userId) {
            throw new Error("لا يمكنك التسجيل في دورة تملكها");
        }

        // Check if already enrolled
        const existingEnrollment = await prisma.enrollment.findUnique({
            where: {
                studentId_courseId: {
                    studentId: userId,
                    courseId: courseId
                }
            }
        });

        if (
            existingEnrollment &&
            !existingEnrollment.deletedAt &&
            existingEnrollment.status !== 'CANCELLED' &&
            (existingEnrollment.status as any) !== 'REJECTED'
        ) {
            throw new Error("أنت مسجل بالفعل في هذه الدورة");
        }

        // Optionally update the user's profile info if provided
        if (fullName || phone) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    name: fullName || user.name,
                    phone: phone || user.phone
                }
            });
        }

        // If re-enrolling, clear old payments to start fresh
        if (existingEnrollment) {
            await prisma.payment.deleteMany({
                where: { enrollmentId: existingEnrollment.id }
            });
        }

        // Upsert the enrollment
        const enrollment = await prisma.enrollment.upsert({
            where: {
                studentId_courseId: {
                    studentId: userId,
                    courseId: courseId
                }
            },
            update: {
                status: 'PRELIMINARY',
                deletedAt: null,
                cancellationReason: null,
                rejectionReason: null,
                rejectedAt: null,
                rejectedById: null
            } as any,
            create: {
                studentId: userId,
                courseId: courseId,
                status: 'PRELIMINARY'
            }
        });

        // Notify trainer/institute with full title and message
        if (course.trainerId) {
            const trainer = await prisma.user.findUnique({ where: { id: course.trainerId }, select: { name: true, email: true, phone: true } });
            await notificationService.createNotification({
                userId: course.trainerId,
                type: 'COURSE_ENROLLMENT',
                title: 'طلب تسجيل جديد',
                message: `طلب الطالب ${user.name} التسجيل في دورتك "${course.title}"`,
                relatedEntityId: enrollment.id,
                actionUrl: '/trainer/students',
                emailFn: trainer?.email ? () => mailerService.sendNewEnrollmentRequest(trainer.email!, trainer!.name, user.name, course.title) : undefined,
                whaFn: trainer?.phone ? () => whatsAppService.notifyNewEnrollmentRequest(trainer.phone!, trainer!.name, user.name, course.title) : undefined,
            });
        }

        // If course belongs to an institute (trainerId is null), notify the institute admin
        if (!course.trainerId && course.instituteId) {
            const institute = await prisma.institute.findUnique({ where: { id: course.instituteId }, include: { user: { select: { id: true, name: true, email: true, phone: true } } } });
            if (institute) {
                await notificationService.createNotification({
                    userId: institute.userId,
                    type: 'COURSE_ENROLLMENT',
                    title: 'طلب تسجيل جديد',
                    message: `طلب الطالب ${user.name} التسجيل في دورة "${course.title}"`,
                    relatedEntityId: enrollment.id,
                    actionUrl: '/institute/students',
                    emailFn: institute.user.email ? () => mailerService.sendNewEnrollmentRequest(institute.user.email, institute.user.name, user.name, course.title) : undefined,
                    whaFn: institute.user.phone ? () => whatsAppService.notifyNewEnrollmentRequest(institute.user.phone!, institute.user.name, user.name, course.title) : undefined,
                });
            }
        }

        
                auditService.logAction({
                    action: 'CREATE',
                    entityName: 'Enrollment',
                    entityId: 'system_log',
                    description: 'التسجيل المبدئي في دورة',
                    performedBy: userId
                }).catch(e => console.error(e));

        return {
                    status: 'PENDING_APPROVAL',
                    enrollmentId: enrollment.id
                };
    }

    /**
     * Submit payment proof (receipt image) for an enrollment
     */
    async submitPaymentProof(userId: string, courseId: string, imagePath: string) {
        // Verify enrollment exists and is in correct state
        const enrollment = await prisma.enrollment.findUnique({
            where: {
                studentId_courseId: {
                    studentId: userId,
                    courseId: courseId
                }
            },
            include: { course: true }
        });

        if (!enrollment || enrollment.deletedAt) {
            throw new Error("لا يوجد تسجيل مسبق في هذه الدورة");
        }

        // Only allow upload if status allows
        if (enrollment.status !== 'PENDING_PAYMENT') {
            throw new Error("حالة التسجيل لا تسمح بإرفاق سند دفع حالياً");
        }

        // Create the payment record
        await prisma.payment.create({
            data: {
                amount: enrollment.course.price,
                currency: "YER", // Default or fetch from course context
                depositSlipImage: imagePath,
                status: 'PENDING_REVIEW',
                enrollmentId: enrollment.id
            }
        });

        // Notify trainer/institute about the new payment receipt
        const trainerOrInstituteId = enrollment.course.trainerId;
        const instituteId = (enrollment.course as any).instituteId;

        if (trainerOrInstituteId) {
            const trainer = await prisma.user.findUnique({ where: { id: trainerOrInstituteId }, select: { name: true, email: true, phone: true } });
            const studentUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
            if (trainer && studentUser) {
                await notificationService.createNotification({
                    userId: trainerOrInstituteId,
                    type: 'PAYMENT_RECEIPT_SUBMITTED',
                    title: 'إيصال دفع جديد',
                    message: `أرفق الطالب ${studentUser.name} إيصال دفع لدورة "${enrollment.course.title}"`,
                    relatedEntityId: enrollment.id,
                    actionUrl: '/trainer/students',
                    emailFn: trainer.email ? () => mailerService.sendPaymentReceiptSubmitted(trainer.email!, trainer!.name, studentUser.name, enrollment.course.title) : undefined,
                    whaFn: trainer.phone ? () => whatsAppService.notifyPaymentReceiptSubmitted(trainer.phone!, trainer!.name, studentUser.name, enrollment.course.title) : undefined,
                });
            }
        } else if (instituteId) {
            const institute = await prisma.institute.findUnique({ where: { id: instituteId }, include: { user: { select: { id: true, name: true, email: true, phone: true } } } });
            const studentUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
            if (institute && studentUser) {
                await notificationService.createNotification({
                    userId: institute.userId,
                    type: 'PAYMENT_RECEIPT_SUBMITTED',
                    title: 'إيصال دفع جديد',
                    message: `أرفق الطالب ${studentUser.name} إيصال دفع لدورة "${enrollment.course.title}"`,
                    relatedEntityId: enrollment.id,
                    actionUrl: '/institute/students',
                    emailFn: institute.user.email ? () => mailerService.sendPaymentReceiptSubmitted(institute.user.email, institute.user.name, studentUser.name, enrollment.course.title) : undefined,
                    whaFn: institute.user.phone ? () => whatsAppService.notifyPaymentReceiptSubmitted(institute.user.phone!, institute.user.name, studentUser.name, enrollment.course.title) : undefined,
                });
            }
        }

        
                auditService.logAction({
                    action: 'CREATE',
                    entityName: 'Payment',
                    entityId: 'system_log',
                    description: 'رفع إيصال دفع لدورة',
                    performedBy: userId
                }).catch(e => console.error(e));

        return {
                    status: 'PAYMENT_CONFIRMED'
                };
    }

    /**
     * Get detailed information for a specific course for the student
     */
    async getCourseDetails(userId: string, courseId: string) {
        // 1. Verify enrollment and access
        const enrollment = await prisma.enrollment.findUnique({
            where: {
                studentId_courseId: {
                    studentId: userId,
                    courseId: courseId
                }
            },
            include: {
                course: {
                    include: {
                        trainer: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true,
                                email: true,
                                phone: true,
                                trainerProfile: {
                                    select: { bio: true, specialties: true }
                                }
                            }
                        },
                        category: true,
                        sessions: {
                            orderBy: { startTime: 'asc' },
                            include: { room: { include: { institute: true } } }
                        },
                        roomBookings: {
                            include: { room: { include: { institute: true } } },
                            take: 1
                        },
                        // announcements are fetched separately below with proper OR filtering
                        institute: {
                            select: {
                                name: true,
                                logo: true,
                                email: true,
                                phone: true,
                                address: true,
                                description: true,
                                locationUrl: true,
                                features: true
                            }
                        }
                    }
                },
                payments: {
                    where: { status: 'PENDING_REVIEW' },
                    select: { id: true },
                    take: 1
                }
            }
        });

        if (!enrollment || enrollment.deletedAt) {
            throw new Error("لم يتم العثور على التسجيل أو لا تملك صلاحية الوصول");
        }

        const course = enrollment.course;
        const now = new Date();

        // Find next upcoming session
        const nextSession = course.sessions.find(s =>
            s.status === 'SCHEDULED' && s.startTime >= now
        );

        // Derive delivery type and platform
        const primarySession = course.sessions[0];
        const deliveryType = ['FLEXIBLE', 'CAPACITY_BASED'].includes((course as any).bookingTrigger) ? 'يعتمد على المعهد لاحقاً'
            : primarySession?.type === 'ONLINE' ? 'أونلاين'
            : primarySession?.type === 'IN_PERSON' ? 'حضوري'
                : course.sessions.length > 0 ? 'هجين' : 'أونلاين';

        const onlinePlatform = primarySession?.type === 'ONLINE'
            ? (primarySession.meetingLink?.includes('zoom') ? 'Zoom' : primarySession.meetingLink?.includes('meet.google') ? 'Google Meet' : 'أونلاين')
            : (primarySession?.room?.name || primarySession?.location || 'غير متوفر');

        const roomLocationUrl = (course as any).roomBookings?.[0]?.room?.locationUrl || primarySession?.room?.locationUrl || null;

        // Fetch staff trainers if staffTrainerIds is set
        const staffTrainerIds = (course as any).staffTrainerIds as string[] | undefined;
        let staffTrainers: any[] = [];
        if (staffTrainerIds && staffTrainerIds.length > 0) {
            staffTrainers = await prisma.instituteStaff.findMany({
                where: { id: { in: staffTrainerIds }, status: 'ACTIVE' },
                select: { id: true, name: true, bio: true, avatar: true, email: true, phone: true, specialties: true }
            });
        }

        // Fetch announcements for this course that are relevant to this student:
        // 1. General course announcements (no specific recipient)
        // 2. Announcements targeted specifically to this student (recipientId)
        // 3. Announcements where this student is in the recipientIds array
        // All must be tied to this specific courseId (admin-wide announcements without courseId are excluded)
        const announcements = await (prisma.announcement as any).findMany({
            where: {
                status: 'SENT',
                courseId: courseId,
                OR: [
                    // Case 1: General course announcement (no specific recipient)
                    { recipientId: null, recipientIds: { isEmpty: true } },
                    // Case 2: Targeted to this student via recipientId
                    { recipientId: userId },
                    // Case 3: This student is in the recipientIds list
                    { recipientIds: { has: userId } },
                ]
            },
            orderBy: { createdAt: 'desc' }
        });

        const resolvedInstitute = (course as any).institute || (course as any).roomBookings?.[0]?.room?.institute || primarySession?.room?.institute || null;

        return {
            id: course.id,
            title: course.title,
            category: course.category?.name || 'عام',
            shortDescription: course.shortDescription || '',
            description: course.description || '',
            image: course.image,
            courseStatus: course.status,           // حالة الدورة (لمنطق PENDING_MINIMUM)
            minStudents: course.minStudents,        // الحد الأدنى من الطلاب
            bookingTrigger: (course as any).bookingTrigger,
            hallId: (course as any).roomBookings?.[0]?.roomId || primarySession?.roomId || null,
            locationName: (course as any).roomBookings?.[0]?.room?.name || primarySession?.room?.name || primarySession?.location || null,
            locationUrl: roomLocationUrl,
            room: primarySession?.room ? {
                id: primarySession.room.id,
                name: primarySession.room.name,
                location: primarySession.room.location,
                locationUrl: primarySession.room.locationUrl ?? null,
            } : null,
            deliveryType,
            onlinePlatform,
            enrollmentStatus: enrollment.status,
            hasPaymentUnderReview: (enrollment as any).payments?.length > 0,
            nextSession: nextSession ? {
                id: nextSession.id,
                topic: nextSession.topic,
                startTime: nextSession.startTime,
                endTime: nextSession.endTime,
                type: nextSession.type,
                meetingLink: nextSession.meetingLink
            } : null,
            instructor: (course as any).staffTrainerIds?.length > 0 ? {
                id: staffTrainers[0]?.id,
                name: staffTrainers[0]?.name || 'مدرب المعهد',
                role: 'مدرب معهد',
                avatar: staffTrainers[0]?.avatar || null,
                email: staffTrainers[0]?.email,
                phone: staffTrainers[0]?.phone,
                bio: staffTrainers[0]?.bio,
                specialties: staffTrainers[0]?.specialties || []
            } : {
                id: course.trainer?.id,
                name: course.trainer?.name || 'مدرب',
                role: 'مدرب الدورة',
                avatar: course.trainer?.avatar,
                email: course.trainer?.email,
                phone: course.trainer?.phone,
                bio: (course.trainer as any)?.trainerProfile?.bio || null,
                specialties: (course.trainer as any)?.trainerProfile?.specialties || []
            },
            staffTrainers,
            institute: resolvedInstitute ? {
                id: resolvedInstitute.id,
                name: resolvedInstitute.name,
                logo: resolvedInstitute.logo,
                email: resolvedInstitute.email,
                phone: resolvedInstitute.phone,
                address: resolvedInstitute.address,
                locationUrl: resolvedInstitute.locationUrl,
                description: resolvedInstitute.description,
                features: resolvedInstitute.features ?? [],
            } : null,
            sessions: course.sessions.map(s => ({
                id: s.id,
                topic: s.topic,
                startTime: s.startTime,
                endTime: s.endTime,
                status: s.status,
                type: s.type,
                meetingLink: s.meetingLink,
                roomId: s.roomId,
                location: s.location,
                room: s.room ? {
                    id: s.room.id,
                    name: s.room.name,
                    location: s.room.location,
                    locationUrl: (s.room as any).locationUrl ?? null,
                } : null,
            })),
            announcements: announcements.map((a: any) => ({
                id: a.id,
                title: a.title,
                content: a.message,
                createdAt: a.createdAt,
                publishedAt: a.createdAt
            })),
            startDate: course.startDate,
            endDate: course.endDate
        };
    }

    /**
     * Get the student's wishlist
     */
    async getWishlist(userId: string) {
        const wishlists = await prisma.wishlist.findMany({
            where: { studentId: userId },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        shortDescription: true,
                        image: true,
                        price: true,
                        category: { select: { name: true } },
                        trainer: { select: { id: true, name: true, avatar: true } },
                        staffTrainerIds: true,
                        bookingTrigger: true,
                        sessions: { select: { id: true, type: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return wishlists.map(w => {
            const course = w.course;
            return {
                id: course.id,
                title: course.title,
                shortDescription: course.shortDescription || '',
                image: course.image,
                price: Number(course.price),
                category: course.category?.name || 'عام',
                trainer: {
                    name: course.trainer?.name || ((course as any).staffTrainerIds?.length > 0 ? 'مدرب معهد' : 'مدرب'),
                },
                type: ['FLEXIBLE', 'CAPACITY_BASED'].includes((course as any).bookingTrigger) ? 'يعتمد على المعهد لاحقاً' 
                    : course.sessions[0]?.type === 'ONLINE' ? 'أونلاين' 
                    : (course.sessions.length > 0 ? 'حضوري' : 'أونلاين')
            };
        });
    }

    /**
     * Remove a course from the student's wishlist
     */
    async removeFromWishlist(userId: string, courseId: string) {
        
                auditService.logAction({
                    action: 'DELETE',
                    entityName: 'Wishlist',
                    entityId: 'system_log',
                    description: 'إزالة دورة من المفضلة',
                    performedBy: userId
                }).catch(e => console.error(e));

        return prisma.wishlist.deleteMany({
                    where: {
                        studentId: userId,
                        courseId: courseId
                    }
                });
    }

    /**
     * Toggle a course in the student's wishlist (add if not exists, remove if exists)
     */
    async toggleWishlist(userId: string, courseId: string) {
        const existing = await prisma.wishlist.findUnique({
            where: {
                studentId_courseId: {
                    studentId: userId,
                    courseId: courseId
                }
            }
        });

        if (existing) {
            await prisma.wishlist.delete({
                where: {
                    studentId_courseId: {
                        studentId: userId,
                        courseId: courseId
                    }
                }
            });
            return { added: false };
        } else {
            await prisma.wishlist.create({
                data: {
                    studentId: userId,
                    courseId: courseId
                }
            });
            
                    auditService.logAction({
                        action: 'UPDATE',
                        entityName: 'Wishlist',
                        entityId: 'system_log', // Default if ID is complex to resolve
                        description: 'تعديل قائمة المفضلة',
                        performedBy: userId
                    }).catch(e => console.error(e));

            return { added: true };
        }
    }

    /**
     * Get details for a specific hall (room)
     */
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
     * Get the student's schedule (all sessions for their courses)
     */
    async getSchedule(userId: string) {
        // 1. Get all active or completed enrollments for the student
        const enrollments = await prisma.enrollment.findMany({
            where: {
                studentId: userId,
                status: { in: ['ACTIVE', 'COMPLETED'] },
                deletedAt: null
            },
            select: { courseId: true }
        });

        const courseIds = enrollments.map(e => e.courseId);

        if (courseIds.length === 0) return [];

        // 2. Get all sessions for these courses
        const sessions = await prisma.session.findMany({
            where: {
                courseId: { in: courseIds },
                status: { not: 'CANCELLED' }
            },
            include: {
                room: { select: { name: true } },
                course: {
                    select: {
                        title: true,
                        trainer: { select: { name: true } },
                        staffTrainerIds: true
                    }
                }
            },
            orderBy: { startTime: 'asc' }
        });

        return sessions.map((s: any) => ({
            id: s.id,
            courseId: s.courseId,
            topic: s.topic || 'جلسة تدريبية',
            courseTitle: s.course?.title || '',
            trainerName: s.course?.trainer?.name || ((s.course as any)?.staffTrainerIds?.length > 0 ? 'مدرب معهد' : 'مدرب'),
            startTime: s.startTime,
            endTime: s.endTime,
            type: s.type.toLowerCase(),
            status: s.status.toLowerCase(),
            meetingLink: s.meetingLink,
            location: s.room?.name || s.location || (s.type === 'ONLINE' ? 'أونلاين' : 'غير محدد'),
            roomId: s.roomId ?? null
        }));
    }

    /**
     * Cancel an enrollment
     */
    async cancelEnrollment(userId: string, enrollmentId: string) {
        // 1. Verify enrollment belongs to the student
        const enrollment = await prisma.enrollment.findFirst({
            where: {
                id: enrollmentId,
                studentId: userId,
                deletedAt: null
            }
        });

        if (!enrollment) {
            throw new Error("التسجيل غير موجود");
        }

        // 2. Check if the current status allows cancellation
        if (enrollment.status === 'CANCELLED') {
            throw new Error("التسجيل ملغى بالفعل");
        }

        if (enrollment.status === 'COMPLETED') {
            throw new Error("لا يمكن إلغاء دورة مكتملة");
        }

        // 3. Update status to CANCELLED
        
                auditService.logAction({
                    action: 'CANCEL',
                    entityName: 'Enrollment',
                    entityId: 'system_log', // Default if ID is complex to resolve
                    description: 'إلغاء التسجيل في دورة',
                    performedBy: userId
                }).catch(e => console.error(e));

        return prisma.enrollment.update({
                    where: { id: enrollmentId },
                    data: { status: 'CANCELLED' }
                });
    }
}

export default new StudentService();

