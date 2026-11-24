# مراجعة واجهات ERPX-AI

## المراجعة النهائية بالمرجع المرئي

بناء الإنتاج المحلي على Git `485df4dcf` مع تعديلات شجرة العمل. بصمة SHA-256 لملف `dist/index.html` هي `85647e3d96b356d42efdf79b9776a3e2e7a99d19ab57f7c36eb1bb66c77870f0`. ملفا الدخول للبناء هما `index-D_0egWCJ.js` و`index-C9yk8oSO.css`. بصمة ملف الدخول في بناء المعاينة من المصدر نفسه بإعداد HTTP الاصطناعي هي `6296e00f0c12706f361dafef84dcb80113ee259498ebe0f66ab0e30b300aa26b`.

استُخدمت صورة `Midnight ERP Login and Arabic Dashboard.png` لتقييم ترتيب العناوين وعمق الأسطح ووضوح الزر الأزرق. احتفظ الدخول بتخطيطه المقسوم. خُففت شبكة رأس لوحة التحكم وأُبرزت أيقونات المؤشرات، واستمر الرسم في عرض الفواتير والتحصيل. قُللت المسافات الرأسية لصفوف الفواتير، وعُزل معرّف الفاتورة في عنوان نافذة التفاصيل باتجاه LTR. في نقطة البيع تم التحقق من ظهور إجراء الدفع في سلة تحتوي صنفًا اصطناعيًا.

شملت الترجمة المضافة التسجيل وخطواته والتحقق من حقوله، وشاشات الاستعادة ونجاح التسجيل والموافقة على OAuth، وسجل التدقيق ووضع المطوّر والوصول الطارئ وتوثيق المصادقة. تبقى قيم المستخدم، وأسماء الحقول البرمجية، وعناوين إعادة التوجيه، ومعرّفات المستندات بلغتها الأصلية.

### لقطات البناء النهائي ببيانات اصطناعية

| الشاشة | اللقطة |
| --- | --- |
| تسجيل الدخول | [الكمبيوتر](../.tmp/ui-final-review/ar-1440--login.png) |
| لوحة التحكم | [الكمبيوتر](../.tmp/ui-final-review/ar-1440--dashboard.png) |
| قائمة الفواتير | [الكمبيوتر](../.tmp/ui-final-review/ar-1440--finance-invoicing.png) |
| نقطة البيع | [الكمبيوتر](../.tmp/ui-final-review/ar-1440--cashier-pos.png) |
| تفاصيل الفاتورة | [الجوال](../.tmp/ui-final-review/ar-390-invoice-detail.png) |
| سلة البيع بصنف واحد | [الجوال](../.tmp/ui-final-review/ar-390-cart.png) |

مشغّل المعاينة النهائية `node.exe scripts/redesign-acceptance.mjs --final`. نجح فحص TypeScript وبناء الإنتاج و349 اختبار تطبيق و9 فحوص أمان متصفح. نجحت 52 حالة عرض و12 تفاعلًا، بما فيها تبديل اللغة والتحقق من حقل التسجيل وتحميل الاستعادة وفشلها. حُفظت 58 لقطة، ولم يُسجل المشغّل خطأ JavaScript غير معالج أو كتابة غير متوقعة. جرت اختبارات الاستعادة والتسجيل باستجابات محلية دون إرسال بريد.

[اللقطات الست في ملف ZIP](../.tmp/ui-final-review/preview-selection.zip) · [نتائج المراجعة النهائية](../.tmp/ui-final-review/report.json)

## سجل جولة التعميم السابقة

قاعدة العمل Git `485df4dcf` مع تعديلات شجرة العمل المحلية. المعاينات من Chromium على Windows بمقاسي 390 × 844 و1440 × 1000، بالعربية والإنجليزية. تستخدم المعاينات حسابات واستجابات HTTP اصطناعية، وتستخدم بروفتا الصلاحيات والبيع شركتَي الاختبار المخصصتين على Supabase الفعلي.

بصمة بناء الإنتاج المحلي من `dist/index.html` هي SHA-256 `f8bddc5a2f6a5ba4bc456cb27f5343d0e4513f5de9b4b293b0abaa74374d2712`، وهو يشير إلى `index-DRravL2t.js` و`index-DTmzhM-h.css`.

| الواجهة | ما تغيّر |
| --- | --- |
| الدخول | الاحتفاظ بالتخطيط المقسوم والشبكة والإضاءة، مع حقول أوضح، وتركيز مرئي، وإعلان خطأ الدخول، وتوزيع يناسب الجوال |
| إطار التطبيق | خلفية قريبة من الأسود، أسطح كحلية، أزرق للإجراءات والتنقل النشط، وشركة وفرع في الشريط العلوي |
| لوحة التحكم والواجهة التنفيذية | رأس بخلفية شبكية خفيفة، رسم ومؤشرات مرتبطة بالفواتير، وإظهار إنشاء المسودة لمن يستطيع إنشاؤها |
| الفواتير والمبيعات | تبويبات وفلاتر وجداول موحدة، وأرقام متساوية العرض، وإبراز الإجمالي والمدفوع والمتبقي في التفاصيل |
| نقطة البيع | بحث ومسح واختصار للسلة، قائمة منتجات قابلة للتمرير على الجوال، وقراءة مبالغ ورموز باتجاه مستقل عن لغة الواجهة |
| المخزون والمشتريات والعملاء والمحاسبة والموارد البشرية والتقارير والإعدادات | الهوية المشتركة للصفحات والجداول والأزرار والحقول والحالات، مع تمرير الجدول داخل حاويته عند ضيق العرض |
| الإدارة ومركز المساعدة والمشاريع وبقية الوحدات | لوحة الألوان والإطار المشترك، وتعديل أسطح توثيق المصادقة ومعرض المكوّنات |

## تشغيل المراجعة

```powershell
pnpm.cmd run typecheck
pnpm.cmd run build --configLoader runner
pnpm.cmd test
pnpm.cmd run test:browser
node.exe scripts/redesign-acceptance.mjs --visual --quick
```

يستخرج مشغّل المراجعة المسارات من `src/app/App.tsx` ويتحقق من المسار النهائي واتجاه المستند وعرض الصفحة. يحفظ النتائج والصور في `.tmp/ui-visual-review/`. يتضمن الفحص البحث في الفواتير وفتح التفاصيل، واستعادة البيع والتحصيل بعد فقد الرد، وتبديل اللغة والتنقل بلوحة المفاتيح. شاشة نجاح التسجيل تستخدم بيانات انتقال اصطناعية، ولم يُرسل بريد تسجيل أو استعادة.

| الفحص | النتيجة |
| --- | --- |
| TypeScript وبناء الإنتاج | نجحا |
| Vitest | 349 من 349 |
| أمان المتصفح | 9 من 9 |
| عرض المسارات والتفاعل | 75 مسارًا، و360 من 360 حالة عرض تشمل الحالات المكررة في اختبار الانحدار، و29 من 29 تفاعلًا |
| دليل الصور | 344 لقطة مسجلة، وصفر أخطاء JavaScript غير معالجة أو طلبات كتابة غير متوقعة |

## صور المعاينة

| الصفحة | الكمبيوتر | الجوال |
| --- | --- | --- |
| الدخول | [العربية](../.tmp/ui-visual-review/ar-1440--login.png) · [الإنجليزية](../.tmp/ui-visual-review/en-1440--login.png) | [العربية](../.tmp/ui-visual-review/ar-390--login.png) · [الإنجليزية](../.tmp/ui-visual-review/en-390--login.png) |
| لوحة التحكم | [العربية](../.tmp/ui-visual-review/ar-1440--dashboard.png) · [الإنجليزية](../.tmp/ui-visual-review/en-1440--dashboard.png) | [العربية](../.tmp/ui-visual-review/ar-390--dashboard.png) · [الإنجليزية](../.tmp/ui-visual-review/en-390--dashboard.png) |
| قائمة الفواتير | [العربية](../.tmp/ui-visual-review/ar-1440--finance-invoicing.png) · [الإنجليزية](../.tmp/ui-visual-review/en-1440--finance-invoicing.png) | [العربية](../.tmp/ui-visual-review/ar-390--finance-invoicing.png) · [الإنجليزية](../.tmp/ui-visual-review/en-390--finance-invoicing.png) |
| تفاصيل الفاتورة | [العربية](../.tmp/ui-visual-review/ar-1440-invoice-detail.png) · [الإنجليزية](../.tmp/ui-visual-review/en-1440-invoice-detail.png) | [العربية](../.tmp/ui-visual-review/ar-390-invoice-detail.png) · [الإنجليزية](../.tmp/ui-visual-review/en-390-invoice-detail.png) |
| نقطة البيع | [العربية](../.tmp/ui-visual-review/ar-1440--cashier-pos.png) · [الإنجليزية](../.tmp/ui-visual-review/en-1440--cashier-pos.png) | [العربية](../.tmp/ui-visual-review/ar-390--cashier-pos.png) · [الإنجليزية](../.tmp/ui-visual-review/en-390--cashier-pos.png) |

[معاينة الإيصال العربي](../.tmp/release-acceptance/first-branch-receipt-ar.png) · [نتائج المسارات والتفاعلات](../.tmp/ui-visual-review/report.json)

## قائمة المسارات

- الدخول والخدمات العامة تشمل `/` و`/login` و`/register` و`/registration-success` و`/forgot-password` و`/reset-password` و`/oauth/consent`.
- التشغيل يشمل `/dashboard` و`/executive` و`/finance/invoicing` و`/sales` و`/pos` و`/cashier/pos` و`/crm` و`/purchase` و`/inventory` و`/inventory/manage`.
- المالية تشمل `/finance/dashboard` و`/finance/accounting` و`/finance/journal-entries` و`/finance/general-ledger` و`/finance/trial-balance` و`/finance/accounts-receivable` و`/finance/accounts-payable` و`/finance/cash-bank` و`/finance/budgets` و`/finance/expenses` و`/finance/fixed-assets` و`/finance/vat-tax` و`/finance/reports` و`/finance/ai-assistant` و`/finance/currency` و`/finance/zatca` و`/reports`.
- الموارد البشرية تشمل `/hr/dashboard` و`/hr/employees` و`/hr/attendance` و`/hr/leaves` و`/hr/payroll` و`/hr/recruitment` و`/hr/reports` و`/hr/ai-assistant`.
- الوحدات الأخرى تشمل `/subscriptions` و`/mrp` و`/plm` و`/projects` و`/timesheets` و`/field-service` و`/helpdesk` و`/design-system` و`/bms/energy` و`/bms/cctv` و`/food-delivery` و`/ai/assistant` و`/ai/predictions` و`/ai/recommendations` و`/ai/alerts`.
- الإدارة تشمل `/system/users` و`/system/permissions` و`/admin/supabase-diagnostic` و`/admin/control-tower` و`/admin/tenants` و`/admin/studio` و`/admin/metrics` و`/admin/usage` و`/admin/automation` و`/admin/webhooks` و`/admin/auth-docs` و`/admin/users` و`/admin/roles` و`/admin/permissions-matrix` و`/admin/audit-logs` و`/admin/developer-mode` و`/admin/emergency-access` و`/settings`.

راجعت لقطات الصفحات كاملة العرض وأجزاءها الأولى على الجوال. شمل التدقيق التفصيلي الدخول ولوحة التحكم والفواتير ونقطة البيع. بلغ تباين النص الأبيض فوق زر الإجراء الأزرق 5.21:1، والنص الثانوي فوق السطح الكحلي 7.30:1 في عينتين من الألوان المشتركة. تظهر بعض النصوص القديمة بالإنجليزية عند اختيار العربية، ومنها نصوص التسجيل والاستعادة وOAuth وبعض صفحات الإدارة.

## الفحص على Supabase

- تسجيل الدخول والفاتورة على بناء الإنتاج المحلي. دخل محاسب شركة الاختبار من الواجهة، وبدّل اللغة، وفتح فاتورة البيع على عرض 390 بكسل. الإجمالي 115 ريالًا والمدفوع 115 والمتبقي صفر، مع صفر طلبات كتابة إلى بيانات العمل. الدليل في `.tmp/release-acceptance/ui-live-login-invoice-report.json`.
- الصلاحيات في جلستين. بعد خفض الدور، رُفض الإجراء الإداري وأزيلت واجهة الإدارة دون إعادة تحميل الصفحة. بقيت نقطة البيع متاحة، واستعيد حقل النموذج غير المحفوظ. الدليل في `.tmp/release-acceptance/first-branch-access-ui-report.json`.
- البيع والإيصال. بيع نقدي بقيمة 115 ريالًا، ورصيد المخزون من 3 إلى 2، ونقد متوقع ومعدود 165 ريالًا، وفرق الوردية صفر. تطابقت معاينتا الإيصال العربي وتوافقت المبالغ والرموز في النسخة الإنجليزية. بقيت أعداد البيع والدفعات وحركات المخزون والقيود 4 و6 و8 و11 على الترتيب قبل الطباعة وبعدها. الدليل في `.tmp/release-acceptance/first-branch-receipt-report.json`.
- طابعة الفرع والماسح الفعليان يظلان ضمن القبول الميداني. اختبار الباركود هنا أدخل رمزًا اصطناعيًا في واجهة المسح.
