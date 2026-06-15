/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */
import prisma from '../config/database';
import { hashPassword } from '../utils/password';
import { AuditAction } from '@prisma/client';
import notificationService from './notification.service';
import { mailerService } from './mailer.service';
import { whatsAppService } from './whatsapp.service';
import { auditService } from "./audit.service";

export class AdminService {
    /**
     * Get all pending verifications (trainers and institutes)
     */
    async getPendingVerifications() {
        // Get pending trainers
        const pendingTrainers = await prisma.trainerProfile.findMany({
            where: {
                verificationStatus: 'PENDING',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        createdAt: true,
                    },
                },
            },
        });

        // Get pending institutes
        const pendingInstitutes = await prisma.institute.findMany({
            where: {
                verificationStatus: 'PENDING',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        createdAt: true,
                    },
                },
            },
        });

        return {
            trainers: pendingTrainers,
            institutes: pendingInstitutes,
        };
    }

    /**
     * Approve trainer verification
     */
    async approveTrainer(trainerId: string, adminId: string) {
        const trainerProfile = await prisma.trainerProfile.findUnique({
            where: { id: trainerId },
            include: { user: true },
        });

        if (!trainerProfile) {
            throw new Error('ا�„�…�„ف الشخصي للمدرب غير موجود');
        }

        // Update trainer profile verification status
        await prisma.trainerProfile.update({
            where: { id: trainerId },
            data: {
                verificationStatus: 'APPROVED',
                rejectionReason: null,
            },
        });

        // Update user status to ACTIVE
        await prisma.user.update({
            where: { id: trainerProfile.userId },
            data: {
                status: 'ACTIVE',
            },
        });

        // Log action
        await prisma.auditLog.create({
            data: {
                action: AuditAction.APPROVE,
                entityName: 'TrainerProfile',
                entityId: trainerId,
                description: `Approve trainer: ${trainerProfile.user.name}`,
                performedBy: adminId,
            },
        });

        // Notify trainer
        await notificationService.createNotification({
            userId: trainerProfile.userId,
            type: 'ACCOUNT_APPROVED',
            title: 'تم قبول حسابك كمدرب',
            message: 'تهانينا! تمت مراجعة �…�„ف�ƒ الشخصي �ˆا�„�…�ˆاف�‚ة عليه. يمكنك الآن البدء ف�Š إنشاء دوراتك.',
            actionUrl: '/trainer/dashboard',
            emailFn: trainerProfile.user.email ? () => mailerService.sendAccountApproved(trainerProfile.user.email, trainerProfile.user.name, 'مدرب') : undefined,
            whaFn: trainerProfile.user.phone ? () => whatsAppService.notifyAccountApproved(trainerProfile.user.phone!, trainerProfile.user.name, 'مدرب') : undefined,
        });

        return { message: 'تم قبول المدرب بنجاح' };
    }

    /**
     * Reject trainer verification
     */
    async rejectTrainer(trainerId: string, reason: string, adminId: string) {
        const trainerProfile = await prisma.trainerProfile.findUnique({
            where: { id: trainerId },
            include: { user: true },
        });

        if (!trainerProfile) {
            throw new Error('ا�„�…�„ف الشخصي للمدرب غير موجود');
        }

        // Update trainer profile verification status
        await prisma.trainerProfile.update({
            where: { id: trainerId },
            data: {
                verificationStatus: 'REJECTED',
                rejectionReason: reason,
            },
        });

        // Keep user status as PENDING_VERIFICATION (they can re-apply)
        // Or optionally suspend the account

        // Log action
        await prisma.auditLog.create({
            data: {
                action: AuditAction.REJECT,
                entityName: 'TrainerProfile',
                entityId: trainerId,
                description: `Reject trainer: ${trainerProfile.user.name}. Reason: ${reason}`,
                performedBy: adminId,
            },
        });

        // Notify trainer
        await notificationService.createNotification({
            userId: trainerProfile.userId,
            type: 'ACCOUNT_REJECTED',
            title: 'تم رفض طلبك كمدرب',
            message: `�†أسف �„رفض طلبك. السبب: ${reason}`,
            actionUrl: '/trainer/profile',
            emailFn: trainerProfile.user.email ? () => mailerService.sendAccountRejected(trainerProfile.user.email, trainerProfile.user.name, 'مدرب', reason) : undefined,
            whaFn: trainerProfile.user.phone ? () => whatsAppService.notifyAccountRejected(trainerProfile.user.phone!, trainerProfile.user.name, 'مدرب', reason) : undefined,
        });

        return { message: 'تم رفض المدرب' };
    }

    /**
     * Approve institute verification
     */
    async approveInstitute(instituteId: string, adminId: string) {
        const institute = await prisma.institute.findUnique({
            where: { id: instituteId },
            include: { user: true },
        });

        if (!institute) {
            throw new Error('الجهة التدريبية غير موجودة');
        }

        // Update institute verification status
        await prisma.institute.update({
            where: { id: instituteId },
            data: {
                verificationStatus: 'APPROVED',
                rejectionReason: null,
            },
        });

        // Update user status to ACTIVE
        await prisma.user.update({
            where: { id: institute.userId },
            data: {
                status: 'ACTIVE',
            },
        });

        // Log action
        await prisma.auditLog.create({
            data: {
                action: AuditAction.APPROVE,
                entityName: 'Institute',
                entityId: instituteId,
                description: `Approve institute: ${institute.name}`,
                performedBy: adminId,
            },
        });

        // Notify institute
        await notificationService.createNotification({
            userId: institute.userId,
            type: 'ACCOUNT_APPROVED',
            title: 'تم قبول المعهد',
            message: `تهانينا! تمت مراجعة معهد "${institute.name}" �ˆا�„�…�ˆاف�‚ة عليه. يمكنكم الآن البدء ف�Š إنشاء الدورات.`,
            actionUrl: '/institute/dashboard',
            emailFn: institute.user.email ? () => mailerService.sendAccountApproved(institute.user.email, institute.user.name, 'مسؤول معهد') : undefined,
            whaFn: institute.user.phone ? () => whatsAppService.notifyAccountApproved(institute.user.phone!, institute.user.name, 'مسؤول معهد') : undefined,
        });

        return { message: 'تم قبول الجهة التدريبية بنجاح' };
    }

    /**
     * Reject institute verification
     */
    async rejectInstitute(instituteId: string, reason: string, adminId: string) {
        const institute = await prisma.institute.findUnique({
            where: { id: instituteId },
            include: { user: true },
        });

        if (!institute) {
            throw new Error('الجهة التدريبية غير موجودة');
        }

        // Update institute verification status
        await prisma.institute.update({
            where: { id: instituteId },
            data: {
                verificationStatus: 'REJECTED',
                rejectionReason: reason,
            },
        });

        // Keep user status as PENDING_VERIFICATION (they can re-apply)
        // Or optionally suspend the account

        // Log action
        await prisma.auditLog.create({
            data: {
                action: AuditAction.REJECT,
                entityName: 'Institute',
                entityId: instituteId,
                description: `Reject institute: ${institute.name}. Reason: ${reason}`,
                performedBy: adminId,
            },
        });

        // Notify institute
        await notificationService.createNotification({
            userId: institute.userId,
            type: 'ACCOUNT_REJECTED',
            title: 'تم رفض طلب المعهد',
            message: `�†أسف �„رفض طلب معهد "${institute.name}". السبب: ${reason}`,
            actionUrl: '/institute/profile',
            emailFn: institute.user.email ? () => mailerService.sendAccountRejected(institute.user.email, institute.user.name, 'مسؤول معهد', reason) : undefined,
            whaFn: institute.user.phone ? () => whatsAppService.notifyAccountRejected(institute.user.phone!, institute.user.name, 'مسؤول معهد', reason) : undefined,
        });

        return { message: 'تم رفض الجهة التدريبية' };
    }
    /**
     * Get dashboard stats and recent activity
     */
    async getDashboardStats() {
        // 1. Counts
        const totalUsers = await prisma.user.count();
        const totalInstitutes = await prisma.institute.count();
        const totalCourses = await prisma.course.count();

        // 2. Revenue (Mock for now or sum verified payments)
        // const totalRevenue = await prisma.payment.aggregate({
        //    _sum: { amount: true },
        //    where: { status: 'APPROVED' }
        // });
        const totalRevenue = 450000; // Placeholder matching mock data

        // 3. Pending Approvals (Count)
        const pendingTrainersCount = await prisma.trainerProfile.count({ where: { verificationStatus: 'PENDING' } });
        const pendingInstitutesCount = await prisma.institute.count({ where: { verificationStatus: 'PENDING' } });
        const pendingApprovals = pendingTrainersCount + pendingInstitutesCount;

        // 4. Pending Items (List for card)
        const pendingTrainers = await prisma.trainerProfile.findMany({
            where: { verificationStatus: 'PENDING' },
            take: 3,
            orderBy: { user: { createdAt: 'desc' } }, // Approximate
            include: { user: { select: { id: true, name: true, createdAt: true } } }
        });

        const pendingInstitutes = await prisma.institute.findMany({
            where: { verificationStatus: 'PENDING' },
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, name: true } } }
        });

        // Combine and sort
        const pendingItems = [
            ...pendingTrainers.map(t => ({
                id: t.id,
                userId: t.user.id, // For key or linking
                type: 'trainer',
                title: t.user.name,
                description: 'طلب التحقق من مدرب',
                date: t.user.createdAt
            })),
            ...pendingInstitutes.map(i => ({
                id: i.id,
                userId: i.user.id,
                type: 'institute',
                title: i.name, // Institute name
                description: 'طلب اعتماد معهد جديد',
                date: i.createdAt
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

        // 5. Recent Activity (Mock or from Users/Courses)
        // Let's get recent users and recent institutes
        const recentUsers = await prisma.user.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { name: true, role: true, createdAt: true }
        });

        const recentActivity = recentUsers.map(u => ({
            action: 'تسجيل جديد',
            details: `انضم ${u.name} كـ ${u.role}`,
            time: u.createdAt
        }));

        return {
            stats: {
                totalUsers,
                totalInstitutes,
                totalCourses,
                totalRevenue,
                pendingApprovals
            },
            pendingItems,
            recentActivity
        };
    }

    /**
     * Get all trainers
     */
    async getAllTrainers() {
        const trainers = await prisma.trainerProfile.findMany({
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        phone: true,
                        status: true,
                        createdAt: true,
                        avatar: true,
                    },
                },
            },
            orderBy: {
                user: {
                    createdAt: 'desc',
                },
            },
        });

        // Map to flat structure for easier consumption
        return trainers.map(trainer => {
            const t = trainer as any;
            return {
                ...t,
                verificationStatus: t.verificationStatus.toLowerCase(),
                status: t.user.status === 'SUSPENDED' ? 'suspended' : t.verificationStatus.toLowerCase(),
                email: t.user.email,
                phone: t.user.phone,
                name: t.user.name,
                createdAt: t.user.createdAt,
                avatar: t.user.avatar,
            };
        });
    }

    /**
     * Get all institutes
     */
    async getAllInstitutes() {
        const institutes = await prisma.institute.findMany({
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        phone: true,
                        status: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Map to flat structure if needed, or ensuring status is present
        return institutes.map(inst => ({
            ...inst,
            verificationStatus: inst.verificationStatus.toLowerCase(),
            status: inst.user.status === 'SUSPENDED' ? 'suspended' : inst.verificationStatus.toLowerCase(),
            email: inst.email || inst.user.email,
            phone: inst.phone || inst.user.phone,
            name: inst.name || inst.user.name
        }));
    }

    /**
     * Suspend institute
     */
    async suspendInstitute(instituteId: string, reason: string, adminId: string) {
        const institute = await prisma.institute.findUnique({
            where: { id: instituteId },
            include: { user: true },
        });

        if (!institute) {
            throw new Error('المعهد غير موجود');
        }

        // Update institute status
        await prisma.institute.update({
            where: { id: instituteId },
            data: {
                rejectionReason: reason, // Using rejectionReason field to store suspension reason for now
            },
        });

        // Update user status
        await prisma.user.update({
            where: { id: institute.userId },
            data: {
                status: 'SUSPENDED',
            },
        });
        
        // Log action
        await prisma.auditLog.create({
            data: {
                action: AuditAction.UPDATE,
                entityName: 'Institute',
                entityId: instituteId,
                description: `Suspend institute: ${institute.name}. Reason: ${reason}`,
                performedBy: adminId,
            },
        });

        return { message: 'تم تعليق المعهد بنجاح' };
    }

    /**
     * Reactivate institute
     */
    async reactivateInstitute(instituteId: string, adminId: string) {
        const institute = await prisma.institute.findUnique({
            where: { id: instituteId },
            include: { user: true },
        });

        if (!institute) {
            throw new Error('المعهد غير موجود');
        }

        // Update institute status
        await prisma.institute.update({
            where: { id: instituteId },
            data: {
                rejectionReason: null,
            },
        });

        // Update user status
        await prisma.user.update({
            where: { id: institute.userId },
            data: {
                status: 'ACTIVE',
            },
        });

        // Log action
        await prisma.auditLog.create({
            data: {
                action: AuditAction.UPDATE,
                entityName: 'Institute',
                entityId: instituteId,
                description: `Reactivate institute: ${institute.name}`,
                performedBy: adminId,
            },
        });

        return { message: 'تم إعادة تفع�Š�„ المعهد بنجاح' };
    }

    /**
     * Delete institute
     */
    async deleteInstitute(instituteId: string, adminId: string) {
        const institute = await prisma.institute.findUnique({
            where: { id: instituteId },
        });

        if (!institute) {
            throw new Error('المعهد غير موجود');
        }

        // Delete institute (cascading delete should handle related data if configured, 
        // otherwise we might need to delete related data manually)
        // Ideally we should soft delete, but for now specific hard delete

        await prisma.user.delete({
            where: { id: institute.userId },
        });

        // Log action
        await prisma.auditLog.create({
            data: {
                action: AuditAction.DELETE,
                entityName: 'Institute',
                entityId: instituteId,
                description: `Delete institute: ${institute.name}`,
                performedBy: adminId,
            },
        });

        return { message: 'تم حذف المعهد بنجاح' };
    }

    /**
     * Update institute
     */
    async updateInstitute(instituteId: string, data: any, adminId: string) {
        const institute = await prisma.institute.findUnique({
            where: { id: instituteId },
            include: { user: true }
        });

        if (!institute) {
            throw new Error('المعهد غير موجود');
        }

        // Update institute fields
        await prisma.institute.update({
            where: { id: instituteId },
            data: {
                name: data.name,
                phone: data.phone,
                description: data.description,
                address: data.address,
                website: data.website,
                logo: data.logo,
            },
        });

        // Update statuses based on data.status
        if (data.status) {
            let userStatus: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION' | undefined;
            let verificationStatus: 'APPROVED' | 'PENDING' | undefined;

            if (data.status === 'approved') {
                userStatus = 'ACTIVE';
                verificationStatus = 'APPROVED';
            } else if (data.status === 'pending') {
                userStatus = 'PENDING_VERIFICATION';
                verificationStatus = 'PENDING';
            } else if (data.status === 'suspended') {
                userStatus = 'SUSPENDED';
            }

            if (userStatus) {
                await prisma.user.update({
                    where: { id: institute.userId },
                    data: { status: userStatus }
                });
            }

            if (verificationStatus) {
                await prisma.institute.update({
                    where: { id: instituteId },
                    data: { verificationStatus }
                });
            }
        }

        // Update user email/name if changed
        if ((data.email && data.email !== institute.user.email) || (data.name && data.name !== institute.user.name)) {
            await prisma.user.update({
                where: { id: institute.userId },
                data: {
                    email: data.email,
                    name: data.name
                }
            });
        }

        // Update password if provided
        if (data.password) {
            const hashedPassword = await hashPassword(data.password);
            await prisma.user.update({
                where: { id: institute.userId },
                data: { password: hashedPassword }
            });
        }
        
        // Log action
        await prisma.auditLog.create({
            data: {
                action: AuditAction.UPDATE,
                entityName: 'Institute',
                entityId: instituteId,
                description: `Update institute: ${institute.name}`,
                performedBy: adminId,
            },
        });

        return { message: 'تم تحديث بيانات المعهد بنجاح' };
    }

    /**
     * Update trainer
     */
    async updateTrainer(trainerId: string, data: any, adminId: string) {
        const trainer = await prisma.trainerProfile.findUnique({
            where: { id: trainerId },
            include: { user: true }
        });

        if (!trainer) {
            throw new Error('المدرب غير موجود');
        }

        // Update trainer profile fields
        await prisma.trainerProfile.update({
            where: { id: trainerId },
            data: {
                bio: data.bio,
                cvUrl: data.cvUrl,
                specialties: data.specialties, // Expecting array of strings
            },
        });

        // Update statuses based on data.status
        if (data.status) {
            let userStatus: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION' | undefined;
            let verificationStatus: 'APPROVED' | 'PENDING' | undefined;

            if (data.status === 'approved') {
                userStatus = 'ACTIVE';
                verificationStatus = 'APPROVED';
            } else if (data.status === 'pending') {
                userStatus = 'PENDING_VERIFICATION';
                verificationStatus = 'PENDING';
            } else if (data.status === 'suspended') {
                userStatus = 'SUSPENDED';
            }

            if (userStatus) {
                await prisma.user.update({
                    where: { id: trainer.userId },
                    data: { status: userStatus }
                });
            }

            if (verificationStatus) {
                await prisma.trainerProfile.update({
                    where: { id: trainerId },
                    data: { verificationStatus }
                });
            }
        }

        // Update user email/name/phone if changed
        if ((data.email && data.email !== trainer.user.email) ||
            (data.name && data.name !== trainer.user.name) ||
            (data.phone && data.phone !== trainer.user.phone)) {
            await prisma.user.update({
                where: { id: trainer.userId },
                data: {
                    email: data.email,
                    name: data.name,
                    phone: data.phone
                }
            });
        }

        if (data.password) {
            const hashedPassword = await hashPassword(data.password);
            await prisma.user.update({
                where: { id: trainer.userId },
                data: { password: hashedPassword }
            });
        }

        // Log action
        await prisma.auditLog.create({
            data: {
                action: AuditAction.UPDATE,
                entityName: 'TrainerProfile',
                entityId: trainerId,
                description: `Update trainer: ${trainer.user.name}`,
                performedBy: adminId,
            },
        });

        return { message: 'تم تحديث بيانات المدرب بنجاح' };
    }

    /**
     * Get all students
     */
    async getAllStudents() {
        const students = await prisma.user.findMany({
            where: {
                role: 'STUDENT',
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                status: true,
                createdAt: true,
                avatar: true
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Map Prisma status (uppercase) to frontend status (lowercase)
        return students.map(student => ({
            ...student,
            status: student.status === 'PENDING_VERIFICATION' ? 'pending' : student.status.toLowerCase(),
        }));
    }

    /**
     * Update student
     */
    async updateStudent(studentId: string, data: any, adminId: string) {
        const student = await prisma.user.findUnique({
            where: { id: studentId },
        });

        if (!student) {
            throw new Error('الطالب غير موجود');
        }

        // Map frontend status to Prisma status
        let status = undefined;
        if (data.status) {
            if (data.status === 'active') status = 'ACTIVE';
            else if (data.status === 'suspended') status = 'SUSPENDED';
            else if (data.status === 'pending') status = 'PENDING_VERIFICATION';
        }

        const updateData: any = {
            name: data.name,
            email: data.email,
            phone: data.phone,
            role: data.role
        };

        if (status) {
            updateData.status = status;
        }

        if (data.password && data.password.trim() !== "") {
            updateData.password = await hashPassword(data.password);
        }

        if (data.avatar !== undefined) {
            updateData.avatar = data.avatar;
        }

        await prisma.user.update({
            where: { id: studentId },
            data: updateData,
        });

        // Log action
        await prisma.auditLog.create({
            data: {
                action: AuditAction.UPDATE,
                entityName: 'User',
                entityId: studentId,
                description: `Update student: ${student.name}`,
                performedBy: adminId,
            },
        });

        return { message: 'تم تحديث بيانات الطالب بنجاح' };
    }

    /**
     * Suspend student
     */
    async suspendStudent(studentId: string, reason: string, adminId: string) {
        const student = await prisma.user.findUnique({ where: { id: studentId } });
        if (!student) throw new Error('الطالب غير موجود');

        // reason can be logged or stored if there's a suspension log table
        await prisma.user.update({
            where: { id: studentId },
            data: { status: 'SUSPENDED' },
        });

        // Log action
        await prisma.auditLog.create({
            data: {
                action: AuditAction.UPDATE,
                entityName: 'User',
                entityId: studentId,
                description: `Suspend student: ${student.name}. Reason: ${reason}`,
                performedBy: adminId,
            },
        });

        return { message: 'تم تعليق حساب الطالب بنجاح' };
    }

    /**
     * Delete student
     */
    async deleteStudent(studentId: string, adminId: string) {
        const student = await prisma.user.findUnique({ where: { id: studentId } });
        if (!student) throw new Error('الطالب غير موجود');

        // Check for related data (enrollments, etc.) before hard deleting
        // For now, we'll assume cascading delete or manual cleanup is handled by DB constraints or we just delete the user
        await prisma.user.delete({
            where: { id: studentId },
        });

        // Log action
        await prisma.auditLog.create({
            data: {
                action: AuditAction.DELETE,
                entityName: 'User',
                entityId: studentId,
                description: `Delete student: ${student.name}`,
                performedBy: adminId,
            },
        });

        return { message: 'تم حذف حساب الطالب بنجاح' };
    }

    // =====================================================
    // COURSE MANAGEMENT
    // =====================================================

    /**
     * Get all courses with trainer, institute, category, and enrollment count
     */
    async getAllCourses() {
        const courses = await prisma.course.findMany({
            include: {
                trainer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                institute: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                _count: {
                    select: {
                        enrollments: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const statusMap: Record<string, string> = {
            DRAFT: 'draft',
            ACTIVE: 'active',
            COMPLETED: 'completed',
            CANCELLED: 'cancelled',
            REJECTED: 'rejected',
        };

        return courses.map((course) => ({
            id: course.id,
            title: course.title,
            description: course.description || '',
            shortDescription: course.shortDescription || '',
            price: Number(course.price),
            duration: course.duration,
            startDate: course.startDate,
            endDate: course.endDate,
            minStudents: course.minStudents,
            maxStudents: course.maxStudents,
            status: statusMap[course.status] || course.status.toLowerCase(),
            image: course.image,
            prerequisites: course.prerequisites,
            objectives: course.objectives,
            tags: course.tags,
            category: course.category?.name || '',
            categoryId: course.categoryId,
            trainerId: course.trainerId,
            trainer: course.trainer ? {
                id: course.trainer.id,
                name: course.trainer.name,
                email: course.trainer.email,
                role: 'trainer',
                status: 'active',
                createdAt: course.createdAt,
            } : null,
            instituteId: course.instituteId,
            institute: course.institute
                ? {
                    id: course.institute.id,
                    name: course.institute.name,
                    description: '',
                    email: '',
                    phone: '',
                    address: '',
                    status: 'approved',
                    createdAt: course.createdAt,
                    updatedAt: course.updatedAt,
                }
                : null,
            enrolledStudents: course._count.enrollments,
            createdAt: course.createdAt,
            updatedAt: course.updatedAt,
        }));
    }

    /**
     * Update course
     */
    async updateCourse(courseId: string, data: any, adminId: string) {
        const statusMap: Record<string, string> = {
            draft: 'DRAFT',
            active: 'ACTIVE',
            completed: 'COMPLETED',
            cancelled: 'CANCELLED',
            rejected: 'REJECTED',
        };

        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
        if (data.price !== undefined) updateData.price = data.price;
        if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
        if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
        if (data.maxStudents !== undefined) updateData.maxStudents = data.maxStudents;
        if (data.status !== undefined) updateData.status = statusMap[data.status] || data.status;
        if (data.trainerId !== undefined) updateData.trainerId = data.trainerId;
        if (data.image !== undefined) updateData.image = data.image;

        await prisma.course.update({
            where: { id: courseId },
            data: updateData,
        });

        // Log action
        await prisma.auditLog.create({
            data: {
                action: AuditAction.UPDATE,
                entityName: 'Course',
                entityId: courseId,
                description: `Update course: ${updateData.title || courseId}`,
                performedBy: adminId,
            },
        });

        return { message: 'تم تحديث الدورة بنجاح' };
    }

    /**
     * Delete course
     */
    async deleteCourse(courseId: string, adminId: string) {
        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) throw new Error('الدورة غير موجودة');

        await prisma.course.delete({
            where: { id: courseId },
        });

        // Log action
        await prisma.auditLog.create({
            data: {
                action: AuditAction.DELETE,
                entityName: 'Course',
                entityId: courseId,
                description: `Delete course: ${course.title}`,
                performedBy: adminId,
            },
        });

        return { message: 'تم حذف الدورة بنجاح' };
    }

    /**
     * Suspend (cancel) course
     */
    async suspendCourse(courseId: string, adminId: string) {
        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) throw new Error('الدورة غير موجودة');

        await prisma.course.update({
            where: { id: courseId },
            data: { status: 'CANCELLED' },
        });

        // Log action
        await prisma.auditLog.create({
            data: {
                action: AuditAction.CANCEL,
                entityName: 'Course',
                entityId: courseId,
                description: `Suspend course: ${course.title}`,
                performedBy: adminId,
            },
        });

        return { message: 'تم تعليق الدورة بنجاح' };
    }

    // =====================================================
    // ANNOUNCEMENT MANAGEMENT
    // =====================================================

    /**
     * Get all announcements (newest first)
     */
    async getAnnouncements() {
        const announcements = await prisma.announcement.findMany({
            include: {
                sender: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return announcements.map(a => {
            const ann = a as any;
            return {
                id: ann.id,
                title: ann.title,
                content: ann.message,
                targetAudience: (ann.targetAudience as string).toLowerCase(),
                category: (ann.category as string).toLowerCase(),
                status: (ann.status as string).toLowerCase(),
                scheduledDate: ann.scheduledAt,
                sentDate: ann.sentAt,
                createdAt: ann.createdAt,
                sender: ann.sender,
            };
        });
    }

    /**
     * Create a new announcement (DRAFT or SCHEDULED)
     */
    async createAnnouncement(data: {
        title: string;
        content: string;
        targetAudience?: string;
        category?: string;
        scheduledDate?: string;
        scheduledTime?: string;
        recipientIds?: string[];
    }, senderId: string) {
        const audienceMap: Record<string, any> = {
            all: 'ALL', students: 'STUDENTS', trainers: 'TRAINERS', institutes: 'INSTITUTES', specific_users: 'SPECIFIC_USERS',
        };
        const categoryMap: Record<string, any> = {
            general: 'GENERAL', event: 'EVENT', maintenance: 'MAINTENANCE', urgent: 'URGENT',
        };

        let scheduledAt: Date | undefined;
        if (data.scheduledDate) {
            scheduledAt = new Date(data.scheduledDate);
            if (data.scheduledTime) {
                const [h, m] = data.scheduledTime.split(':').map(Number);
                scheduledAt.setHours(h, m);
            }
        }

        const announcement = await (prisma.announcement.create as any)({
            data: {
                title: data.title,
                message: data.content,
                targetAudience: audienceMap[data.targetAudience ?? 'all'] ?? 'ALL',
                category: categoryMap[data.category ?? 'general'] ?? 'GENERAL',
                status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
                scheduledAt,
                senderId,
                recipientIds: data.recipientIds ?? [],
            },
        });

        return { id: announcement.id, message: 'تم إنشاء الإعلان بنجاح' };
    }

    /**
     * Update an existing announcement
     */
    async updateAnnouncement(id: string, data: {
        title?: string;
        content?: string;
        targetAudience?: string;
        category?: string;
        status?: string;
        scheduledDate?: string;
        scheduledTime?: string;
        recipientIds?: string[];
    }) {
        const audienceMap: Record<string, any> = {
            all: 'ALL', students: 'STUDENTS', trainers: 'TRAINERS', institutes: 'INSTITUTES', specific_users: 'SPECIFIC_USERS',
        };
        const categoryMap: Record<string, any> = {
            general: 'GENERAL', event: 'EVENT', maintenance: 'MAINTENANCE', urgent: 'URGENT',
        };
        const statusMap: Record<string, any> = {
            draft: 'DRAFT', scheduled: 'SCHEDULED', sent: 'SENT',
        };

        let scheduledAt: Date | null | undefined;
        if (data.scheduledDate) {
            scheduledAt = new Date(data.scheduledDate);
            if (data.scheduledTime) {
                const [h, m] = data.scheduledTime.split(':').map(Number);
                scheduledAt.setHours(h, m);
            }
        } else if (data.scheduledDate === '') {
            scheduledAt = null;
        }

        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.content !== undefined) updateData.message = data.content;
        if (data.targetAudience !== undefined) updateData.targetAudience = audienceMap[data.targetAudience] ?? 'ALL';
        if (data.category !== undefined) updateData.category = categoryMap[data.category] ?? 'GENERAL';
        if (data.status !== undefined) updateData.status = statusMap[data.status] ?? 'DRAFT';
        if (data.recipientIds !== undefined) updateData.recipientIds = data.recipientIds;
        if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt;

        await (prisma.announcement.update as any)({ where: { id }, data: updateData });
        return { message: 'تم تحديث الإعلان بنجاح' };
    }

    /**
     * Delete an announcement
     */
    async deleteAnnouncement(id: string) {
        await prisma.announcement.delete({ where: { id } });
        return { message: 'تم حذف الإعلان بنجاح' };
    }

    /**
     * Send an announcement: mark as SENT and create Notification rows for targeted users
     */
    async sendAnnouncement(id: string) {
        const announcement = await (prisma.announcement.findUnique as any)({ where: { id } });
        if (!announcement) throw new Error('الإعلان غير موجود');
        if ((announcement as any).status === 'SENT') throw new Error('تم إرسال هذا الإعلان مسبقاً');

        // Resolve target users
        let users: any[] = [];
        const audience = (announcement as any).targetAudience;

        if (audience === 'SPECIFIC_USERS') {
            const recipientIds = (announcement as any).recipientIds || [];
            if (recipientIds.length > 0) {
                users = await prisma.user.findMany({
                    where: { id: { in: recipientIds }, status: 'ACTIVE' },
                    select: { id: true, name: true, email: true },
                });
            }
        } else {
            const roleMap: Record<string, string[]> = {
                ALL: ['STUDENT', 'TRAINER', 'INSTITUTE_ADMIN'],
                STUDENTS: ['STUDENT'],
                TRAINERS: ['TRAINER'],
                INSTITUTES: ['INSTITUTE_ADMIN'],
            };
            const roles = roleMap[audience] ?? ['STUDENT', 'TRAINER', 'INSTITUTE_ADMIN'];

            users = await prisma.user.findMany({
                where: { role: { in: roles as any }, status: 'ACTIVE' },
                select: { id: true, name: true, email: true },
            });
        }

        // Determine NotificationType based on Category
        const cat = (announcement as any).category;
        let notificationType = 'ANNOUNCEMENT_GENERAL';
        if (cat === 'URGENT') notificationType = 'ANNOUNCEMENT_URGENT';
        else if (cat === 'EVENT') notificationType = 'ANNOUNCEMENT_EVENT';
        else if (cat === 'MAINTENANCE') notificationType = 'ANNOUNCEMENT_MAINTENANCE';

        // Mark announcement as SENT
        await (prisma.announcement.update as any)({
            where: { id },
            data: { status: 'SENT', sentAt: new Date() },
        });

        // Create one Notification per user (batch)
        if (users.length > 0) {
            await prisma.notification.createMany({
                data: users.map(u => ({
                    userId: u.id,
                    type: notificationType as any,
                    title: announcement.title,
                    message: announcement.message,
                    relatedEntityId: announcement.id,
                })),
                skipDuplicates: true,
            });

            // Send email to every user (fire-and-forget)
            const emailTitle = cat === 'URGENT' ? `[عاجل] ${announcement.title}` : (cat === 'MAINTENANCE' ? `[صيانة] ${announcement.title}` : announcement.title);
            for (const user of users) {
                if (user.email) {
                    mailerService.sendAnnouncementEmail(
                        user.email,
                        user.name,
                        emailTitle,
                        announcement.message
                    ).catch((err: any) => console.error('[Mailer] Admin announcement email failed:', err));
                }
            }
        }

        return { message: 'تم إرسال الإعلان بنجاح', recipientCount: users.length };
    }

    /**
     * Get all system audit logs
     */
    async getAuditLogs() {
        return await prisma.auditLog.findMany({
            include: {
                performer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                performedAt: 'desc',
            },
        });
    }

    /**
     * Search users (students, trainers, institutes) by name, email, or phone
     */
    async searchUsers(query: string) {
        if (!query || query.trim().length < 2) return [];
        const term = query.trim();
        
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: term, mode: 'insensitive' } },
                    { email: { contains: term, mode: 'insensitive' } },
                    { phone: { contains: term, mode: 'insensitive' } }
                ],
                role: { in: ['STUDENT', 'TRAINER', 'INSTITUTE_ADMIN'] }
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                avatar: true
            },
            take: 20
        });

        return users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            role: u.role.toLowerCase(),
            avatar: u.avatar
        }));
    }

    /**
     * Get all halls (rooms) across all institutes � admin view
     */
    async getAllHalls() {
        const rooms = await prisma.room.findMany({
            where: { isActive: true },
            include: {
                institute: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return rooms;
    }

    /**
     * Update hall (admin view) - e.g. activate/deactivate
     */
    async updateHall(hallId: string, data: any, adminId: string) {
        const room = await prisma.room.findUnique({
            where: { id: hallId },
        });

        if (!room) {
            throw new Error('القاعة غير موجودة');
        }

        const updatedRoom = await prisma.room.update({
            where: { id: hallId },
            data: {
                isActive: data.isActive !== undefined ? data.isActive : undefined,
            },
        });

        // Log action
        await prisma.auditLog.create({
            data: {
                action: AuditAction.UPDATE,
                entityName: 'Room',
                entityId: hallId,
                description: `Admin updated hall: ${room.name} (isActive: ${data.isActive})`,
                performedBy: adminId,
            },
        });

        return { message: 'تم تحديث حالة القاعة بنجاح' };
    }
}

export default new AdminService();

