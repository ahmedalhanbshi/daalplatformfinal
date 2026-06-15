import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { upload } from '../middleware/upload';
import multer from 'multer';
import studentController from '../controllers/student.controller';

const router = Router();

// Dashboard data
router.get('/dashboard', authenticate, studentController.getDashboard);

// My Courses
router.get('/my-courses', authenticate, studentController.getMyCourses);

// Schedule
router.get('/schedule', authenticate, studentController.getSchedule);

// Enrollment Status & Certificate
router.get('/courses/:courseId/enrollment-status', authenticate, studentController.getEnrollmentStatus);
router.get('/enrollments/:enrollmentId/certificate', authenticate, studentController.getEnrollmentCertificateData);

// Course Details
router.get('/courses/:id', authenticate, studentController.getCourseDetails);

// Halls
router.get('/halls/:hallId', authenticate, studentController.getHallById);

// Wishlist
router.get('/wishlist', authenticate, studentController.getWishlist);
router.delete('/wishlist/:courseId', authenticate, studentController.removeFromWishlist);
router.post('/wishlist/:courseId/toggle', authenticate, studentController.toggleWishlist);

// Pre-registration
router.post('/courses/:courseId/pre-register', authenticate, studentController.preRegisterCourse);

// Payment proof submission
router.post(
    '/courses/:courseId/payment-proof',
    authenticate,
    (req: Request, res: Response, next: NextFunction): void => {
        upload.single('paymentReceipt')(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                res.status(400).json({ success: false, message: `خطأ في رفع الملف: ${err.message}` });
                return;
            } else if (err) {
                res.status(400).json({ success: false, message: err.message || 'حدث خطأ أثناء رفع الملف' });
                return;
            }
            next();
        });
    },
    studentController.submitPaymentProof
);

// Enrollment Cancellation
router.post('/enrollments/:enrollmentId/cancel', authenticate, studentController.cancelEnrollment);

export default router;

