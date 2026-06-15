import prisma from '../config/database';

/**
 * Automatically marks sessions as COMPLETED when their end time has passed.
 */
async function autoCompleteSessions() {
    try {
        const now = new Date();
        const result = await prisma.session.updateMany({
            where: {
                status: { in: ['SCHEDULED', 'POSTPONED'] },
                endTime: { lt: now },
            },
            data: { status: 'COMPLETED' },
        });

        if (result.count > 0) {
            console.log(`[Scheduler] ✅ Auto-completed ${result.count} session(s) at ${now.toISOString()}`);
        }
    } catch (err) {
        console.error('[Scheduler] Failed to auto-complete sessions:', err);
    }
}

/**
 * Automatically marks courses as COMPLETED when their endDate has passed.
 */
async function autoCompleteCourses() {
    try {
        const now = new Date();
        const result = await prisma.course.updateMany({
            where: {
                status: { in: ['ACTIVE', 'PENDING_REVIEW'] },
                endDate: { lt: now },
            },
            data: { status: 'COMPLETED' },
        });

        if (result.count > 0) {
            console.log(`[Scheduler] ✅ Auto-completed ${result.count} course(s) at ${now.toISOString()}`);
        }
    } catch (err) {
        console.error('[Scheduler] Failed to auto-complete courses:', err);
    }
}

/**
 * Automatically marks enrollments as COMPLETED when their course is COMPLETED.
 * Only targets ACTIVE enrollments (students who completed registration).
 */
async function autoCompleteEnrollments() {
    try {
        const now = new Date();
        const result = await prisma.enrollment.updateMany({
            where: {
                status: 'ACTIVE',
                deletedAt: null,
                course: {
                    status: 'COMPLETED'
                }
            },
            data: { status: 'COMPLETED' },
        });

        if (result.count > 0) {
            console.log(`[Scheduler] ✅ Auto-completed ${result.count} enrollment(s) at ${now.toISOString()}`);
        }
    } catch (err) {
        console.error('[Scheduler] Failed to auto-complete enrollments:', err);
    }
}

export function startSessionScheduler() {
    console.log('[Scheduler] Auto-complete scheduler started (runs every minute)');
    // Run immediately on startup
    autoCompleteSessions();
    autoCompleteCourses();
    autoCompleteEnrollments();
    // Then run every 60 seconds
    setInterval(autoCompleteSessions, 60 * 1000);
    setInterval(autoCompleteCourses, 60 * 1000);
    setInterval(autoCompleteEnrollments, 60 * 1000);
}

