/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import { sendSuccess, sendError } from '../utils/response';
import instituteService from '../services/institute.service';

class InstituteController {
    async getDashboard(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const data = await instituteService.getDashboardData(req.user.userId);
            return sendSuccess(res, 'تم جلب بيانات لوحة التحكم بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    // =====================================================
    // PROFILE
    // =====================================================

    async getProfile(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const data = await instituteService.getInstituteProfile(req.user.userId);
            return sendSuccess(res, 'تم جلب ا�„�…�„ف الشخصي بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async updateProfile(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const payload = { ...req.body };

            if (req.files) {
                const files = req.files as { [fieldname: string]: Express.Multer.File[] };
                if (files['avatar'] && files['avatar'][0]) {
                    payload.avatar = `/uploads/${files['avatar'][0].filename}`;
                }
                if (files['logo'] && files['logo'][0]) {
                    payload.logo = `/uploads/${files['logo'][0].filename}`;
                }
                if (files['licenseDocument'] && files['licenseDocument'][0]) {
                    payload.licenseDocumentUrl = `/uploads/${files['licenseDocument'][0].filename}`;
                }
            } else if (req.file) {
                payload.avatar = `/uploads/${req.file.filename}`;
            }


            const data = await instituteService.updateInstituteProfile(req.user.userId, payload);
            return sendSuccess(res, 'تم تحديث ا�„�…�„ف الشخصي بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    // =====================================================
    // BANK ACCOUNTS
    // =====================================================

    async getBankAccounts(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const data = await instituteService.getBankAccounts(req.user.userId);
            return sendSuccess(res, 'تم جلب الحسابات البنكية بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async addBankAccount(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);

            const { bankName, accountName, accountNumber, iban } = req.body;
            if (!bankName || !accountName || !accountNumber) {
                return sendError(res, 'اسم البنك، اسم الحساب، ورقم الحساب مطلوبون', 400);
            }

            const data = await instituteService.addBankAccount(req.user.userId, { bankName, accountName, accountNumber, iban });
            return sendSuccess(res, 'تم إضافة الحساب البنكي بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async updateBankAccount(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const data = await instituteService.updateBankAccount(req.user.userId, req.params.accountId, req.body);
            return sendSuccess(res, 'تم تحديث الحساب البنكي بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async deleteBankAccount(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const data = await instituteService.deleteBankAccount(req.user.userId, req.params.accountId);
            return sendSuccess(res, 'تم حذف الحساب البنكي بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    // =====================================================
    // STUDENTS & ENROLLMENTS
    // =====================================================

    async getCourses(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const courses = await instituteService.getInstituteCourses(req.user.userId);
            return sendSuccess(res, 'تم جلب الدورات بنجاح', courses);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async deleteCourse(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { id } = req.params;
            const result = await instituteService.deleteCourse(req.user.userId, id);
            return sendSuccess(res, result.message);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async changeTrainer(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { id } = req.params;
            const { trainerId } = req.body;
            const result = await instituteService.changeTrainer(req.user.userId, id, trainerId);
            return sendSuccess(res, result.message);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async getTrainers(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const trainers = await instituteService.getInstituteTrainers(req.user.userId);
            return sendSuccess(res, 'تم جلب المدربين بنجاح', trainers);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async getCourseStudents(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { id } = req.params;
            const data = await instituteService.getCourseStudents(req.user.userId, id);
            return sendSuccess(res, 'تم جلب بيانات الطلاب بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async unenrollStudent(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { id, enrollmentId } = req.params;
            const { reason } = req.body;
            const result = await instituteService.unenrollStudent(req.user.userId, id, enrollmentId, reason);
            return sendSuccess(res, result.message);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async getEnrollments(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const data = await instituteService.getEnrollments(req.user.userId);
            return sendSuccess(res, 'تم جلب طلبات التسجيل بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async updateEnrollmentStatus(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { enrollmentId } = req.params;
            const { status, reason } = req.body;

            if (!['ACTIVE', 'CANCELLED', 'REJECT_PAYMENT', 'REJECT_ENROLLMENT'].includes(status)) {
                return sendError(res, 'حالة غير صالحة. يجب أن تكون ACTIVE أو CANCELLED أو REJECT_PAYMENT أو REJECT_ENROLLMENT', 400);
            }

            const updated = await instituteService.updateEnrollmentStatus(req.user.userId, enrollmentId, status, reason);
            return sendSuccess(res, status === 'ACTIVE' ? 'تم قبول طلب التسجيل بنجاح' : 'تم رفض طلب التسجيل بنجاح', updated);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async getCourseById(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { id } = req.params;
            const course = await instituteService.getCourseById(req.user.userId, id);
            return sendSuccess(res, 'تم جلب تفاص�Š�„ الدورة بنجاح', course);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async updateCourse(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { id } = req.params;
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
                startDate: body.startDate && body.startDate !== '' ? body.startDate : undefined,
                endDate: body.endDate && body.endDate !== '' ? body.endDate : undefined,
                categoryId: body.categoryId || undefined,
                status: body.status || undefined,
                deliveryType: body.deliveryType || undefined,
                trainerId: body.trainerId || undefined,
                isFree: body.isFree === 'true' ? true : body.isFree === 'false' ? false : undefined,
                objectives: safeParseJSON(body.objectives, []),
                prerequisites: safeParseJSON(body.prerequisites, []),
                tags: safeParseJSON(body.tags, []),
                sessions: safeParseJSON(body.sessions, undefined),
                hallId: body.hallId || undefined,
                trainerIds: body.trainerIds !== undefined ? body.trainerIds : undefined,
            };

            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            if (files?.image?.[0]) {
                payload.image = `/uploads/${files.image[0].filename}`;
            } else if (req.file) {
                payload.image = `/uploads/${req.file.filename}`;
            }
            if (files?.paymentReceipt?.[0]) {
                payload.paymentReceiptPath = `/uploads/${files.paymentReceipt[0].filename}`;
            }

            const updatedCourse = await instituteService.updateCourse(req.user.userId, id, payload);
            return sendSuccess(res, 'تم تحديث الدورة بنجاح', updatedCourse);
        } catch (error: any) {
            console.error('[updateCourse] Error:', error);
            return sendError(res, error.message, 400);
        }
    }

    async getCategories(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            // Allow both INSTITUTE_ADMIN and TRAINER to get categories
            if (!req.user || (req.user.role !== 'INSTITUTE_ADMIN' && req.user.role !== 'TRAINER')) {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const categories = await instituteService.getCategories();
            return sendSuccess(res, 'تم جلب ا�„تص�†�Šفات بنجاح', categories);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async createCategory(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            // Allow both INSTITUTE_ADMIN and TRAINER to create categories
            if (!req.user || (req.user.role !== 'INSTITUTE_ADMIN' && req.user.role !== 'TRAINER')) {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { name } = req.body;
            const category = await instituteService.createCategory(name);
            return sendSuccess(res, 'تم إضافة ا�„تص�†�Šف بنجاح', category);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async createTag(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (!req.user || (req.user.role !== 'INSTITUTE_ADMIN' && req.user.role !== 'TRAINER')) {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { name } = req.body;
            const tag = await instituteService.createTag(name);
            return sendSuccess(res, 'تم إضافة الوسم بنجاح', tag);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async getHalls(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const halls = await instituteService.getInstituteHalls(req.user.userId);
            return sendSuccess(res, 'تم جلب القاعات بنجاح', halls);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async getHallAvailability(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (!req.user || (req.user.role !== 'INSTITUTE_ADMIN' && req.user.role !== 'STUDENT' && req.user.role !== 'TRAINER')) {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const dateStr = req.query.date as string | undefined;
            const hallId = req.params.hallId;

            let result;
            if (req.user.role === 'INSTITUTE_ADMIN') {
                // Institute admins do an ownership check
                result = await instituteService.getInstituteHallAvailability(req.user.userId, hallId, dateStr);
            } else {
                // Trainers and students just need availability � no ownership check
                result = await instituteService.getHallAvailabilityPublic(hallId, dateStr);
            }
            return sendSuccess(res, 'تم جلب الأوقات المتاحة للقاعة', result);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async addHall(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);

            const payload = { ...req.body };

            // Parse numbers
            if (payload.capacity) payload.capacity = Number(payload.capacity);
            if (payload.pricePerHour) payload.pricePerHour = Number(payload.pricePerHour);

            // Parse array if sent as JSON string
            if (typeof payload.facilities === 'string') {
                try { payload.facilities = JSON.parse(payload.facilities); } catch { /* ignore */ }
            }
            if (typeof payload.availability === 'string') {
                try { payload.availability = JSON.parse(payload.availability); } catch { /* ignore */ }
            }

            // Handle file upload
            if (req.file) {
                payload.image = `/uploads/${req.file.filename}`;
            }

            const data = await instituteService.addInstituteHall(req.user.userId, payload);
            return sendSuccess(res, 'تم إضافة القاعة بنجاح', data);
        } catch (error: any) { return sendError(res, error.message, 400); }
    }

    async validateHallUpdate(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const data = await instituteService.validateInstituteHallUpdate(req.user.userId, req.params.hallId, req.body);
            return sendSuccess(res, 'تم التحقق من التأثيرات', data);
        } catch (error: any) { return sendError(res, error.message, 400); }
    }

    async updateHall(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);

            const payload = { ...req.body };

            // Parse numbers
            if (payload.capacity) payload.capacity = Number(payload.capacity);
            if (payload.pricePerHour) payload.pricePerHour = Number(payload.pricePerHour);

            // Parse array if sent as JSON string
            if (typeof payload.facilities === 'string') {
                try { payload.facilities = JSON.parse(payload.facilities); } catch { /* ignore */ }
            }
            if (typeof payload.availability === 'string') {
                try { payload.availability = JSON.parse(payload.availability); } catch { /* ignore */ }
            }

            // Handle file upload
            if (req.file) {
                payload.image = `/uploads/${req.file.filename}`;
            }

            const data = await instituteService.updateInstituteHall(req.user.userId, req.params.hallId, payload);
            return sendSuccess(res, 'تم تحديث القاعة بنجاح', data);
        } catch (error: any) { return sendError(res, error.message, 400); }
    }

    async removeHall(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            await instituteService.removeInstituteHall(req.user.userId, req.params.hallId);
            return sendSuccess(res, 'تم حذف القاعة بنجاح', null);
        } catch (error: any) { return sendError(res, error.message, 400); }
    }

    async getRoomBookings(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const bookings = await instituteService.getInstituteRoomBookings(req.user.userId);
            return sendSuccess(res, 'تم جلب طلبات الحجز بنجاح', bookings);
        } catch (error: any) { return sendError(res, error.message, 400); }
    }

    async getDirectBookers(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const data = await instituteService.getDirectBookers(req.user.userId);
            return sendSuccess(res, 'تم جلب أصحاب الحجز المباشر بنجاح', data);
        } catch (error: any) { return sendError(res, error.message, 400); }
    }

    async updateRoomBookingStatus(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);

            const { status, notes, roomId } = req.body;
            if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
                return sendError(res, 'حالة غير صحيحة', 400);
            }

            const updatedBooking = await instituteService.updateRoomBookingStatus(
                req.user.userId,
                req.params.bookingId,
                { status, notes, adminId: req.user.userId, roomId }
            );
            return sendSuccess(res, 'تم تحديث حالة الطلب بنجاح', updatedBooking);
        } catch (error: any) { return sendError(res, error.message, 400); }
    }

    /**
     * Activate a PENDING_MINIMUM online course and notify all waiting students.
     */
    async activateCourse(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { id } = req.params;
            const data = await instituteService.activatePendingMinimumCourse(req.user.userId, id);
            return sendSuccess(res, 'تم تفع�Š�„ الدورة وإشعار الطلاب بنجاح', data);
        } catch (error: any) { return sendError(res, error.message, 400); }
    }

    async createCourse(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const payload = { ...req.body };
            
            // Normalize hallId properly
            if (!payload.hallId && req.body.hallId && req.body.hallId !== "undefined" && req.body.hallId.trim() !== "") {
                payload.hallId = req.body.hallId;
            } else if (payload.hallId === "undefined" || payload.hallId === "") {
                payload.hallId = undefined;
            }

            // Parse JSON fields from formData
            if (typeof payload.sessions === 'string') {
                try { payload.sessions = JSON.parse(payload.sessions); } catch (e) { }
            }
            if (typeof payload.objectives === 'string') {
                try { payload.objectives = JSON.parse(payload.objectives); } catch (e) { }
            }
            if (typeof payload.prerequisites === 'string') {
                try { payload.prerequisites = JSON.parse(payload.prerequisites); } catch (e) { }
            }
            if (typeof payload.tags === 'string') {
                try { payload.tags = JSON.parse(payload.tags); } catch (e) { }
            }
            // Parse trainerIds (new multi-trainer support)
            if (typeof payload.trainerIds === 'string') {
                try { payload.trainerIds = JSON.parse(payload.trainerIds); } catch (e) { }
            }
            if (payload.isFree === 'true') payload.isFree = true;
            if (payload.isFree === 'false') payload.isFree = false;

            // Handle file uploads (multer .fields() sets req.files)
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };

            if (files?.image?.[0]) {
                payload.image = `/uploads/${files.image[0].filename}`;
            }

            let paymentReceiptPath: string | undefined;
            if (files?.paymentReceipt?.[0]) {
                paymentReceiptPath = `/uploads/${files.paymentReceipt[0].filename}`;
            }

            const course = await instituteService.createCourse(req.user.userId, payload, paymentReceiptPath);
            return sendSuccess(res, 'تم إنشاء الدورة بنجاح', course);
        } catch (error: any) {
            console.error('Course Creation Error:', error);
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                require('fs').writeFileSync('debug_course.json', JSON.stringify({
                    message: error.message,
                    stack: error.stack,
                    payload: req.body
                }, null, 2));
            } catch (e) { }
            return sendError(res, error.message, 400);
        }
    }

    async getStudents(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const students = await instituteService.getInstituteStudents(req.user.userId);
            return sendSuccess(res, 'تم جلب الطلاب بنجاح', students);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async createStudentAnnouncement(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            console.log(`[Controller-Institute] Incoming Announcement Request from User: ${req.user?.userId}`);
            console.log(`[Controller-Institute] Payload:`, req.body);

            if (req.user?.role !== 'INSTITUTE_ADMIN') {
                console.warn(`[Controller-Institute] Unauthorized access attempt by ${req.user?.role}`);
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { title, message, recipientId, recipientIds, courseId, category, status, scheduledAt, targetAudience } = req.body;
            if (!title || !message) {
                return sendError(res, 'عنوان ومحتوى الإعلان مطلوبان', 400);
            }
            
            const announcement = await instituteService.createStudentAnnouncement(
                req.user.userId, 
                { title, message, recipientId, recipientIds, courseId, category, status, scheduledAt, targetAudience }
            );

            console.log(`[Controller-Institute] SUCCESS: Announcement created with ID: ${announcement?.id}`);

            return sendSuccess(res, 'تم إرسال الإعلان بنجاح', announcement);
        } catch (error: any) {
            console.error(`[Controller-Institute] CRITICAL ERROR:`, error.message);
            return sendError(res, error.message, 400);
        }
    }

    async getAnnouncements(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const data = await instituteService.getAnnouncements(req.user.userId);
            return sendSuccess(res, 'تم جلب الإعلانات بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async updateAnnouncement(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { id } = req.params;
            const { title, message } = req.body;
            const data = await instituteService.updateAnnouncement(req.user.userId, id, { title, message });
            return sendSuccess(res, 'تم تحديث الإعلان بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async deleteAnnouncement(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { id } = req.params;
            await instituteService.deleteAnnouncement(req.user.userId, id);
            return sendSuccess(res, 'تم حذف الإعلان بنجاح', null);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async getStaff(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const data = await instituteService.getInstituteStaff(req.user.userId);
            return sendSuccess(res, 'تم جلب الطاقم بنجاح', data);
        } catch (error: any) { return sendError(res, error.message, 400); }
    }

    async addStaff(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const payload = { ...req.body };
            if (req.file) {
                payload.avatar = `/uploads/${req.file.filename}`;
            }
            const data = await instituteService.addInstituteStaff(req.user.userId, payload);
            return sendSuccess(res, 'تمت إضافة عضو الطاقم بنجاح', data, 201);
        } catch (error: any) { return sendError(res, error.message, 400); }
    }

    async removeStaff(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            await instituteService.removeInstituteStaff(req.user.userId, req.params.staffId);
            return sendSuccess(res, 'تم إزالة عضو الطاقم بنجاح', null);
        } catch (error: any) { return sendError(res, error.message, 400); }
    }

    async updateStaffStatus(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const data = await instituteService.updateInstituteStaffStatus(req.user.userId, req.params.staffId, req.body.status);
            return sendSuccess(res, 'تم تحديث حالة عضو الطاقم', data);
        } catch (error: any) { return sendError(res, error.message, 400); }
    }

    async updateStaff(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const payload = { ...req.body };
            if (req.file) {
                payload.avatar = `/uploads/${req.file.filename}`;
            }
            const data = await instituteService.updateInstituteStaff(req.user.userId, req.params.staffId, payload);
            return sendSuccess(res, 'تم تحديث بيانات المدرب', data);
        } catch (error: any) { return sendError(res, error.message, 400); }
    }

    async getSchedule(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const data = await instituteService.getSchedule(req.user.userId);
            return sendSuccess(res, 'تم جلب الجدول بنجاح', data);
        } catch (error: any) { return sendError(res, error.message, 400); }
    }

    async updateSession(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'INSTITUTE_ADMIN') return sendError(res, 'غير مصرح لك بالوصول', 403);
            const { sessionId } = req.params;
            const { startTime, endTime, status, meetingLink, reason } = req.body;
            const data = {
                ...(startTime && { startTime: new Date(startTime) }),
                ...(endTime && { endTime: new Date(endTime) }),
                ...(status && { status }),
                ...(meetingLink !== undefined && { meetingLink }),
                ...(reason !== undefined && { reason }),
            };
            const updated = await instituteService.updateSession(req.user.userId, sessionId, data);
            return sendSuccess(res, 'تم تحديث الجلسة بنجاح', updated);
        } catch (error: any) { return sendError(res, error.message, 400); }
    }

    async getPublicInstitutes(req: any, res: Response, _next: NextFunction) {
        try {
            const data = await instituteService.getPublicInstitutes();
            return sendSuccess(res, 'تم جلب المعاهد بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async getPublicInstituteById(req: any, res: Response, _next: NextFunction) {
        try {
            const { id } = req.params;
            const data = await instituteService.getPublicInstituteById(id);
            return sendSuccess(res, 'تم جلب بيانات المعهد بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 404); // Using 404 for not found
        }
    }
}

export default new InstituteController();

