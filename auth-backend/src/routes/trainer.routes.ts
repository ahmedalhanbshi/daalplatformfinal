import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { upload } from '../middleware/upload';
import trainerController from '../controllers/trainer.controller';
import multer from 'multer';

const router = Router();

// Explore (public course catalog)
router.get('/explore', trainerController.getExploreCourses);
router.get('/explore/:courseId', trainerController.getPublicCourseById);

// All trainer routes require authentication
router.use(authenticate);

// Dashboard
router.get('/dashboard', trainerController.getDashboard);

// Schedule
router.get('/schedule', trainerController.getSchedule);

// Categories
router.get('/categories', trainerController.getCategories);
router.post('/categories', trainerController.createCategory);
router.post('/tags', trainerController.createTag);


// Halls
router.get('/halls', trainerController.getHalls);
router.get('/halls/:hallId', trainerController.getHallById);
router.get('/halls/:hallId/availability', trainerController.getHallAvailability);
router.post(
    '/halls/:hallId/book',
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
    trainerController.bookHall
);

// Courses
router.get('/courses', trainerController.getCourses);
router.get('/courses/:courseId', trainerController.getTrainerCourseById);
router.put(
    '/courses/:courseId',
    (req: Request, res: Response, next: NextFunction): void => {
        upload.fields([
            { name: 'image', maxCount: 1 },
            { name: 'paymentReceipt', maxCount: 1 },
        ])(req, res, (err) => {
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
    trainerController.updateTrainerCourse
);
router.delete('/courses/:courseId', trainerController.deleteCourse);
router.get('/courses/:courseId/students', trainerController.getCourseStudents);
router.patch('/courses/:courseId/students/:enrollmentId/unenroll', trainerController.unenrollStudent);
router.patch('/courses/:courseId/activate', trainerController.activateCourse);

// Multer wrapper that converts multer errors into 400 responses instead of 500
const uploadFields = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'paymentReceipt', maxCount: 1 }
]);

router.post(
    '/courses',
    (req: Request, res: Response, next: NextFunction): void => {
        return uploadFields(req, res, (err) => {
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
    trainerController.createCourse
);

// Trainer Profile
router.get('/profile', trainerController.getProfile);
router.patch(
    '/profile',
    (req: Request, res: Response, next: NextFunction): void => {
        return upload.fields([{ name: 'avatar', maxCount: 1 }])(req, res, (err) => {
            if (err) {
                res.status(400).json({ success: false, message: err.message || 'خطأ في رفع الصورة' });
                return;
            }
            next();
        });
    },
    trainerController.updateProfile
);
// All students across all of this trainer's courses
router.get('/students', trainerController.getAllStudents);

// Announcements
router.post('/announcements/send', trainerController.createStudentAnnouncement);
router.get('/announcements', trainerController.getAnnouncements);
router.put('/announcements/:id', trainerController.updateAnnouncement);
router.delete('/announcements/:id', trainerController.deleteAnnouncement);

// Enrollments management
router.get('/enrollments', trainerController.getEnrollments);
router.patch('/enrollments/:enrollmentId/status', trainerController.updateEnrollmentStatus);

// Room Bookings
router.get('/bookings', trainerController.getRoomBookings);
router.post(
    '/courses/:courseId/bookings/:bookingId/resubmit',
    (req: Request, res: Response, next: NextFunction): void => {
        upload.fields([{ name: 'paymentReceipt', maxCount: 1 }])(req, res, (err) => {
            if (err) {
                res.status(400).json({ success: false, message: err.message });
                return;
            }
            next();
        });
    },
    trainerController.resubmitBookingPayment
);

// Cancel Room Booking linked to a course (also cancels course)
router.delete('/courses/:courseId/bookings/:bookingId', trainerController.cancelBooking);

// Cancel a direct Room Booking (not linked to any course)
router.delete('/bookings/:bookingId', trainerController.cancelDirectBooking);

// Session Management
router.patch('/sessions/:sessionId', trainerController.updateSession);

// Trainer Bank Accounts
router.get('/bank-accounts', trainerController.getBankAccounts);
router.post('/bank-accounts', trainerController.addBankAccount);
router.patch('/bank-accounts/:accountId', trainerController.updateBankAccount);
router.delete('/bank-accounts/:accountId', trainerController.deleteBankAccount);

export default router;
