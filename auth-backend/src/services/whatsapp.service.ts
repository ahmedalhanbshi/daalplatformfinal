import twilio from 'twilio';

class WhatsAppService {
    private client: ReturnType<typeof twilio> | null = null;
    private from: string = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

    private getClient() {
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
        if (!this.client) {
            this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        }
        return this.client;
    }

    private formatTo(phone: string): string {
        // Ensure phone number is in whatsapp: format
        const clean = phone.replace(/\D/g, '');
        return `whatsapp:+${clean.startsWith('00') ? clean.slice(2) : clean}`;
    }

    async send(to: string, message: string): Promise<void> {
        const client = this.getClient();
        if (!client) return; // silently skip if unconfigured
        if (!to || to.length < 5) return;
        try {
            await client.messages.create({
                from: this.from,
                to: this.formatTo(to),
                body: message,
            });
        } catch (err) {
            console.error('[WhatsApp] Failed to send message:', err);
        }
    }

    // ── Enrollment ─────────────────────────────────────────────────
    async notifyEnrollmentPreliminaryAccepted(phone: string, studentName: string, courseTitle: string) {
        await this.send(phone, `✅ مرحباً ${studentName}،\n\nتم قبولك مبدئياً في دورة "${courseTitle}".\n\nالخطوة التالية: إرفاق سند الدفع لإتمام التسجيل.\n\n� منصة الدورات`);
    }

    async notifyEnrollmentFinalAccepted(phone: string, studentName: string, courseTitle: string) {
        await this.send(phone, `🎓 تهانينا ${studentName}!\n\nتم قبول تسجيلك نهائياً في دورة "${courseTitle}".\n\nيمكنك الآن الوصول إلى جميع محتويات الدورة.\n\n� منصة الدورات`);
    }

    async notifyEnrollmentRejected(phone: string, studentName: string, courseTitle: string, reason?: string, isCancellation: boolean = false) {
        const actionText = isCancellation ? 'تم إلغاء تسجيلك في' : 'تم رفض تسجيلك في';
        const msg = reason
            ? `مرحباً ${studentName}،\n\n${actionText} دورة "${courseTitle}".\nالسبب: ${reason}\n\n- فريق المنصة`
            : `مرحباً ${studentName}،\n\n${actionText} دورة "${courseTitle}".\n\n- فريق المنصة`;
        await this.send(phone, msg);
    }

    async notifyPaymentApproved(phone: string, studentName: string, courseTitle: string) {
        await this.send(phone, `💳 مرحباً ${studentName}،\n\nتم قبول دفعتك ✅ لدورة "${courseTitle}".\n\nتسجيلك مكتمل الآن. حظاً موفقاً!\n\n� منصة الدورات`);
    }

    async notifyPaymentRejected(phone: string, studentName: string, courseTitle: string, reason?: string) {
        const msg = reason
            ? `⚠️ مرحباً ${studentName}،\n\nتم رفض سند الدفع لدورة "${courseTitle}".\nالسبب: ${reason}\n\nيرجى إعادة رفع الإيصال.\n\n� منصة الدورات`
            : `⚠️ مرحباً ${studentName}،\n\nتم رفض سند الدفع لدورة "${courseTitle}".\n\nيرجى إعادة رفع الإيصال الصحيح.\n\n� منصة الدورات`;
        await this.send(phone, msg);
    }

    async notifySessionReminder(phone: string, studentName: string, courseTitle: string, sessionTopic: string, startTime: Date) {
        const timeStr = startTime.toLocaleString('ar-SA-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' });
        await this.send(phone, `⏰ تذكير ${studentName}!\n\nجلستك "${sessionTopic}" في دورة "${courseTitle}" تبدأ بعد ساعة واحدة.\n📅 ${timeStr}\n\nكن مستعداً!\n\n� منصة الدورات`);
    }

    async notifyNewEnrollmentRequest(phone: string, trainerName: string, studentName: string, courseTitle: string) {
        await this.send(phone, `📝 مرحباً ${trainerName}،\n\nطلب جديد للتسجيل في دورتك "${courseTitle}" من الطالب ${studentName}.\n\nيرجى مراجعة الطلب والرد عليه.\n\n� منصة الدورات`);
    }

    async notifyPaymentReceiptSubmitted(phone: string, recipientName: string, studentName: string, courseTitle: string) {
        await this.send(phone, `💰 مرحباً ${recipientName}،\n\nأرفق الطالب ${studentName} إيصال دفع لدورة "${courseTitle}".\n\nيرجى المراجعة والتحقق منه.\n\n� منصة الدورات`);
    }

    async notifyAccountApproved(phone: string, name: string, role: string) {
        await this.send(phone, `✅ مرحباً ${name}،\n\nيسعدنا إخبارك بأنه تم قبول حسابك كـ${role} في منصتنا.\n\nيمكنك تسجيل الدخول والبدء الآن!\n\n� منصة الدورات`);
    }

    async notifyAccountRejected(phone: string, name: string, role: string, reason?: string) {
        const msg = reason
            ? `❌ مرحباً ${name}،\n\nنأسف، تم رفض طلبك كـ${role}.\nالسبب: ${reason}\n\n� منصة الدورات`
            : `❌ مرحباً ${name}،\n\nنأسف، تم رفض طلبك كـ${role}.\n\n� منصة الدورات`;
        await this.send(phone, msg);
    }

    async notifyNewBookingRequest(phone: string, instituteName: string, trainerName: string, roomName: string) {
        await this.send(phone, `🏛️ مرحباً ${instituteName}،\n\nطلب المدرب ${trainerName} حجز قاعة "${roomName}".\n\nيرجى مراجعة الطلب والرد عليه.\n\n� منصة الدورات`);
    }

    async notifyBookingApproved(phone: string, recipientName: string, roomName: string) {
        await this.send(phone, `✅ مرحباً ${recipientName}،\n\nتم قبول حجزك لقاعة "${roomName}".\n\n� منصة الدورات`);
    }

    async notifyBookingRejected(phone: string, recipientName: string, roomName: string, reason?: string) {
        const msg = reason
            ? `❌ مرحباً ${recipientName}،\n\nتم رفض حجزك لقاعة "${roomName}".\nالسبب: ${reason}\n\n� منصة الدورات`
            : `❌ مرحباً ${recipientName}،\n\nتم رفض حجزك لقاعة "${roomName}".\n\n� منصة الدورات`;
        await this.send(phone, msg);
    }

    // ── Session Change Notifications ───────────────────────────────

    async notifySessionUpdated(
        phone: string,
        studentName: string,
        courseTitle: string,
        changes: { oldStart?: Date; newStart?: Date; topic?: string },
        reason?: string,
    ) {
        const fmt = (d?: Date) =>
            d ? d.toLocaleString('ar-SA-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }) : '�';

        const topicPart = changes.topic ? `\nالجلسة: "${changes.topic}"` : '';
        const reasonPart = reason ? `\n📝 السبب: ${reason}` : '';

        await this.send(phone,
            `📅 تعديل موعد جلسة � ${studentName}\n\nدورة: "${courseTitle}"${topicPart}\n\n⏱️ القديم: ${fmt(changes.oldStart)}\n🆕 الجديد: ${fmt(changes.newStart)}${reasonPart}\n\n� منصة الدورات`
        );
    }

    async notifySessionsRescheduled(
        phone: string,
        studentName: string,
        courseTitle: string,
        sessionsCount: number,
        reason?: string,
    ) {
        const reasonPart = reason ? `\n📝 السبب: ${reason}` : '';
        await this.send(phone,
            `🗓️ تحديث الجدول الدراسي � ${studentName}\n\nتم تحديث جدول دورة "${courseTitle}" بالكامل.\nعدد الجلسات الجديدة: ${sessionsCount} جلسة${reasonPart}\n\nيرجى مراجعة الجدول الجديد في المنصة.\n\n� منصة الدورات`
        );
    }

    async notifySessionCancelled(
        phone: string,
        studentName: string,
        courseTitle: string,
        topic: string | undefined,
        reason?: string,
    ) {
        const topicPart = topic ? `\nالجلسة: "${topic}"` : '';
        const reasonPart = reason ? `\n📝 السبب: ${reason}` : '';

        await this.send(phone,
            `❌ إلغاء جلسة � ${studentName}\n\nتم إلغاء إحدى جلسات دورة "${courseTitle}"${topicPart}${reasonPart}\n\nيرجى تحديث جدولك.\n\n� منصة الدورات`
        );
    }
}

export const whatsAppService = new WhatsAppService();
