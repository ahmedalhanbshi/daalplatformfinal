/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import trainerService from '../services/trainer.service';
import { sendError, sendSuccess } from '../utils/response';

class TrainerController {
    /**
     * Get dashboard data for the authenticated trainer
     */
    async getDashboard(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const data = await trainerService.getDashboard(req.user.userId);
            return sendSuccess(res, 'تم جلب بيانات لوحة التحكم بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    // ==========================================
    // Trainer Bank Accounts
    // ==========================================

    async getBankAccounts(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const accounts = await trainerService.getBankAccounts(req.user.userId);
            return sendSuccess(res, 'تم جلب الحسابات البنكية بنجاح', accounts);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async addBankAccount(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const body = req.body;
            if (!body.bankName || !body.accountName || !body.accountNumber) {
                return sendError(res, 'يرجى إدخال جميع الحقول المطلوبة (اسم البنك، اسم الحساب، رقم الحساب)', 400);
            }
            const account = await trainerService.addBankAccount(req.user.userId, body);
            return sendSuccess(res, 'تم إضافة الحساب البنكي بنجاح', account);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async updateBankAccount(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { accountId } = req.params;
            const body = req.body;
            const account = await trainerService.updateBankAccount(req.user.userId, accountId, body);
            return sendSuccess(res, 'تم تحديث الحساب البنكي بنجاح', account);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async deleteBankAccount(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { accountId } = req.params;
            await trainerService.deleteBankAccount(req.user.userId, accountId);
            return sendSuccess(res, 'تم حذف الحساب البنكي بنجاح');
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    // ==========================================
    // Course Catalog & Explore
    // ==========================================

    /**
     * Get publicly browsable active courses (explore page)
     */
    async getExploreCourses(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            // Allow any authenticated user (trainer, student, etc.)
            const data = await trainerService.getExploreCourses({
                q: typeof req.query.q === 'string' ? req.query.q : undefined,
                category: typeof req.query.category === 'string' ? req.query.category : undefined,
                sort: typeof req.query.sort === 'string' ? req.query.sort : undefined,
                deliveryType: typeof req.query.deliveryType === 'string' ? req.query.deliveryType : undefined,
                minPrice: req.query.minPrice !== undefined ? Number(req.query.minPrice) : undefined,
                maxPrice: req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : undefined,
            });
            return sendSuccess(res, 'تم جلب الدورات بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Get a single ACTIVE course by ID (public detail view)
     */
    async getPublicCourseById(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            const { courseId } = req.params;
            const data = await trainerService.getPublicCourseById(courseId, req.user?.userId);
            return sendSuccess(res, 'تم جلب تفاص�Š�„ الدورة بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 404);
        }
    }

    /**
     * Get all categories
     */
    async getCategories(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            const categories = await trainerService.getCategories();
            return sendSuccess(res, 'تم جلب ا�„تص�†�Šفات بنجاح', categories);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Create a new category
     */
    async createCategory(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { name } = req.body;
            if (!name) return sendError(res, 'يرجى إدخال اسم ا�„تص�†�Šف', 400);

            const category = await trainerService.createCategory(name);
            return sendSuccess(res, 'تم إضافة ا�„تص�†�Šف بنجاح', category);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Create a new tag
     */
    async createTag(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { name } = req.body;
            if (!name) return sendError(res, 'يرجى إدخال اسم الوسم', 400);

            const tag = await trainerService.createTag(name);
            return sendSuccess(res, 'تم إضافة الوسم بنجاح', tag);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Get all active halls for the trainer (or any user) to browse
     */
    async getHalls(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            // Public endpoint: No role check required.
            const halls = await trainerService.getHalls();
            return sendSuccess(res, 'تم جلب القاعات بنجاح', halls);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Get a single hall by ID
     */
    async getHallById(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            const { hallId } = req.params;
            const hall = await trainerService.getHallById(hallId);
            return sendSuccess(res, 'تم جلب تفاص�Š�„ القاعة بنجاح', hall);
        } catch (error: any) {
            return sendError(res, error.message, 404);
        }
    }

    /**
     * Get availability for a specific hall
     */
    async getHallAvailability(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            // Public endpoint: No role check required.
            const { hallId } = req.params;
            const result = await trainerService.getHallAvailability(hallId);
            return sendSuccess(res, 'تم جلب الأوقات المتاحة للقاعة', result);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Book a hall as a trainer outside of a course creation flow
     */
    async bookHall(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { hallId } = req.params;
            const { sessions, notes } = req.body;

            // Handle file upload
            let receiptFile = undefined;
            if (req.file) {
                receiptFile = `/uploads/${req.file.filename}`;
            }

            const parsedSessions = typeof sessions === 'string' ? JSON.parse(sessions) : sessions;

            if (!parsedSessions || !Array.isArray(parsedSessions) || parsedSessions.length === 0) {
                return sendError(res, 'يجب تحديد المواعيد للحجز', 400);
            }

            const result = await trainerService.bookHall(
                req.user.userId,
                hallId,
                parsedSessions,
                receiptFile,
                notes
            );

            return sendSuccess(res, 'تم إرسال طلب حجز القاعة بنجاح', result);
        } catch (error: any) {
            console.error('[bookHall] Error:', error);
            return sendError(res, error.message, 400);
        }
    }


    /**
     * Get all courses created by this trainer
     */
    async getCourses(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const courses = await trainerService.getCourses(req.user.userId);
            return sendSuccess(res, 'تم جلب الدورات بنجاح', courses);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Get a single course by ID for editing (must belong to this trainer)
     */
    async getTrainerCourseById(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { courseId } = req.params;
            const course = await trainerService.getTrainerCourseById(req.user.userId, courseId);
            return sendSuccess(res, 'تم جلب تفاص�Š�„ الدورة', course);
        } catch (error: any) {
            return sendError(res, error.message, 404);
        }
    }

    /**
     * Update a course belonging to this trainer
     */
    async updateTrainerCourse(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { courseId } = req.params;
            const body = req.body;

            const safeParseJSON = (val: any, fallback: any = null) => {
                if (val === undefined || val === null || val === '') return fallback;
                if (typeof val !== 'string') return val;
                try { return JSON.parse(val); } catch { return fallback; }
            };

            const payload: any = {
                title: body.title,
                shortDescription: body.shortDescription || '',
                description: body.description,
                price: body.price !== undefined && body.price !== '' ? Number(body.price) : undefined,
                duration: body.duration !== undefined && body.duration !== '' ? Number(body.duration) : undefined,
                maxStudents: body.maxStudents !== undefined && body.maxStudents !== '' ? Number(body.maxStudents) : undefined,
                minStudents: body.minStudents !== undefined && body.minStudents !== '' ? Number(body.minStudents) : undefined,
                startDate: body.startDate && body.startDate !== '' ? body.startDate : undefined,
                endDate: body.endDate && body.endDate !== '' ? body.endDate : undefined,
                categoryId: body.categoryId || undefined,
                status: body.status || undefined,
                deliveryType: body.deliveryType || undefined,
                objectives: safeParseJSON(body.objectives, []),
                prerequisites: safeParseJSON(body.prerequisites, []),
                tags: safeParseJSON(body.tags, []),
                sessions: safeParseJSON(body.sessions, undefined),
                hallId: body.hallId || undefined,
            };

            // Handle file uploads (both image and paymentReceipt via upload.fields)
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            if (files?.image?.[0]) {
                payload.image = `/uploads/${files.image[0].filename}`;
            } else if (req.file) {
                // fallback for single upload
                payload.image = `/uploads/${req.file.filename}`;
            }
            if (files?.paymentReceipt?.[0]) {
                payload.paymentReceiptPath = `/uploads/${files.paymentReceipt[0].filename}`;
            }

            const updated = await trainerService.updateTrainerCourse(req.user.userId, courseId, payload);
            return sendSuccess(res, 'تم تحديث الدورة بنجاح', updated);
        } catch (error: any) {
            console.error('[updateTrainerCourse] Error:', error);
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Delete a course belonging to this trainer
     */
    async deleteCourse(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { courseId } = req.params;
            await trainerService.deleteCourse(req.user.userId, courseId);
            return sendSuccess(res, 'تم حذف الدورة بنجاح');
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Get students for a specific trainer course
     */
    async getCourseStudents(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { courseId } = req.params;
            const data = await trainerService.getCourseStudents(req.user.userId, courseId);
            return sendSuccess(res, 'تم جلب الطلاب بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 404);
        }
    }

    /**
     * Unenroll a student from a trainer course
     */
    async unenrollStudent(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { courseId, enrollmentId } = req.params;
            const { reason } = req.body;
            await trainerService.unenrollStudent(req.user.userId, courseId, enrollmentId, reason || '');
            return sendSuccess(res, 'تم إلغاء تسجيل الطالب بنجاح', null);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Create a new course (Trainer)
     * Handles standard courses, or "in_person" courses where a hall is booked and a payment receipt is required.
     */
    async createCourse(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }

            // All fields come as strings in multipart/form-data � parse them properly
            const body = req.body;

            const safeParseJSON = (val: any, fallback: any = null) => {
                if (val === undefined || val === null || val === '') return fallback;
                if (typeof val !== 'string') return val;
                try { return JSON.parse(val); } catch { return fallback; }
            };

            const payload: any = {
                title: body.title,
                categoryId: body.categoryId,
                shortDescription: body.shortDescription || '',
                description: body.description,
                deliveryType: body.deliveryType,
                price: body.price !== undefined && body.price !== '' ? Number(body.price) : undefined,
                minStudents: body.minStudents !== undefined && body.minStudents !== '' ? Number(body.minStudents) : undefined,
                maxStudents: body.maxStudents !== undefined && body.maxStudents !== '' ? Number(body.maxStudents) : undefined,
                duration: body.duration !== undefined && body.duration !== '' ? Number(body.duration) : undefined,
                isFree: body.isFree === 'true',
                hallId: (body.hallId && body.hallId !== "undefined" && body.hallId.trim() !== "") ? body.hallId : undefined,
                startDate: body.startDate || '',
                endDate: body.endDate || '',
                status: body.status || 'DRAFT',
                sessions: safeParseJSON(body.sessions, []),
                objectives: safeParseJSON(body.objectives, []),
                prerequisites: safeParseJSON(body.prerequisites, []),
                tags: safeParseJSON(body.tags, []),
            };

            // Handle file uploads (multer .fields() sets req.files)
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };

            if (files?.image && files.image[0]) {
                payload.image = `/uploads/${files.image[0].filename}`;
            }

            let paymentReceiptPath: string | undefined;
            if (files?.paymentReceipt && files.paymentReceipt[0]) {
                paymentReceiptPath = `/uploads/${files.paymentReceipt[0].filename}`;
            }

            const course = await trainerService.createCourse(req.user.userId, payload, paymentReceiptPath);

            return sendSuccess(res, 'تم إنشاء الدورة بنجاح', course);
        } catch (error: any) {
            console.error('[createCourse] Error:', error);
            const msg = error?.message || 'حدث خطأ أثناء إنشاء الدورة';
            return sendError(res, msg, 400);
        }
    }

    /**
     * Get the authenticated trainer's own profile
     */
    async getProfile(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const data = await trainerService.getProfile(req.user.userId);
            return sendSuccess(res, 'تم جلب ا�„�…�„ف الشخصي بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Update the authenticated trainer's own profile
     */
    async updateProfile(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { name, phone, bio, specialties, email } = req.body;

            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            let avatarPath: string | undefined;
            if (files?.avatar?.[0]) {
                avatarPath = `/uploads/${files.avatar[0].filename}`;
            }

            const safeSpecialties = (() => {
                if (!specialties) return undefined;
                if (Array.isArray(specialties)) return specialties;
                try { return JSON.parse(specialties); } catch { return []; }
            })();

            const updated = await trainerService.updateProfile(req.user.userId, {
                name,
                phone,
                bio,
                specialties: safeSpecialties,
                avatarPath,
                email,
            });
            return sendSuccess(res, 'تم تحديث ا�„�…�„ف الشخصي بنجاح', updated);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Change the authenticated trainer's password
     */
    async changePassword(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { currentPassword, newPassword } = req.body;
            if (!currentPassword || !newPassword) return sendError(res, 'يرجى إدخال كلمة المرور الحالية والجديدة', 400);
            if (newPassword.length < 8) return sendError(res, 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل', 400);
            const result = await trainerService.changePassword(req.user.userId, currentPassword, newPassword);
            return sendSuccess(res, result.message);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Get all students enrolled in any of the trainer's courses
     */
    async getAllStudents(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const data = await trainerService.getAllStudents(req.user.userId);
            return sendSuccess(res, 'تم جلب الطلاب بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Create an announcement for students
     */
    async createStudentAnnouncement(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            console.log(`[Controller-Trainer] Incoming Announcement Request from User: ${req.user?.userId}`);
            console.log(`[Controller-Trainer] Payload:`, req.body);

            if (req.user?.role !== 'TRAINER') {
                console.warn(`[Controller-Trainer] Unauthorized access attempt by ${req.user?.role}`);
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { title, message, recipientIds, courseId, category, status, scheduledAt } = req.body;
            if (!title || !message) {
                return sendError(res, 'عنوان ومحتوى الإعلان مطلوبان', 400);
            }
            
            const announcement = await trainerService.createStudentAnnouncement(
                req.user.userId, 
                { title, message, recipientIds, courseId, category, status, scheduledAt }
            );

            console.log(`[Controller-Trainer] SUCCESS: Announcement created with ID: ${announcement?.id}`);

            return sendSuccess(res, 'تم إرسال الإعلان بنجاح', announcement);
        } catch (error: any) {
            console.error(`[Controller-Trainer] CRITICAL ERROR:`, error.message);
            return sendError(res, error.message, 400);
        }
    }

    async getAnnouncements(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const data = await trainerService.getAnnouncements(req.user.userId);
            return sendSuccess(res, 'تم جلب الإعلانات بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async updateAnnouncement(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { id } = req.params;
            const { title, message } = req.body;
            const data = await trainerService.updateAnnouncement(req.user.userId, id, { title, message });
            return sendSuccess(res, 'تم تحديث الإعلان بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async deleteAnnouncement(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { id } = req.params;
            await trainerService.deleteAnnouncement(req.user.userId, id);
            return sendSuccess(res, 'تم حذف الإعلان بنجاح', null);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Get enrollments for courses owned by the authenticated trainer
     */
    async getEnrollments(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const data = await trainerService.getEnrollments(req.user.userId);
            return sendSuccess(res, 'تم جلب طلبات التسجيل بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Update enrollment status (Accept/Reject)
     */
    async updateEnrollmentStatus(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { enrollmentId } = req.params;
            const { status, reason } = req.body;

            if (!['ACTIVE', 'CANCELLED', 'REJECT_PAYMENT', 'REJECT_ENROLLMENT'].includes(status)) {
                return sendError(res, 'حالة غير صالحة. يجب أن تكون ACTIVE أو CANCELLED أو REJECT_PAYMENT أو REJECT_ENROLLMENT', 400);
            }

            const updated = await trainerService.updateEnrollmentStatus(req.user.userId, enrollmentId, status, reason);
            return sendSuccess(res, status === 'ACTIVE' ? 'تم قبول طلب التسجيل بنجاح' : 'تم رفض طلب التسجيل بنجاح', updated);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Get all room booking requests for this trainer
     */
    async getRoomBookings(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const bookings = await trainerService.getRoomBookings(req.user.userId);
            return sendSuccess(res, 'تم جلب طلبات الحجز بنجاح', bookings);
        } catch (error: any) {
            return sendError(res, error.message, 404);
        }
    }

    /**
     * Resubmit a rejected hall booking payment
     */
    async resubmitBookingPayment(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { courseId, bookingId } = req.params;

            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            if (!files?.paymentReceipt?.[0]) {
                return sendError(res, 'يرجى إرفا�‚ إيصال ا�„دفع الجديد', 400);
            }

            const paymentReceiptPath = `/uploads/${files.paymentReceipt[0].filename}`;

            const updated = await trainerService.resubmitBookingPayment(
                req.user.userId,
                courseId,
                bookingId,
                paymentReceiptPath
            );

            return sendSuccess(res, 'تم إعادة إرسال طلب الحجز للمراجعة بنجاح', updated);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }
    /**
     * Get all sessions for the authenticated trainer
     */
    async getSchedule(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const data = await trainerService.getSchedule(req.user.userId);
            return sendSuccess(res, 'تم جلب الجدول بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Cancel a room booking (Trainer)
     * As per requirement: This also cancels the associated Course and Sessions.
     */
    async cancelBooking(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { courseId, bookingId } = req.params;

            const updated = await trainerService.cancelBooking(req.user.userId, courseId, bookingId);
            return sendSuccess(res, 'تم إلغاء طلب الحجز والدورة بنجاح', updated);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Cancel a direct room booking (not linked to any course)
     */
    async cancelDirectBooking(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { bookingId } = req.params;

            const updated = await trainerService.cancelDirectBooking(req.user.userId, bookingId);
            return sendSuccess(res, 'تم إلغاء طلب الحجز بنجاح', updated);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async updateSession(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { sessionId } = req.params;
            const { startTime, endTime, status, meetingLink, reason } = req.body;
            const data = {
                ...(startTime && { startTime: new Date(startTime) }),
                ...(endTime && { endTime: new Date(endTime) }),
                ...(status && { status }),
                ...(meetingLink !== undefined && { meetingLink }),
                ...(reason !== undefined && { reason }),
            };
            const updated = await trainerService.updateSession(req.user.userId, sessionId, data);
            return sendSuccess(res, 'تم تحديث الجلسة بنجاح', updated);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Activate a PENDING_MINIMUM online course and notify all waiting students.
     * Only works if the minimum enrollment threshold is met.
     */
    async activateCourse(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'TRAINER') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { courseId } = req.params;
            const data = await trainerService.activatePendingMinimumCourse(req.user.userId, courseId);
            return sendSuccess(res, 'تم تفع�Š�„ الدورة وإشعار الطلاب بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }
}

export default new TrainerController();

