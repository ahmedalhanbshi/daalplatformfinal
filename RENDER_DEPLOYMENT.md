# دليل النشر على Render

هذا الملف يوضح إعدادات نشر backend الخاص بمنصة دال على Render بشكل يدوي وقابل للتطبيق، دون تنفيذ نشر فعلي الآن، ودون استخدام أسرار حقيقية أو تشغيل seed.

## 1) نوع الخدمة

- Service Type: `Web Service`
- Root Directory: `auth-backend`
- Runtime: `Node`

## 2) الأوامر المعتمدة فعليًا

السكربتات الموجودة حاليًا داخل `auth-backend/package.json` هي:

- `npm install`
- `npm run build`
- `npm run start`
- `npm run prisma:generate`
- `npm run prisma:deploy`
- `npm run prisma:seed`

## 3) أوامر Render المقترحة

- Build Command:
  - `npm install && npm run prisma:generate && npm run build`
- Start Command:
  - `npm run start`
- Pre-deploy Command:
  - `npm run prisma:deploy`

إذا كانت خطة Render أو نوع الخدمة لا يدعم `pre-deploy` بشكل مباشر، شغّل:

- `npm run prisma:deploy`

يدويًا من Shell الخاص بـ Render أو كجزء محكوم من عملية النشر، دون دمجه مع أي منطق إضافي.

## 4) متغيرات البيئة المطلوبة

استخدم placeholders فقط:

```env
PORT=5001
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_ACCESS_SECRET=CHANGE_ME_LONG_RANDOM_VALUE
JWT_REFRESH_SECRET=CHANGE_ME_LONG_RANDOM_VALUE
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
REDIS_HOST=YOUR_REDIS_HOST
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_REDIS_PASSWORD
FRONTEND_URL=https://YOUR_VERCEL_FRONTEND_URL
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME_MINUTES=15
SMTP_HOST=YOUR_SMTP_HOST
SMTP_PORT=587
SMTP_USER=YOUR_SMTP_USER
SMTP_PASS=YOUR_SMTP_PASSWORD
SMTP_FROM=no-reply@example.com
TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_FROM=whatsapp:+000000000000
```

### ملاحظات مهمة

- لا تضع أسرارًا حقيقية في Render من خلال هذا الملف.
- يجب أن يكون `JWT_ACCESS_SECRET` و`JWT_REFRESH_SECRET` مختلفين، طويلين، وعشوائيين.
- `FRONTEND_URL` يجب أن يطابق رابط الواجهة المنشورة على Vercel.
- `DATABASE_URL` يجب أن تشير إلى قاعدة PostgreSQL الخاصة بـ staging أو production حسب البيئة.

## 5) ربط PostgreSQL

- أنشئ قاعدة PostgreSQL منفصلة لـ staging.
- لا تستخدم قاعدة التطوير المحلية.
- لا تستخدم قاعدة الإنتاج.
- بعد إدخال `DATABASE_URL` شغّل:
  - `npm run prisma:deploy`

## 6) ربط Redis

- استخدم Redis خارجيًا ومخصصًا لـ staging.
- اضبط:
  - `REDIS_HOST`
  - `REDIS_PORT`
  - `REDIS_PASSWORD`
- لا تستخدم Redis المحلي في Render.

## 7) CORS و FRONTEND_URL

التحقق الحالي في backend يعتمد على `FRONTEND_URL` مع allowlist محلي للتطوير.

### المطلوب

- اجعل `FRONTEND_URL` يساوي رابط Vercel النهائي للواجهة.
- لا تفتح `CORS` على `*` في الإنتاج.
- لا تعدل منطق CORS حاليًا إلا إذا ظهر تعارض فعلي أثناء الاختبار.

## 8) Health Endpoint

يوجد endpoint صحي حاليًا:

- `GET /health`

### رابط الفحص المتوقع بعد النشر

```text
https://YOUR_RENDER_BACKEND_URL/health
```

### ما الذي يجب أن يرجعه؟

- `status: OK`
- timestamp

## 9) رفع الملفات

- المسار الحالي للملفات المرفوعة:
  - `auth-backend/uploads`
- إذا كانت Render تدعم volume دائمًا في الخطة المستخدمة، يمكن ربطه بهذا المسار مؤقتًا.
- لا تنقل الملفات الآن.
- لا تغيّر منطق الرفع الآن.

## 10) ماذا تفعل إذا فشل build

### تحقق أولًا من:

- وجود `DATABASE_URL`
- صحة `JWT_ACCESS_SECRET` و`JWT_REFRESH_SECRET`
- صحة إعدادات Redis
- صحة `FRONTEND_URL`
- نجاح `npm run prisma:generate`
- نجاح `npm run build`

### إن فشل `prisma:deploy`

- تأكد من اتصال قاعدة البيانات.
- تأكد من أن قاعدة الـ staging فارغة أو مهيأة بشكل صحيح قبل تطبيق migrations.

## 11) تحذير seed

- `npm run prisma:seed` الآن آمن من ناحية عدم حذف البيانات وعدم إنشاء demo data.
- هو ينشئ أو يحدّث حساب أدمن واحد فقط:
  - `admin@platform.com`
- كلمة المرور الحالية:
  - `Test@123456`
- يجب تغيير كلمة المرور مباشرة بعد أول دخول في staging أو production.
- لا تترك كلمة المرور التجريبية كما هي في الإنتاج.

## 12) Checklist سريع قبل الضغط على Deploy

- Root Directory مضبوط على `auth-backend`
- Build Command مضبوط
- Start Command مضبوط
- `DATABASE_URL` مضبوط
- `REDIS_*` مضبوط
- `FRONTEND_URL` مضبوط
- `JWT_*` مضبوط
- `SMTP_*` مضبوط
- `TWILIO_*` مضبوط
- `GET /health` يعمل محليًا أو في بيئة الاختبار

## 13) تقرير نهائي مختصر

- هل تم إنشاء `RENDER_DEPLOYMENT.md`؟
  - نعم / لا
- هل تم تعديل أي ملف غير التوثيق؟
  - نعم / لا
- هل تم تشغيل seed؟
  - نعم / لا
- هل تم نشر فعلي؟
  - نعم / لا

## 14) خيارات التنفيذ على Render

- النشر اليدوي من Render Dashboard مناسب إذا أردت ضبط القيم خطوة بخطوة.
- النشر عبر `render.yaml` Blueprint مناسب إذا أردت تعريف الخدمة كملف واحد قابل للمراجعة داخل المستودع.
- لا تضع أسرار البيئة داخل `render.yaml`.
- شغّل `npm run prisma:deploy` يدويًا أو كـ pre-deploy/release command إذا كانت خطة Render تدعم ذلك بشكل واضح.
