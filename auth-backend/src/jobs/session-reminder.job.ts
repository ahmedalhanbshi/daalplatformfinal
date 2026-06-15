import cron from 'node-cron';
import prisma from '../config/database';
import notificationService from '../services/notification.service';
import { mailerService } from '../services/mailer.service';
import { whatsAppService } from '../services/whatsapp.service';

/**
 * Session Reminder Job
 * Runs every 30 minutes and sends reminders to students
 * whose sessions start in the next 60�90 minutes (to avoid duplicate sends).
 */
export function startSessionReminderJob() {
    cron.schedule('*/30 * * * *', async () => {
        console.log('[Cron] Running session reminder check...');

        const now = new Date();
        // Window: sessions starting between 60 and 90 minutes from now
        const from = new Date(now.getTime() + 60 * 60 * 1000);   // +60 min
        const to   = new Date(now.getTime() + 90 * 60 * 1000);   // +90 min

        try {
            // Find all SCHEDULED sessions starting within the window
            const sessions = await prisma.session.findMany({
                where: {
                    status: 'SCHEDULED',
                    startTime: { gte: from, lte: to },
                },
                include: {
                    course: {
                        select: {
                            id: true,
                            title: true,
                            enrollments: {
                                where: { status: 'ACTIVE', deletedAt: null },
                                include: {
                                    student: {
                                        select: { id: true, name: true, email: true, phone: true },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            for (const session of sessions) {
                if (!session.course) continue;
                const topic = session.topic || 'جلسة تدريبية';
                const courseTitle = session.course.title;

                for (const enrollment of session.course.enrollments) {
                    const student = enrollment.student;
                    try {
                        await notificationService.createNotification({
                            userId: student.id,
                            type: 'SESSION_REMINDER',
                            title: 'تذكير بالجلسة القادمة',
                            message: `جلستك "${topic}" في دورة "${courseTitle}" تبدأ بعد ساعة تقريباً.`,
                            relatedEntityId: session.id,
                            actionUrl: '/student/courses',
                            emailFn: student.email
                                ? () => mailerService.sendSessionReminder(student.email!, student.name, courseTitle, topic, session.startTime)
                                : undefined,
                            whaFn: student.phone
                                ? () => whatsAppService.notifySessionReminder(student.phone!, student.name, courseTitle, topic, session.startTime)
                                : undefined,
                        });
                    } catch (err) {
                        console.error(`[Cron] Failed to notify student ${student.id}:`, err);
                    }
                }
            }

            if (sessions.length > 0) {
                console.log(`[Cron] Sent session reminders for ${sessions.length} session(s).`);
            }
        } catch (err) {
            console.error('[Cron] Session reminder job error:', err);
        }
    });

    console.log('[Cron] Session reminder job registered (every 30 min).');
}
