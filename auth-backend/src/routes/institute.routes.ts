import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { upload } from '../middleware/upload';
import instituteController from '../controllers/institute.controller';

const router = Router();

// All institute routes require authentication
router.use(authenticate);

// Dashboard
router.get('/dashboard', instituteController.getDashboard);

// Profile
router.get('/profile', instituteController.getProfile);
router.put(
  '/profile',
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'logo', maxCount: 1 },
    { name: 'licenseDocument', maxCount: 1 },
  ]),
  instituteController.updateProfile
);

// Bank Accounts
router.get('/bank-accounts', instituteController.getBankAccounts);
router.post('/bank-accounts', instituteController.addBankAccount);
router.patch('/bank-accounts/:accountId', instituteController.updateBankAccount);
router.delete('/bank-accounts/:accountId', instituteController.deleteBankAccount);

// Course management
router.get('/courses', instituteController.getCourses);
router.post('/courses', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'paymentReceipt', maxCount: 1 }]), instituteController.createCourse);
router.delete('/courses/:id', instituteController.deleteCourse);
router.put('/courses/:id/trainer', instituteController.changeTrainer);

// Halls
router.get('/halls', instituteController.getHalls);
router.get('/halls/:hallId/availability', instituteController.getHallAvailability);
router.post('/halls', upload.single('image'), instituteController.addHall);
router.post('/halls/:hallId/validate-update', instituteController.validateHallUpdate);
router.patch('/halls/:hallId', upload.single('image'), instituteController.updateHall);
router.delete('/halls/:hallId', instituteController.removeHall);

// Room Bookings
router.get('/halls/bookings', instituteController.getRoomBookings);
router.get('/halls/direct-bookers', instituteController.getDirectBookers);
router.patch('/halls/bookings/:bookingId/status', instituteController.updateRoomBookingStatus);


// Trainers
router.get('/trainers', instituteController.getTrainers);

// Course students
// Course Students
router.get('/courses/:id/students', instituteController.getCourseStudents);
router.put('/courses/:id/students/:enrollmentId/unenroll', instituteController.unenrollStudent);

// Course Details & Edit
router.get('/courses/:id', instituteController.getCourseById);
router.put('/courses/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'paymentReceipt', maxCount: 1 }]), instituteController.updateCourse);
router.patch('/courses/:id/activate', instituteController.activateCourse);

// Metadata
router.get('/categories', instituteController.getCategories);
router.post('/categories', instituteController.createCategory);
router.post('/tags', instituteController.createTag);

// Students & Enrollments
router.get('/students', instituteController.getStudents);
router.post('/announcements/send', instituteController.createStudentAnnouncement);
router.get('/announcements', instituteController.getAnnouncements);
router.put('/announcements/:id', instituteController.updateAnnouncement);
router.delete('/announcements/:id', instituteController.deleteAnnouncement);
router.get('/enrollments', instituteController.getEnrollments);
router.patch('/enrollments/:enrollmentId/status', instituteController.updateEnrollmentStatus);

// Staff (institute-scoped, uses InstituteStaff model)
router.get('/staff', instituteController.getStaff);
router.post('/staff', upload.single('avatar'), instituteController.addStaff);
router.patch('/staff/:staffId', upload.single('avatar'), instituteController.updateStaff);
router.delete('/staff/:staffId', instituteController.removeStaff);
router.patch('/staff/:staffId/status', instituteController.updateStaffStatus);

// Schedule
router.get('/schedule', instituteController.getSchedule);
router.patch('/sessions/:sessionId', instituteController.updateSession);

export default router;
