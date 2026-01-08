# دليل إعداد Google Cloud (مجاني)

نعم، الخدمة **مجانية تماماً** للاستخدام العادي. جوجل تعطيك حدوداً ضخمة (ملايين الطلبات مجاناً) لن تصلي لها بسهولة.

## الخطوات بالتفصيل (5 دقائق):

### 1. إنشاء مشروع (Project)

1. ادخلي على: [console.cloud.google.com](https://console.cloud.google.com)
2. سجلي دخول بحساب Gmail (يفضل حساب جديد خاص بالموقع).
3. في الأعلى بجانب شعار Google، اضغطي على القائمة واختر **New Project**.
4. سمّهِ مثلاً `DentalSaaS-Backup` واضغط **Create**.

### 2. تفعيل خدمة Drive

1. بعد إنشاء المشروع، في القائمة الجانبية (ثلاث خطوط)، اختاري **APIs & Services** > **Library**.
2. ابحثي عن **Google Drive API**.
3. اضغطي عليها ثم اضغطي **Enable**.

### 3. شاشة الموافقة (OAuth Consent Screen)

1. من القائمة الجانبية في **APIs & Services**، اختاري **OAuth consent screen**.
2. اختاري **External** (خارجي) ثم **Create**.
3. املأي البيانات:
   - **App Name**: Dental SaaS (هذا الاسم سيظهر للدكاترة).
   - **User support email**: إيميلك.
   - **Developer contact information**: إيميلك.
   - اضغطي **Save and Continue** (تجاهلي باقي الخطوات).
4. في خطوة **Test Users**، بما أن التطبيق في وضع "Testing"، يجب أن تضيفي إيميلك الشخصي (والإيميلات التي ستجربين بها) في القائمة. اضغطي **Add Users** وأضيفي الإيميلات.

### 4. الحصول على المفاتيح (Credentials)

1. من القائمة الجانبية، اختاري **Credentials**.
2. اضغطي **Create Credentials** (في الأعلى) > **OAuth client ID**.
3. **Application type**: اختاري **Web application**.
4. **Name**: `Dental Client`.
5. **Authorized redirect URIs**: (هذا أهم جزء! سنحتاجه لربط الكود).
   - حالياً ونحن نجرب محلياً، أضيفي: `http://localhost:8001/settings/backup/callback`
   - لاحقاً بعد الرفع، سنضيف رابط موقعك: `https://YOUR-SPACE-NAME.hf.space/settings/backup/callback`
6. اضغطي **Create**.

### 5. النتيجة

سيظهر لك كودين:

- **Client ID** (طويل جداً).
- **Client Secret** (كود سري).

انسخيهما وأرسليهما لي (أو احفظيهما في ملف لنستعملهما).

---

**هل الخطوات واضحة؟** ابدئي بها وأنا سأبدأ في برمجة الكود لاستقبال هذه المفاتيح.
