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
        const clean = phone.replace(/\D/g, '');
        return `whatsapp:+${clean.startsWith('00') ? clean.slice(2) : clean}`;
    }

    async send(to: string, message: string): Promise<void> {
        const client = this.getClient();
        if (!client) return;
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

    async notifyEnrollmentPreliminaryAccepted(phone: string, studentName: string, courseTitle: string) {
        await this.send(phone, `✅ مرحباً ${studentName}،

تم قبولك مبدئياً في دورة "${courseTitle}".

الخطوة التالية: إرفاق سند الدفع لإتمام التسجيل.

-- منصة الدورات`);
    }

    async notifyEnrollmentFinalAccepted(phone: string, studentName: string, courseTitle: string) {
        await this.send(phone, `🎓 تهانينا ${studentName}!

تم قبول تسجيلك نهائياً في دورة "${courseTitle}".

يمكنك الآن الوصول إلى جميع محتويات الدورة.

-- منصة الدورات`);
    }

    async notifyEnrollmentRejected(phone: string, studentName: string, courseTitle: string, reason?: string, isCancellation: boolean = false) {
        const actionText = isCancellation ? 'تم إلغاء تسجيلك في' : 'تم رفض تسجيلك في';
        const msg = reason
            ? `مرحباً ${studentName}،

${actionText} دورة "${courseTitle}".
السبب: ${reason}

-- فريق المنصة`
            : `مرحباً ${studentName}،

${actionText} دورة "${courseTitle}".

-- فريق المنصة`;
        await this.send(phone, msg);
    }

    async notifyPaymentApproved(phone: string, studentName: string, courseTitle: string) {
        await this.send(phone, `💳 مرحباً ${studentName}،

تم قبول دفعتك ✅ لدورة "${courseTitle}".

تسجيلك مكتمل الآن. حظاً موفقاً!

-- منصة الدورات`);
    }

    async notifyPaymentRejected(phone: string, studentName: string, courseTitle: string, reason?: string) {
        const msg = reason
            ? `⚠️ مرحباً ${studentName}،

تم رفض سند الدفع لدورة "${courseTitle}".
السبب: ${reason}

يرجى إعادة رفع الإيصال.

-- منصة الدورات`
            : `⚠️ مرحباً ${studentName}،

تم رفض سند الدفع لدورة "${courseTitle}".

يرجى إعادة رفع الإيصال الصحيح.

-- منصة الدورات`;
        await this.send(phone, msg);
    }

    async notifySessionReminder(phone: string, studentName: string, courseTitle: string, sessionTopic: string, startTime: Date) {
        const timeStr = startTime.toLocaleString('ar-SA-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' });
        await this.send(phone, `⏰ تذكير ${studentName}!

جلستك "${sessionTopic}" في دورة "${courseTitle}" تبدأ بعد ساعة واحدة.
📅 ${timeStr}

كن مستعداً!

-- منصة الدورات`);
    }

    async notifyNewEnrollmentRequest(phone: string, trainerName: string, studentName: string, courseTitle: string) {
        await this.send(phone, `📝 مرحباً ${trainerName}،

طلب جديد للتسجيل في دورتك "${courseTitle}" من الطالب ${studentName}.

يرجى مراجعة الطلب والرد عليه.

-- منصة الدورات`);
    }

    async notifyPaymentReceiptSubmitted(phone: string, recipientName: string, studentName: string, courseTitle: string) {
        await this.send(phone, `💰 مرحباً ${recipientName}،

أرفق الطالب ${studentName} إيصال دفع لدورة "${courseTitle}".

يرجى المراجعة والتحقق منه.

-- منصة الدورات`);
    }

    async notifyAccountApproved(phone: string, name: string, role: string) {
        await this.send(phone, `✅ مرحباً ${name}،

يسعدنا إخبارك بأنه تم قبول حسابك كـ${role} في منصتنا.

يمكنك تسجيل الدخول والبدء الآن!

-- منصة الدورات`);
    }

    async notifyAccountRejected(phone: string, name: string, role: string, reason?: string) {
        const msg = reason
            ? `❌ مرحباً ${name}،

نأسف، تم رفض طلبك كـ${role}.
السبب: ${reason}

-- منصة الدورات`
            : `❌ مرحباً ${name}،

نأسف، تم رفض طلبك كـ${role}.

-- منصة الدورات`;
        await this.send(phone, msg);
    }

    async notifyNewBookingRequest(phone: string, instituteName: string, trainerName: string, roomName: string) {
        await this.send(phone, `🏛️ مرحباً ${instituteName}،

طلب المدرب ${trainerName} حجز قاعة "${roomName}".

يرجى مراجعة الطلب والرد عليه.

-- منصة الدورات`);
    }

    async notifyBookingApproved(phone: string, recipientName: string, roomName: string) {
        await this.send(phone, `✅ مرحباً ${recipientName}،

تم قبول حجزك لقاعة "${roomName}".

-- منصة الدورات`);
    }

    async notifyBookingRejected(phone: string, recipientName: string, roomName: string, reason?: string) {
        const msg = reason
            ? `❌ مرحباً ${recipientName}،

تم رفض حجزك لقاعة "${roomName}".
السبب: ${reason}

-- منصة الدورات`
            : `❌ مرحباً ${recipientName}،

تم رفض حجزك لقاعة "${roomName}".

-- منصة الدورات`;
        await this.send(phone, msg);
    }

    async notifySessionUpdated(
        phone: string,
        studentName: string,
        courseTitle: string,
        changes: { oldStart?: Date; newStart?: Date; topic?: string },
        reason?: string,
    ) {
        const fmt = (d?: Date) =>
            d ? d.toLocaleString('ar-SA-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }) : 'غير متوفر';

        const topicPart = changes.topic ? `\nالجلسة: "${changes.topic}"` : '';
        const reasonPart = reason ? `\n📝 السبب: ${reason}` : '';

        await this.send(phone,
            `📅 تعديل موعد جلسة - ${studentName}

دورة: "${courseTitle}"${topicPart}

⏱️ القديم: ${fmt(changes.oldStart)}
🆕 الجديد: ${fmt(changes.newStart)}${reasonPart}

-- منصة الدورات`
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
            `🗓️ تحديث الجدول الدراسي - ${studentName}

تم تحديث جدول دورة "${courseTitle}" بالكامل.
عدد الجلسات الجديدة: ${sessionsCount} جلسة${reasonPart}

يرجى مراجعة الجدول الجديد في المنصة.

-- منصة الدورات`
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
            `❌ إلغاء جلسة - ${studentName}

تم إلغاء إحدى جلسات دورة "${courseTitle}"${topicPart}${reasonPart}

يرجى تحديث جدولك.

-- منصة الدورات`
        );
    }
}

export const whatsAppService = new WhatsAppService();
