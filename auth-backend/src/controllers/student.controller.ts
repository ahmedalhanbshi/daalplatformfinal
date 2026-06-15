/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import studentService from '../services/student.service';
import { sendError, sendSuccess } from '../utils/response';

const canUseLearnerEnrollment = (role?: string) => role === 'STUDENT' || role === 'TRAINER';

class StudentController {
    /**
     * Get dashboard data for the authenticated student
     */
    async getDashboard(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'STUDENT') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const data = await studentService.getDashboard(req.user.userId);
            return sendSuccess(res, 'تم جلب بيانات لوحة التحكم بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Get all courses for the authenticated student
     */
    async getMyCourses(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'STUDENT') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const data = await studentService.getMyCourses(req.user.userId);
            return sendSuccess(res, 'تم جلب دوراتي بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Get the student's schedule (upcoming and past sessions)
     */
    async getSchedule(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'STUDENT') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const data = await studentService.getSchedule(req.user.userId);
            return sendSuccess(res, 'تم جلب الجدول بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Get the student's enrollment status for a specific course
     */
    async getEnrollmentStatus(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (!canUseLearnerEnrollment(req.user?.role)) {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { courseId } = req.params;
            const data = await studentService.getEnrollmentStatus(req.user.userId, courseId);
            return sendSuccess(res, 'تم جلب حالة التسجيل بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Get certificate data for an enrollment
     */
    async getEnrollmentCertificateData(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (!canUseLearnerEnrollment(req.user?.role)) {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { enrollmentId } = req.params;
            const data = await studentService.getEnrollmentCertificateData(req.user.userId, enrollmentId);
            return sendSuccess(res, 'تم جلب بيانات الشهادة بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Pre-register for a course
     */
    async preRegisterCourse(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (!canUseLearnerEnrollment(req.user?.role)) {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { courseId } = req.params;
            const { fullName, email, phone } = req.body;

            if (!fullName || !email || !phone) {
                return sendError(res, 'جميع الحقول مطلوبة', 400);
            }

            const data = await studentService.preRegisterCourse(req.user.userId, courseId, fullName, email, phone);
            return sendSuccess(res, 'تم إرسال طلب التسجيل بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Upload payment proof for a course enrollment
     */
    async submitPaymentProof(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (!canUseLearnerEnrollment(req.user?.role)) {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { courseId } = req.params;
            const file = req.file;

            if (!file) {
                return sendError(res, 'يرجى إرفا�‚ صورة السند', 400);
            }

            // Convert local file path to URL accessible path
            const imagePath = `/uploads/${file.filename}`;

            const data = await studentService.submitPaymentProof(req.user.userId, courseId, imagePath);
            return sendSuccess(res, 'تم رفع سند ا�„دفع بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Get detailed information for a specific course for the authenticated student
     */
    async getCourseDetails(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'STUDENT') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { id } = req.params;
            const data = await studentService.getCourseDetails(req.user.userId, id);
            return sendSuccess(res, 'تم جلب تفاص�Š�„ الدورة بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Get the student's wishlist
     */
    async getWishlist(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'STUDENT') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const data = await studentService.getWishlist(req.user.userId);
            return sendSuccess(res, 'تم جلب قائمة الرغبات بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Remove from wishlist
     */
    async removeFromWishlist(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'STUDENT') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { courseId } = req.params;
            await studentService.removeFromWishlist(req.user.userId, courseId);
            return sendSuccess(res, 'تم إزالة الدورة من قائمة الرغبات بنجاح');
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Toggle wishlist (add/remove)
     */
    async toggleWishlist(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'STUDENT') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { courseId } = req.params;
            const result = await studentService.toggleWishlist(req.user.userId, courseId);
            const message = result.added ? 'تم إضافة الدورة إلى قائمة الرغبات' : 'تم إزالة الدورة من قائمة الرغبات';
            return sendSuccess(res, message, result);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Get public hall details by ID
     */
    async getHallById(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (req.user?.role !== 'STUDENT') {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { hallId } = req.params;
            const data = await studentService.getHallById(hallId);
            return sendSuccess(res, 'تم جلب تفاص�Š�„ القاعة بنجاح', data);
        } catch (error: any) {
            return sendError(res, error.message, 404);
        }
    }

    /**
     * Cancel an enrollment
     */
    async cancelEnrollment(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (!canUseLearnerEnrollment(req.user?.role)) {
                return sendError(res, 'غير مصرح لك بالوصول', 403);
            }
            const { enrollmentId } = req.params;
            await studentService.cancelEnrollment(req.user.userId, enrollmentId);
            return sendSuccess(res, 'تم إلغاء التسجيل بنجاح');
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }
}

export default new StudentController();

