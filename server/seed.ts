// ── AGENT-OWNED: بيانات تجريبية واقعية لتطبيق «حِرْفي» ───────────────────────
// التشغيل:  npx tsx server/seed.ts
//
// قابل لإعادة التشغيل (idempotent): يمسح بيانات المجال ثم يعيد بناءها من الصفر،
// فلا تتضاعف الصفوف عند تكرار التشغيل. لا يمسّ جدول `files` (مملوك للمنصّة).
//
// كل المجاميع (تقييم الحرّاف، عدد أعماله المنجزة، رصيد محفظته) تُحسَب في نهاية
// الملف من الصفوف المُدرجة نفسها — لا تُكتب يدوياً — حتى لا تتناقض مع الواقع.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db } from "./_core/db";
import {
  users,
  serviceCategories,
  providerProfiles,
  providerCategories,
  providerWorks,
  requests,
  requestImages,
  offers,
  messages,
  reviews,
  walletTransactions,
  notifications,
} from "../drizzle/schema";
import { PLATFORM_FEE_PERCENT } from "../shared/constants";

const DEMO_PASSWORD = "demo1234";
const ADMIN_EMAIL = "admin@hirfi.ma";
const NOW = new Date();
const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);

const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 3_600_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

// ── الفئات الخمس عشرة ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { slug: "plumbing", nameAr: "سباكة", icon: "Wrench" },
  { slug: "electrical", nameAr: "كهرباء", icon: "Zap" },
  { slug: "carpentry", nameAr: "نجارة", icon: "Hammer" },
  { slug: "painting", nameAr: "صباغة", icon: "PaintRoller" },
  { slug: "hvac", nameAr: "تكييف وتبريد", icon: "Snowflake" },
  { slug: "cleaning", nameAr: "تنظيف", icon: "Sparkles" },
  { slug: "moving", nameAr: "نقل أثاث", icon: "Truck" },
  { slug: "electronics", nameAr: "إصلاح إلكترونيات", icon: "Smartphone" },
  { slug: "tailoring", nameAr: "خياطة", icon: "Scissors" },
  { slug: "photography", nameAr: "تصوير", icon: "Camera" },
  { slug: "tutoring", nameAr: "دروس خصوصية", icon: "GraduationCap" },
  { slug: "handyman", nameAr: "خدمات عامة", icon: "Settings" },
  { slug: "grocery", nameAr: "قضاء الأغراض", icon: "ShoppingBasket" },
  { slug: "queue", nameAr: "الوقوف فالطابور", icon: "ListChecks" },
  { slug: "rental", nameAr: "الكراء", icon: "KeyRound" },
];

// ── صور واقعية مطابقة لكل فئة ────────────────────────────────────────────────
// قبلها كانت صور picsum عشوائية، فيظهر «تسريب في المطبخ» صورة رصيف خشبي — تناقض يضرب
// مصداقية العرض كله. هذه صور وُلّدت خصيصاً لكل مهنة.
const CDN_IMG = "https://static.teamily.ai/sites/54acf1a4-fb8b-4ade-befc-2c880513d6e8/images";
const CATEGORY_IMAGES: Record<string, string> = {
  plumbing: `${CDN_IMG}/hirfi_category_photos_v4/hirfi_category_photos.png`,
  electrical: `${CDN_IMG}/hirfi_category_photos_v2/hirfi_category_photos.png`,
  carpentry: `${CDN_IMG}/hirfi_category_photos_v12/hirfi_category_photos.png`,
  painting: `${CDN_IMG}/hirfi_category_photos/hirfi_category_photos.png`,
  hvac: `${CDN_IMG}/hirfi_category_photos_v11/hirfi_category_photos.png`,
  cleaning: `${CDN_IMG}/hirfi_category_photos_v5/hirfi_category_photos.png`,
  moving: `${CDN_IMG}/hirfi_category_photos_v8/hirfi_category_photos.png`,
  electronics: `${CDN_IMG}/hirfi_category_photos_v7/hirfi_category_photos.png`,
  tailoring: `${CDN_IMG}/hirfi_category_photos_v9/hirfi_category_photos.png`,
  photography: `${CDN_IMG}/hirfi_category_photos_v10/hirfi_category_photos.png`,
  tutoring: `${CDN_IMG}/hirfi_category_photos_v6/hirfi_category_photos.png`,
  handyman: `${CDN_IMG}/hirfi_category_photos_v3/hirfi_category_photos.png`,
};
/** صورة الفئة المناسبة — مع بديل ثابت إن جاءت فئة غير معروفة. */
const categoryImage = (slug: string | undefined) =>
  CATEGORY_IMAGES[slug ?? ""] ?? CATEGORY_IMAGES.handyman;

// ── المستخدمون ────────────────────────────────────────────────────────────────
type UserSpec = {
  email: string;
  name: string;
  role: "customer" | "provider";
  city: string;
  district: string;
  bio?: string;
  years?: number;
  verified?: boolean;
  phone?: string;
  skills?: string[];
  baseJobs?: number;
  works?: { caption: string }[];
};

const USERS: UserSpec[] = [
  // حسابا العرض التجريبي
  {
    email: "sara@hirfi.ma",
    name: "سارة العلوي",
    role: "customer",
    city: "الدار البيضاء",
    district: "المعاريف",
    bio: "أمّ لطفلين، أبحث دائماً عن حرّاف موثوق وسريع لبيتي الصغير.",
    phone: "0661234501",
  },
  {
    email: "karim@hirfi.ma",
    name: "كريم بنعمر",
    role: "provider",
    city: "الدار البيضاء",
    district: "المعاريف",
    bio: "سبّاك ومختصّ كهرباء منذ 12 سنة. أعمل بنظافة وضمان على كل تدخّل. أحترم المواعيد وأشرح المشكلة قبل الإصلاح.",
    years: 12,
    verified: true,
    phone: "0661234502",
    skills: ["plumbing", "electrical", "handyman"],
    baseJobs: 214,
    works: [
      { caption: "تجديد شبكة ماء كاملة لشقة في المعاريف" },
      { caption: "إصلاح تسريب في جدار مطبخ + إعادة ترميم" },
      { caption: "تركيب سخّان ماء وشبكة التصريف" },
    ],
  },
  // مقدّمو خدمة آخرون
  {
    email: "youssef@hirfi.ma",
    name: "يوسف الإدريسي",
    role: "provider",
    city: "الدار البيضاء",
    district: "عين الشق",
    bio: "نجّار وصبّاغ. أصنع الرفوف والخزائن حسب الطلب وأصبغ بألوان صحية بلا رائحة قوية.",
    years: 8,
    verified: true,
    phone: "0661234503",
    skills: ["carpentry", "painting"],
    baseJobs: 96,
    works: [
      { caption: "خزانة مدمجة بسماكة 18 مم مع أبواب منزلقة" },
      { caption: "صباغة صالون بلون بيج هادئ" },
      { caption: "رفوف معلّقة لغرفة الأطفال" },
    ],
  },
  {
    email: "hind@hirfi.ma",
    name: "هند الفاسي",
    role: "provider",
    city: "الدار البيضاء",
    district: "الحي الحسني",
    bio: "فريق نسائي متخصّص في تنظيف المنازل والعمق (مطابخ، حمّامات، زجاج). نستعمل مواد آمنة على الأطفال.",
    years: 5,
    phone: "0661234504",
    skills: ["cleaning", "tailoring"],
    baseJobs: 143,
    works: [
      { caption: "تنظيف عمق لمطبخ بعد ورشة بناء" },
      { caption: "تنظيف شقة كاملة قبل السكنى" },
    ],
  },
  {
    email: "otmane@hirfi.ma",
    name: "عثمان العلمي",
    role: "provider",
    city: "الرباط",
    district: "أكدال",
    bio: "تقني تبريد وتسخين معتمد. صيانة وتركيب المكيّفات والمنظومات المركزية للمنازل والمكاتب.",
    years: 10,
    verified: true,
    phone: "0661234505",
    skills: ["hvac", "electrical"],
    baseJobs: 178,
    works: [
      { caption: "تركيب وحدتين سبليت في صالون وغرفة" },
      { caption: "صيانة سنوية لثلاث مكيّفات مكتب" },
      { caption: "تنظيف شبكة تهوية مركزية" },
    ],
  },
  {
    email: "nadia@hirfi.ma",
    name: "نادية الشرقاوي",
    role: "provider",
    city: "الرباط",
    district: "حسان",
    bio: "أستاذة رياضيات. دروس فردية ومجموعات صغيرة للثانوي التأهيلي، بتركيز على الاستعداد للباكالوريا.",
    years: 7,
    verified: true,
    phone: "0661234506",
    skills: ["tutoring"],
    baseJobs: 62,
    works: [{ caption: "حصص مراجعة مكثّفة قبل الامتحان الوطني" }],
  },
  {
    email: "hamza@hirfi.ma",
    name: "حمزة الطاهري",
    role: "provider",
    city: "مراكش",
    district: "جليز",
    bio: "نقل أثاث وخدمات عامة. شاحنة صغيرة (7 م³) مع مساعد وعربات وتغليف بولستر للحفاظ على الأثاث.",
    years: 6,
    phone: "0661234507",
    skills: ["moving", "handyman"],
    baseJobs: 88,
    works: [
      { caption: "نقل أثاث شقة كاملة في يوم واحد" },
      { caption: "تغليف ورفع بيانو بعناية" },
    ],
  },
  {
    email: "salma@hirfi.ma",
    name: "سلمى بنجلون",
    role: "provider",
    city: "مراكش",
    district: "النخيل",
    bio: "مصوّرة مناسبات. تغطية كاملة للأعراس والحفلات مع ألبوم رقمي من 300 صورة معدّلة.",
    years: 9,
    verified: true,
    phone: "0661234508",
    skills: ["photography"],
    baseJobs: 134,
    works: [
      { caption: "تغطية حفل زفاف بحدائق المنارة" },
      { caption: "جلسة تصوير عائلية في الصحراء" },
      { caption: "تصوير حفل عقيقة" },
    ],
  },
  {
    email: "reda@hirfi.ma",
    name: "رضا الحمداوي",
    role: "provider",
    city: "طنجة",
    district: "المغرب العربي",
    bio: "ورشة إصلاح إلكترونيات: حواسيب، هواتف، أجهزة منزلية. تشخيص مجاني وإخبارك بالعطل قبل أي إصلاح.",
    years: 11,
    verified: true,
    phone: "0661234509",
    skills: ["electronics", "handyman"],
    baseJobs: 202,
    works: [
      { caption: "تغيير لوحة أم لحاسوب محمول" },
      { caption: "إصلاح مضخة صرف غسالة أوتوماتيك" },
    ],
  },
  {
    email: "imane@hirfi.ma",
    name: "إيمان الزهراوي",
    role: "provider",
    city: "فاس",
    district: "سايس",
    bio: "صبّاغة ومختصّة تنظيف. أعمل بالرشّاش الحديث وأغطّي الأثاث قبل البدء.",
    years: 4,
    phone: "0661234510",
    skills: ["painting", "cleaning"],
    baseJobs: 51,
    works: [{ caption: "صباغة واجهة شقّة بمبنى قديم" }],
  },
  {
    email: "mehdi@hirfi.ma",
    name: "مهدي أوبيهي",
    role: "provider",
    city: "أكادير",
    district: "حي الهدى",
    bio: "كهربائي وإلكتروني. تدخّل عاجل للأعطال الكهربائية، وتأريض ولوحات توزيع للمحلات.",
    years: 13,
    verified: true,
    phone: "0661234511",
    skills: ["electrical", "electronics", "hvac"],
    baseJobs: 245,
    works: [
      { caption: "تأريض ولوحة توزيع لمقهى" },
      { caption: "إصلاح عطل في لوحة مكيّف مركزي" },
    ],
  },
  {
    email: "fatima@hirfi.ma",
    name: "فاطمة الرامي",
    role: "provider",
    city: "مكناس",
    district: "حمرية",
    bio: "خيّاطة تقليدية وعصرية: قفاطن، جلابات، تعديلات. وأستاذة دعم لتلاميذ الابتدائي.",
    years: 15,
    verified: true,
    phone: "0661234512",
    skills: ["tailoring", "tutoring"],
    baseJobs: 310,
    works: [
      { caption: "قفطان مخملي مطرّز بالعقيق" },
      { caption: "تعديل ثلاثة بدلات رجالية" },
    ],
  },
  {
    email: "meryem@hirfi.ma",
    name: "مريم السالمي",
    role: "provider",
    city: "الدار البيضاء",
    district: "بوركون",
    bio: "قضاء الأغراض من الأسواق والمحلات. أرسل لك صورة الفاتورة وأوصل مشترياتك حتى الباب.",
    years: 3,
    verified: true,
    phone: "0661234515",
    skills: ["grocery"],
    baseJobs: 74,
    works: [{ caption: "قفة أسبوعية من سوق السلام" }, { caption: "شراء دواء وتوصيله للمنزل" }],
  },
  {
    email: "ayoub@hirfi.ma",
    name: "أيوب المريني",
    role: "provider",
    city: "الرباط",
    district: "أكدال",
    bio: "خدمة الوقوف فالطابور وقضاء الإجراءات البسيطة مع تحديثات مباشرة للزبون.",
    years: 2,
    phone: "0661234516",
    skills: ["queue", "handyman"],
    baseJobs: 39,
    works: [{ caption: "إيداع ملف إداري بالنيابة" }],
  },
  {
    email: "tarik@hirfi.ma",
    name: "طارق بنصالح",
    role: "provider",
    city: "الدار البيضاء",
    district: "عين الشق",
    bio: "كراء معدات منزلية وأدوات الورش مع توصيل واسترجاع في الموعد.",
    years: 6,
    verified: true,
    phone: "0661234517",
    skills: ["rental", "handyman"],
    baseJobs: 61,
    works: [{ caption: "كراء مثقاب وأدوات تركيب" }, { caption: "كراء معدات حفلة صغيرة" }],
  },
  // زبائن آخرون (تنويع الطلبات والمدن)
  {
    email: "amine@hirfi.ma",
    name: "أمين بوزيد",
    role: "customer",
    city: "الرباط",
    district: "الرياض",
    phone: "0661234513",
  },
  {
    email: "khadija@hirfi.ma",
    name: "خديجة الناصري",
    role: "customer",
    city: "مراكش",
    district: "المسيرة",
    phone: "0661234514",
  },
];

// ── الطلبات ───────────────────────────────────────────────────────────────────
type OfferSpec = {
  by: string;
  price: number;
  durationMinutes: number;
  message: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  daysAgo: number;
};
type ChatSpec = { by: string; body: string; hoursAgo: number };
type ReqSpec = {
  customer: string;
  category: string;
  title: string;
  description: string;
  budget: number;
  city: string;
  district: string;
  urgency: "flexible" | "today" | "urgent";
  status: "open" | "accepted" | "in_progress" | "completed" | "cancelled";
  postedDaysAgo: number;
  scheduledFor?: Date | null;
  images?: number;
  offers: OfferSpec[];
  chat?: ChatSpec[];
  /** تقييمات متبادلة تُدرَج فقط للطلبات المنتهية. */
  reviews?: { by: string; rating: number; comment: string }[];
  /** مبلغ الاتفاق — يُشتق من العرض المقبول إن لم يُحدَّد. */
  agreedAmount?: number;
};

const REQUESTS: ReqSpec[] = [
  // ── سارة (الدار البيضاء / المعاريف) ──
  {
    customer: "sara@hirfi.ma",
    category: "plumbing",
    title: "تسريب ماء تحت حوض المطبخ",
    description:
      "لاحظت بللاً دائماً في خزانة المطبخ السفلية واصفرار الخشب. أعتقد أن التسريب من السيفون أو الوصلة. أحتاج تشخيصاً سريعاً وإصلاحاً دائماً — الشقة في الطابق الثالث والبلاط من النوع القديم.",
    budget: 400,
    city: "الدار البيضاء",
    district: "المعاريف",
    urgency: "urgent",
    status: "open",
    postedDaysAgo: 1,
    images: 2,
    offers: [
      { by: "karim@hirfi.ma", price: 450, durationMinutes: 90, message: "أتشخّص مجاناً. أتوقع تغيير السيفون والوصلة، السعر يشمل القطع والضمان 3 أشهر.", status: "pending", daysAgo: 0 },
      { by: "youssef@hirfi.ma", price: 380, durationMinutes: 120, message: "يمكنني المرور اليوم بعد الخامسة. لو كان العطل في الوصلة فقط فالسعر ينزل.", status: "pending", daysAgo: 0 },
      { by: "hind@hirfi.ma", price: 400, durationMinutes: 60, message: "أنا متخصّصة تنظيف وليس سباكة، لكن زوجي سبّاك ويمكن أن نأتي معاً بسعر واحد.", status: "pending", daysAgo: 0 },
      { by: "otmane@hirfi.ma", price: 500, durationMinutes: 75, message: "تنقّل من الرباط، لذلك السعر أعلى قليلاً. التدخّل مضمون 6 أشهر.", status: "pending", daysAgo: 0 },
    ],
  },
  {
    customer: "sara@hirfi.ma",
    category: "electrical",
    title: "إصلاح قابس كهربائي محترق في غرفة النوم",
    description:
      "قابس قريب من السرير احترق قليلاً وظهرت آثار سوداء، وتوقّف معه قابس آخر في نفس الجدار. أريد استبدال القابس وفحص الأسلاك للتأكد من عدم وجود خطر.",
    budget: 250,
    city: "الدار البيضاء",
    district: "المعاريف",
    urgency: "today",
    status: "open",
    postedDaysAgo: 2,
    images: 1,
    offers: [
      { by: "karim@hirfi.ma", price: 300, durationMinutes: 45, message: "سأستبدل القابس وأفحص الأسلاك بأجهزة قياس. إن لزم تغيير جزء من السلك أشعرك قبل التنفيذ.", status: "pending", daysAgo: 1 },
      { by: "mehdi@hirfi.ma", price: 260, durationMinutes: 60, message: "فحص كامل للدارة مطلوب بعد حريق قابس. السعر يشمل الفحص والقابس الجديد.", status: "pending", daysAgo: 1 },
    ],
  },
  {
    customer: "sara@hirfi.ma",
    category: "carpentry",
    title: "تركيب رفوف خشبية في الصالون",
    description:
      "أريد ثلاثة رفوف خشبية معلّقة على جدار الصالون بطول مترين وارتفاع متساوٍ، لتُستعمل للكتب ونباتات. الخشب بلون البلوط والجدار من الخرسانة.",
    budget: 900,
    city: "الدار البيضاء",
    district: "المعاريف",
    urgency: "flexible",
    status: "accepted",
    postedDaysAgo: 5,
    scheduledFor: daysAhead(2),
    images: 2,
    agreedAmount: 950,
    offers: [
      { by: "youssef@hirfi.ma", price: 950, durationMinutes: 240, message: "أصنع الرفوف في الورشة ثم أركّبها. السعر يشمل الخشب والدهن والتركيب بمسمار مخفي.", status: "accepted", daysAgo: 4 },
      { by: "karim@hirfi.ma", price: 1100, durationMinutes: 180, message: "أستطيع التنفيذ هذا الأسبوع لكن التركيب على جدار خرساني يحتاج دعائم إضافية.", status: "rejected", daysAgo: 4 },
      { by: "hamza@hirfi.ma", price: 1000, durationMinutes: 300, message: "أنقل الخشب وأركّبه في نفس اليوم، لكن لا أضمن التشطيب النهائي.", status: "rejected", daysAgo: 3 },
    ],
    chat: [
      { by: "sara@hirfi.ma", body: "مرحباً يوسف، هل يشمل السعر الدهن؟", hoursAgo: 72 },
      { by: "youssef@hirfi.ma", body: "وعليكم السلام. نعم، الدهن بلون بلوط طبيعي بدون لمعة قوية.", hoursAgo: 71 },
      { by: "sara@hirfi.ma", body: "جميل. متى يمكن المرور لأخذ القياسات؟", hoursAgo: 70 },
      { by: "youssef@hirfi.ma", body: "غداً في العاشرة صباحاً مناسب لي. القياس يستغرق عشر دقائق فقط.", hoursAgo: 69 },
      { by: "sara@hirfi.ma", body: "متفق، في انتظارك.", hoursAgo: 68 },
    ],
  },
  {
    customer: "sara@hirfi.ma",
    category: "cleaning",
    title: "تنظيف شامل للشقة قبل العيد",
    description:
      "شقة 90 م²: صالون، غرفتان، مطبخ وحمّام. أحتاج تنظيفاً عميقاً يشمل الزجاج والستائر وحمّام المطبخ، مع تغيير ملاءات السرير.",
    budget: 600,
    city: "الدار البيضاء",
    district: "المعاريف",
    urgency: "flexible",
    status: "in_progress",
    postedDaysAgo: 3,
    scheduledFor: daysAhead(1),
    agreedAmount: 650,
    offers: [
      { by: "hind@hirfi.ma", price: 650, durationMinutes: 300, message: "فريق من اثنتين، المواد والمنتجات علينا. ندخل في الثامنة ونُنهي قبل الظهر.", status: "accepted", daysAgo: 2 },
      { by: "imane@hirfi.ma", price: 700, durationMinutes: 240, message: "أنا أتنقّل من فاس، لذلك أطلب تعويض التنقّل. العمل يشمل الزجاج والستائر.", status: "rejected", daysAgo: 2 },
    ],
    chat: [
      { by: "hind@hirfi.ma", body: "سارة، هل نحضر مواد التنظيف أم موجودة عندك؟", hoursAgo: 40 },
      { by: "sara@hirfi.ma", body: "أنا أشتري المواد وأترك للاستعمال. لكن أفضل منتجات بلا رائحة قوية.", hoursAgo: 39 },
      { by: "hind@hirfi.ma", body: "تمام، سأحضر منتجات خالية من الكلور. الغرف الثلاث جاهزة للعمل.", hoursAgo: 30 },
    ],
  },
  {
    customer: "sara@hirfi.ma",
    category: "painting",
    title: "صباغة غرفة الأطفال",
    description:
      "غرفة 12 م²، الجدار الحالي أبيض قديم به تشققات صغيرة. أريد اللون أزرق فاتح مع جدار تركيز واحد رمادي، ضروري استخدام دهن صحي بلا رائحة لأن الأطفال ينامون في الغرفة.",
    budget: 1200,
    city: "الدار البيضاء",
    district: "المعاريف",
    urgency: "flexible",
    status: "completed",
    postedDaysAgo: 20,
    agreedAmount: 1200,
    images: 2,
    offers: [
      { by: "youssef@hirfi.ma", price: 1200, durationMinutes: 480, message: "سأرمّم التشققات أولاً ثم أدهن ثلاث طبقات بدهن بدون رائحة. السعر يشمل الغطاء والدهن.", status: "accepted", daysAgo: 19 },
      { by: "imane@hirfi.ma", price: 1350, durationMinutes: 360, message: "أستعمل الرشّاش لنتيجة أنعم، وهو أسرع لكن يحتاج إخلاء الغرفة يوماً كاملاً.", status: "rejected", daysAgo: 19 },
    ],
    chat: [
      { by: "sara@hirfi.ma", body: "يوسف، الأطفال سيخرجون من الغرفة يوم التنفيذ. هل يحتاج يومين؟", hoursAgo: 460 },
      { by: "youssef@hirfi.ma", body: "يومان: الأول للترميم والتأسيس والثاني للدهن النهائي.", hoursAgo: 458 },
      { by: "sara@hirfi.ma", body: "ممتاز، اللون الأزرق الفاتح على ثلاث جدران والرمادي على جدار السرير.", hoursAgo: 457 },
      { by: "youssef@hirfi.ma", body: "فهمت. سأحضر عيّنات الألوان قبل البدء لتختاري الدرجة.", hoursAgo: 456 },
      { by: "youssef@hirfi.ma", body: "انتهى العمل. بقيت 24 ساعة للتهوية ثم يمكن للأطفال النوم في الغرفة.", hoursAgo: 400 },
      { by: "sara@hirfi.ma", body: "شكراً، النتيجة جميلة جداً والأولاد سعداء بالأزرق.", hoursAgo: 396 },
    ],
    reviews: [
      { by: "sara@hirfi.ma", rating: 5, comment: "عمل نظيف ومنظّم، أحترم الموعد وشرح كل خطوة. الرائحة كانت خفيفة جداً والأولاد ناموا في الغرفة بعد يوم واحد." },
      { by: "youssef@hirfi.ma", rating: 5, comment: "زبونة محترمة وجهّزت الغرفة قبل الموعد. التعامل معها مريح." },
    ],
  },
  {
    customer: "sara@hirfi.ma",
    category: "hvac",
    title: "تركيب مكيّف سبليت 12000 وحدة",
    description:
      "اشتريت مكيّف سبليت 12000 وحدة وأحتاج تركيبه في الصالون. الجدار الخارجي قريب ويمكن تمرير الأنابيب. السعر المطلوب يشمل التركيب الكامل والغاز والتشغيل التجريبي.",
    budget: 700,
    city: "الدار البيضاء",
    district: "المعاريف",
    urgency: "flexible",
    status: "open",
    postedDaysAgo: 1,
    images: 1,
    offers: [
      { by: "otmane@hirfi.ma", price: 750, durationMinutes: 180, message: "التركيب يشمل الدعامات المعدنية والأنابيب حتى 3 أمتار والتشغيل التجريبي. ضمان سنة على التركيب.", status: "pending", daysAgo: 0 },
      { by: "mehdi@hirfi.ma", price: 680, durationMinutes: 150, message: "لمنع تسريب الغاز أستعمل آلة تلحيم وضغط اختبار. السعر أقل لأنني لا أضيف رسوم تنقّل.", status: "pending", daysAgo: 0 },
      { by: "karim@hirfi.ma", price: 800, durationMinutes: 120, message: "أركّب بسرعة لكن الغاز عليك. أفضّل أن يكون الجهاز أصلياً بضمان الوكيل.", status: "pending", daysAgo: 0 },
    ],
  },
  {
    customer: "sara@hirfi.ma",
    category: "electronics",
    title: "إصلاح حاسوب محمول لا يشتغل",
    description:
      "حاسوب محمول توقّف عن العمل بعد انقطاع الكهرباء. المؤشّر لا يضيء أبداً، جرّبت شاحناً آخر دون جدوى. أحتاج تشخيصاً وإصلاحاً — الجهاز يحتوي ملفات مهمة.",
    budget: 350,
    city: "الدار البيضاء",
    district: "المعاريف",
    urgency: "flexible",
    status: "open",
    postedDaysAgo: 4,
    offers: [
      { by: "reda@hirfi.ma", price: 400, durationMinutes: 120, message: "التشخيص مجاني. أرجّح عطلاً في لوحة التغذية أو البطارية. إن كان الملف مهماً لا أحاول القراءة قبل إعلامك.", status: "pending", daysAgo: 3 },
    ],
  },
  {
    customer: "sara@hirfi.ma",
    category: "moving",
    title: "نقل أثاث إلى شقة جديدة",
    description:
      "نقل أثاث شقة صغيرة (سرير، خزانة، طاولة، غسالة، صناديق) من المعاريف إلى بوركون على مسافة قريبة. الشقة الجديدة في الطابق الثاني بدون مصعد.",
    budget: 1500,
    city: "الدار البيضاء",
    district: "المعاريف",
    urgency: "flexible",
    status: "open",
    postedDaysAgo: 0,
    scheduledFor: daysAhead(5),
    offers: [],
  },

  // ── أمين (الرباط / الرياض) ──
  {
    customer: "amine@hirfi.ma",
    category: "plumbing",
    title: "تسريب في سخّان الماء",
    description:
      "سخّان ماء كهربائي يقطّر من الأسفل باستمرار وتجمعت بركة صغيرة. أريد إصلاحاً أو تغييراً إن كان الخزان مثقوباً.",
    budget: 500,
    city: "الرباط",
    district: "الرياض",
    urgency: "today",
    status: "open",
    postedDaysAgo: 2,
    images: 1,
    offers: [
      { by: "otmane@hirfi.ma", price: 550, durationMinutes: 90, message: "في الغالب حشوة أو مقاومة. إن كان الخزان مثقوباً فالأفضل تغييره وأرشدك للنوع المناسب.", status: "pending", daysAgo: 1 },
      { by: "karim@hirfi.ma", price: 600, durationMinutes: 120, message: "أستطيع المرور غداً صباحاً. السعر يشمل التنقّل من الدار البيضاء.", status: "pending", daysAgo: 1 },
    ],
  },
  {
    customer: "amine@hirfi.ma",
    category: "hvac",
    title: "صيانة ثلاثة مكيّفات في المكتب",
    description:
      "ثلاث وحدات سبليت في مكتب، وضع التبريد ضعيف والفلتر متسخ. أحتاج تنظيفاً كاملاً وفحص الغاز، والعمل يجب أن يكون بعد الخامسة أو نهاية الأسبوع.",
    budget: 900,
    city: "الرباط",
    district: "الرياض",
    urgency: "flexible",
    status: "in_progress",
    postedDaysAgo: 4,
    scheduledFor: daysAhead(1),
    agreedAmount: 900,
    offers: [
      { by: "otmane@hirfi.ma", price: 900, durationMinutes: 240, message: "تنظيف الفلاتر والمبخّر وفحص ضغط الغاز للوحدات الثلاث. أستطيع الحضور بعد الخامسة.", status: "accepted", daysAgo: 3 },
      { by: "mehdi@hirfi.ma", price: 950, durationMinutes: 180, message: "أستعمل مضخّة تنظيف بالبخار لنتيجة أعمق، لكن الزيارة من أكادير.", status: "rejected", daysAgo: 3 },
    ],
    chat: [
      { by: "amine@hirfi.ma", body: "عثمان، هل تحتاج دعماً من المكتب للكهرباء؟", hoursAgo: 50 },
      { by: "otmane@hirfi.ma", body: "نعم قاطع مستقل أفضل، لأن الفحص يحتاج فصل كل وحدة على حدة.", hoursAgo: 48 },
      { by: "amine@hirfi.ma", body: "ممكن. سأنبّه الإدارة قبل الزيارة.", hoursAgo: 47 },
    ],
  },
  {
    customer: "amine@hirfi.ma",
    category: "tutoring",
    title: "دروس رياضيات للباكالوريا",
    description:
      "ابني في الثانية باكالوريا علوم تجريبية ومحتاج دعم في التحليل والهندسة الفضائية. أفضّل حصتين أسبوعياً في المنزل، أو ثلاث حصص إن كان الأستاذ يرى ذلك ضرورياً.",
    budget: 800,
    city: "الرباط",
    district: "الرياض",
    urgency: "flexible",
    status: "open",
    postedDaysAgo: 1,
    offers: [
      { by: "nadia@hirfi.ma", price: 800, durationMinutes: 3600, message: "السعر عن أربع حصص شهرياً بمعدل حصتين أسبوعياً. أبدأ بتقييم مستوى التلميذ في الحصة الأولى.", status: "pending", daysAgo: 0 },
      { by: "fatima@hirfi.ma", price: 900, durationMinutes: 3600, message: "تخصّصي الدعم في الابتدائي والإعدادي، لكن يمكنني تدريس الباكالوريا للعلوم التجريبية.", status: "pending", daysAgo: 0 },
    ],
  },

  // ── خديجة (مراكش / المسيرة) ──
  {
    customer: "khadija@hirfi.ma",
    category: "photography",
    title: "تصوير حفل زفاف",
    description:
      "حفل زفاف في قاعة بجليز، الحضور حوالي 120 شخصاً. أحتاج تغطية من تحضيرات العروس إلى نهاية الحفل، مع صور عائلية وألبوم رقمي معدّل.",
    budget: 3000,
    city: "مراكش",
    district: "المسيرة",
    urgency: "flexible",
    status: "open",
    postedDaysAgo: 3,
    scheduledFor: daysAhead(21),
    offers: [
      { by: "salma@hirfi.ma", price: 3200, durationMinutes: 600, message: "تغطية 10 ساعات ومساعد ثانٍ، وألبوم رقمي من 300 صورة معدّلة في 10 أيام.", status: "pending", daysAgo: 2 },
    ],
  },
  {
    customer: "khadija@hirfi.ma",
    category: "tailoring",
    title: "خياطة قفطان تقليدي",
    description:
      "أريد قفطان مخملي بلون عنابي لعرس عائلي، مع تطريز على الصدر وأكمام واسعة. القياسات مأخوذة والقماش سأوفّره.",
    budget: 1800,
    city: "مراكش",
    district: "المسيرة",
    urgency: "flexible",
    status: "completed",
    postedDaysAgo: 25,
    agreedAmount: 1800,
    images: 2,
    offers: [
      { by: "fatima@hirfi.ma", price: 1800, durationMinutes: 2880, message: "الخياطة والتطريز يدوياً على الصدر، مع أخذ مقاسين قبل التسليم. المدة أسبوعان تقريباً.", status: "accepted", daysAgo: 24 },
      { by: "imane@hirfi.ma", price: 1950, durationMinutes: 2400, message: "أستطيع إنهاءه في تسعة أيام لكن التطريز سيكون على الآلة لا يدوياً.", status: "rejected", daysAgo: 24 },
    ],
    chat: [
      { by: "khadija@hirfi.ma", body: "فاطمة، القماش سيصلني يوم الخميس من فاس.", hoursAgo: 580 },
      { by: "fatima@hirfi.ma", body: "لا مشكلة. أرسلي لي صورة للقماش لأقترح لون الخيط المناسب.", hoursAgo: 578 },
      { by: "khadija@hirfi.ma", body: "هذه صورة له. أفضّل خيطاً ذهبياً بلا لمعة قوية.", hoursAgo: 576 },
      { by: "fatima@hirfi.ma", body: "خيار موفق. سأبدأ التطريز بعد أخذ المقاسات النهائية.", hoursAgo: 574 },
      { by: "fatima@hirfi.ma", body: "القفطان جاهز. أرسلته مع شقيقتي إلى مراكش، ويمكنك تجربته اليوم.", hoursAgo: 500 },
      { by: "khadija@hirfi.ma", body: "وصلني، الخياطة دقيقة جداً والتطريز أجمل مما تخيّلت. شكراً.", hoursAgo: 496 },
    ],
    reviews: [
      { by: "khadija@hirfi.ma", rating: 5, comment: "خياطة راقية والتطريز اليدوي يستحق كل درهم. سلّمت قبل الموعد بيومين." },
      { by: "fatima@hirfi.ma", rating: 4, comment: "زبونة راقية ووفّرت القماش كما اتفقنا. أتمنى لو أخذنا المقاس قبل بدء التطريز." },
    ],
  },
  {
    customer: "khadija@hirfi.ma",
    category: "handyman",
    title: "تركيب ستائر ومعلقات",
    description:
      "أحتاج تركيب أربع ستائر في الصالون وغرفتين، مع تصحيح ميل المعلّقات القديمة. الجدران طوب والإسمنت خفيف.",
    budget: 300,
    city: "مراكش",
    district: "المسيرة",
    urgency: "flexible",
    status: "open",
    postedDaysAgo: 2,
    offers: [
      { by: "hamza@hirfi.ma", price: 320, durationMinutes: 60, message: "سأحضر المثقاب والدعامات المناسبة لجدار الطوب. العمل يستغرق أقل من ساعة.", status: "pending", daysAgo: 1 },
    ],
  },
  {
    customer: "khadija@hirfi.ma",
    category: "electronics",
    title: "إصلاح غسالة لا تصرف الماء",
    description:
      "الغسالة تُكمل الدورة لكن الماء يبقى في الحلّة. نظّفت الفلتر دون فائدة. أظن العطل في المضخّة أو حساس المستوى.",
    budget: 450,
    city: "مراكش",
    district: "المسيرة",
    urgency: "flexible",
    status: "cancelled",
    postedDaysAgo: 10,
    offers: [
      { by: "reda@hirfi.ma", price: 480, durationMinutes: 180, message: "الأغلب مضخّة الصرف. أحضر قطعة بديلة معي لتجنّب زيارة ثانية.", status: "rejected", daysAgo: 9 },
      { by: "mehdi@hirfi.ma", price: 500, durationMinutes: 150, message: "سأفحص حساس المستوى أولاً. إن كانت المضخّة فالسعر يرتفع بثمن القطعة.", status: "rejected", daysAgo: 9 },
    ],
  },
  {
    customer: "khadija@hirfi.ma",
    category: "moving",
    title: "نقل أثاث مكتب",
    description:
      "نقل مكاتب وكراسي وخزائن من مكتب في المسيرة إلى مكتب آخر في نفس المدينة. بعض القطع ثقيلة وتحتاج رافعة صغيرة.",
    budget: 700,
    city: "مراكش",
    district: "المسيرة",
    urgency: "flexible",
    status: "open",
    postedDaysAgo: 5,
    scheduledFor: daysAhead(4),
    offers: [
      { by: "hamza@hirfi.ma", price: 750, durationMinutes: 240, message: "شاحنتي تتّسع لمكتب كامل، ومعي مساعد. الرافعة الصغيرة أستأجرها وأضيف ثمنها للفاتورة.", status: "pending", daysAgo: 4 },
      { by: "reda@hirfi.ma", price: 800, durationMinutes: 300, message: "أعمل في النقل بمساعدة شريك، لكن يجب فصل الأسلاك والتجهيزات قبل النقل.", status: "pending", daysAgo: 4 },
    ],
  },
  {
    customer: "sara@hirfi.ma",
    category: "grocery",
    title: "جيب ليا قفة من سوق السلام",
    description: "بغيت قفة فيها خضر وفواكه وحليب وخبز. صيفط ليا صورة المشتريات قبل الأداء وخلي التوصيل حتى باب الدار.",
    budget: 80,
    city: "الدار البيضاء",
    district: "المعاريف",
    urgency: "today",
    status: "open",
    postedDaysAgo: 0,
    offers: [
      { by: "meryem@hirfi.ma", price: 35, durationMinutes: 75, message: "نقدر نمشي للسوق دابا ونصيفط الصور والفاتورة قبل التوصيل.", status: "pending", daysAgo: 0 },
    ],
  },
  {
    customer: "amine@hirfi.ma",
    category: "queue",
    title: "وقف فالطابور بالنيابة",
    description: "خاصني واحد يوقف ليا فالطابور ديال مصلحة إدارية صباحاً ويبقى يصيفط ليا التحديثات حتى يجي دوري.",
    budget: 120,
    city: "الرباط",
    district: "أكدال",
    urgency: "today",
    status: "open",
    postedDaysAgo: 1,
    offers: [
      { by: "ayoub@hirfi.ma", price: 100, durationMinutes: 180, message: "نكون تما قبل الموعد ونبقى نخبرك بالترتيب والوقت المتوقع.", status: "pending", daysAgo: 0 },
    ],
  },
  {
    customer: "khadija@hirfi.ma",
    category: "rental",
    title: "كراء مثقاب وأدوات تركيب",
    description: "محتاج مثقاب قوي مع رؤوس الحفر ليوم واحد، والتوصيل والاسترجاع يكونو من عين الشق.",
    budget: 180,
    city: "الدار البيضاء",
    district: "عين الشق",
    urgency: "flexible",
    status: "open",
    postedDaysAgo: 2,
    offers: [
      { by: "tarik@hirfi.ma", price: 150, durationMinutes: 1440, message: "المثقاب متوفر مع 6 رؤوس، ونقدر نوصلو ونرجعو في نفس العنوان.", status: "pending", daysAgo: 1 },
    ],
  },
];

// ── طلبات تاريخية منتهية (تمنح الحرّافين تقييماً وسجلاً واقعياً) ───────────────
type HistorySpec = [customer: string, provider: string, category: string, title: string, amount: number, days: number, rC: number, rP: number];
const HISTORY: HistorySpec[] = [
  ["sara@hirfi.ma", "karim@hirfi.ma", "plumbing", "تغيير خلاط الحمّام الرئيسي", 550, 30, 5, 5],
  ["amine@hirfi.ma", "otmane@hirfi.ma", "hvac", "تركيب مكيّف في غرفة النوم", 780, 28, 4, 5],
  ["khadija@hirfi.ma", "salma@hirfi.ma", "photography", "تصوير جلسة عائلية", 1400, 35, 5, 5],
  ["amine@hirfi.ma", "nadia@hirfi.ma", "tutoring", "دعم في الفيزياء للجدع المشترك", 600, 22, 5, 5],
  ["sara@hirfi.ma", "mehdi@hirfi.ma", "electronics", "إصلاح تلفاز به خطوط على الشاشة", 480, 18, 4, 5],
  ["khadija@hirfi.ma", "imane@hirfi.ma", "painting", "صباغة المطبخ باللون الأبيض المطفي", 850, 15, 4, 4],
  ["sara@hirfi.ma", "hamza@hirfi.ma", "moving", "نقل غرفة نوم كاملة", 900, 40, 5, 5],
  ["amine@hirfi.ma", "reda@hirfi.ma", "electronics", "استعادة ملفات من قرص صلب معطوب", 700, 45, 5, 5],
  ["khadija@hirfi.ma", "hind@hirfi.ma", "cleaning", "تنظيف شقة بعد الدهن", 500, 12, 5, 5],
  ["amine@hirfi.ma", "karim@hirfi.ma", "electrical", "تركيب نقاط إنارة في السقف", 950, 50, 5, 4],
  ["khadija@hirfi.ma", "youssef@hirfi.ma", "carpentry", "باب داخلي خشبي جديد", 1600, 60, 5, 5],
  ["sara@hirfi.ma", "hind@hirfi.ma", "cleaning", "تنظيف مطبخ وسطح", 420, 33, 5, 5],
  ["amine@hirfi.ma", "mehdi@hirfi.ma", "electrical", "إصلاح لوحة توزيع كهربائي", 1100, 55, 5, 5],
  ["sara@hirfi.ma", "fatima@hirfi.ma", "tailoring", "تعديل ثلاثة فساتين", 380, 70, 4, 5],
];

async function main() {
  console.log("→ مسح بيانات المجال السابقة…");
  // ترتيب يحترم المفاتيح الأجنبية (الأبناء قبل الآباء).
  await db.delete(notifications);
  await db.delete(walletTransactions);
  await db.delete(reviews);
  await db.delete(messages);
  await db.delete(offers);
  await db.delete(requestImages);
  await db.delete(requests);
  await db.delete(providerWorks);
  await db.delete(providerCategories);
  await db.delete(providerProfiles);
  await db.delete(serviceCategories);
  await db.delete(users);
  console.log("  ✓ نُظّفت الجداول");

  // ── الفئات ──
  const catRows = await db
    .insert(serviceCategories)
    .values(CATEGORIES.map((c, i) => ({ slug: c.slug, nameAr: c.nameAr, icon: c.icon, sortOrder: i })))
    .returning();
  const catBySlug = new Map(catRows.map((c) => [c.slug, c.id]));
  console.log(`  ✓ ${catRows.length} فئة خدمة`);

  // ── المستخدمون + الملفات ──
  const userIdByEmail = new Map<string, string>();

  // حساب المشرف — خارج قائمة USERS التجريبية لأنّ دوره مختلف تماماً (admin لا
  // يظهر في السوق ولا يُقيَّم). كلمة مروره من نفس DEMO_PASSWORD للعرض المحلي.
  {
    const [adminRow] = await db
      .insert(users)
      .values({
        email: ADMIN_EMAIL,
        passwordHash: hash,
        name: "مشرف المنصّة",
        role: "admin",
      })
      .returning();
    await db.insert(providerProfiles).values({
      userId: adminRow.id,
      role: "customer",
      displayName: "مشرف المنصّة",
      city: "الدار البيضاء",
      isVerified: false,
      createdAt: daysAgo(120),
      updatedAt: daysAgo(1),
    });
    console.log(`  ✓ حساب المشرف: ${ADMIN_EMAIL} / ${DEMO_PASSWORD}`);
  }

  for (const u of USERS) {
    const [row] = await db
      .insert(users)
      .values({ email: u.email, passwordHash: hash, name: u.name, role: "user" })
      .returning();
    userIdByEmail.set(u.email, row.id);
    await db.insert(providerProfiles).values({
      userId: row.id,
      role: u.role,
      displayName: u.name,
      phone: u.phone ?? null,
      bio: u.bio ?? null,
      city: u.city,
      district: u.district,
      yearsExperience: u.years ?? 0,
      isVerified: u.verified ?? false,
      avatarUrl: `https://i.pravatar.cc/160?u=${encodeURIComponent(u.email)}`,
      createdAt: daysAgo(90),
      updatedAt: daysAgo(2),
    });
  }
  console.log(`  ✓ ${USERS.length} مستخدماً (كلمة المرور: ${DEMO_PASSWORD})`);

  // ── المهارات + صور الأعمال ──
  let skillCount = 0;
  let workCount = 0;
  for (const u of USERS) {
    const uid = userIdByEmail.get(u.email)!;
    for (const slug of u.skills ?? []) {
      await db
        .insert(providerCategories)
        .values({ providerUserId: uid, categoryId: catBySlug.get(slug)! })
        .onConflictDoNothing();
      skillCount++;
    }
    for (const [i, w] of (u.works ?? []).entries()) {
      await db.insert(providerWorks).values({
        providerUserId: uid,
        imageUrl: categoryImage(u.skills?.[i % Math.max(1, u.skills.length)]),
        caption: w.caption,
        createdAt: daysAgo(30 - i * 5),
      });
      workCount++;
    }
  }
  console.log(`  ✓ ${skillCount} مهارة و${workCount} صورة عمل`);

  // ── الطلبات التفصيلية ──
  let offerCount = 0;
  let reqCount = 0;
  const completedPairs: { requestId: string; customerId: string; providerId: string; title: string; amount: number }[] = [];

  for (const r of REQUESTS) {
    const customerId = userIdByEmail.get(r.customer)!;
    const createdAt = daysAgo(r.postedDaysAgo);
    const accepted = r.offers.find((o) => o.status === "accepted");
    const agreedAmount = r.agreedAmount ?? accepted?.price ?? null;
    const [reqRow] = await db
      .insert(requests)
      .values({
        customerId,
        categoryId: catBySlug.get(r.category)!,
        title: r.title,
        description: r.description,
        budgetAmount: r.budget,
        city: r.city,
        district: r.district,
        urgency: r.urgency,
        scheduledFor: r.scheduledFor ?? null,
        status: r.status,
        agreedAmount,
        createdAt,
        updatedAt: daysAgo(Math.max(0, r.postedDaysAgo - 2)),
      })
      .returning();
    reqCount++;

    // صورة واحدة معبّرة عن الفئة لكل طلب — تكرار الصورة نفسها مرّتين في معرض واحد يبدو خطأً.
    if ((r.images ?? 0) > 0) {
      await db.insert(requestImages).values({
        requestId: reqRow.id,
        imageUrl: categoryImage(r.category),
        createdAt,
      });
    }

    // العروض
    const offerIdByProvider = new Map<string, string>();
    for (const o of r.offers) {
      const providerId = userIdByEmail.get(o.by)!;
      const [offRow] = await db
        .insert(offers)
        .values({
          requestId: reqRow.id,
          providerUserId: providerId,
          price: o.price,
          durationMinutes: o.durationMinutes,
          message: o.message,
          status: o.status,
          createdAt: daysAgo(o.daysAgo),
          updatedAt: daysAgo(o.daysAgo),
        })
        .returning();
      offerCount++;
      offerIdByProvider.set(o.by, offRow.id);
      if (o.status === "accepted") {
        await db.update(requests).set({ acceptedOfferId: offRow.id }).where(eq(requests.id, reqRow.id));
        completedPairs.push({ requestId: reqRow.id, customerId, providerId, title: r.title, amount: o.price });
      }
    }

    // المحادثة
    for (const c of r.chat ?? []) {
      await db.insert(messages).values({
        requestId: reqRow.id,
        senderId: userIdByEmail.get(c.by)!,
        body: c.body,
        createdAt: hoursAgo(c.hoursAgo),
      });
    }

    // التقييمات المتبادلة
    for (const rv of r.reviews ?? []) {
      const authorId = userIdByEmail.get(rv.by)!;
      const targetId = authorId === customerId ? (accepted ? userIdByEmail.get(accepted.by)! : null) : customerId;
      if (!targetId) continue;
      await db.insert(reviews).values({
        requestId: reqRow.id,
        authorId,
        targetId,
        rating: rv.rating,
        comment: rv.comment,
        createdAt: daysAgo(Math.max(0, r.postedDaysAgo - 5)),
      });
    }

    // إشعارات العرض/القبول
    await db.insert(notifications).values({
      userId: customerId,
      type: "offer",
      title: r.offers.length ? `وصل عرض جديد على «${r.title}»` : `طلبك «${r.title}» منشور`,
      body: r.offers.length
        ? `لديك ${r.offers.length} عرضاً — قارن الأسعار والمدة واختر الأنسب.`
        : "لم يصل عرض بعد. الطلبات ذات الصور والوصف الواضح تحصل على عروض أسرع.",
      requestId: reqRow.id,
      isRead: r.status !== "open",
      createdAt,
    });
  }
  console.log(`  ✓ ${reqCount} طلباً و${offerCount} عرضاً`);

  // ── الطلبات التاريخية المنتهية ──
  for (const [cust, prov, cat, title, amount, days, rC, rP] of HISTORY) {
    const customerId = userIdByEmail.get(cust)!;
    const providerId = userIdByEmail.get(prov)!;
    const createdAt = daysAgo(days);
    const [reqRow] = await db
      .insert(requests)
      .values({
        customerId,
        categoryId: catBySlug.get(cat)!,
        title,
        description: `${title} — عمل منجز عبر «حِرْفي» وتُرك تقييمه للطرفين.`,
        budgetAmount: amount,
        city: USERS.find((u) => u.email === cust)!.city,
        district: USERS.find((u) => u.email === cust)!.district,
        urgency: "flexible",
        status: "completed",
        agreedAmount: amount,
        createdAt,
        updatedAt: daysAgo(Math.max(0, days - 3)),
      })
      .returning();
    reqCount++;

    const [offRow] = await db
      .insert(offers)
      .values({
        requestId: reqRow.id,
        providerUserId: providerId,
        price: amount,
        durationMinutes: 240,
        message: "أتعهّد بإنجاز العمل في المدة المتفق عليها وعلى أحسن وجه.",
        status: "accepted",
        createdAt,
      })
      .returning();
    offerCount++;
    await db.update(requests).set({ acceptedOfferId: offRow.id }).where(eq(requests.id, reqRow.id));

    // يُضاف لنفس مجموعة الأعمال المنجزة، فيدخل في بناء المحفظة تلقائياً.
    completedPairs.push({ requestId: reqRow.id, customerId, providerId, title, amount });

    // تقييم متبادل لكل عمل منتهٍ — هو ما يبني سمعة الحرّاف ومعدّله الظاهر.
    await db.insert(reviews).values([
      {
        requestId: reqRow.id,
        authorId: customerId,
        targetId: providerId,
        rating: rC,
        comment:
          rC >= 5
            ? "عمل متقن واحترام تام للموعد، أنصح به وبقوة."
            : "النتيجة جيدة والسعر معقول، مع تأخّر بسيط في البداية.",
        createdAt: daysAgo(Math.max(0, days - 4)),
      },
      {
        requestId: reqRow.id,
        authorId: providerId,
        targetId: customerId,
        rating: rP,
        comment: rP >= 5 ? "زبون محترم ووفّر كل الظروف للعمل." : "التعامل طيّب، والمكان كان جاهزاً جزئياً.",
        createdAt: daysAgo(Math.max(0, days - 3)),
      },
    ]);

    await db.insert(notifications).values([
      {
        userId: customerId,
        type: "completed",
        title: "تم إتمام الطلب",
        body: `أُنجز «${title}». لا تنسَ تقييم الحرّاف.`,
        requestId: reqRow.id,
        isRead: true,
        createdAt: daysAgo(Math.max(0, days - 1)),
      },
      {
        userId: providerId,
        type: "completed",
        title: "أُنجز العمل",
        body: `تم إنجاز «${title}». حصّل أجرك من الزبون مباشرة.`,
        requestId: reqRow.id,
        isRead: true,
        createdAt: daysAgo(Math.max(0, days - 1)),
      },
    ]);
  }
  console.log(`  ✓ ${HISTORY.length} طلباً تاريخياً منتهياً`);

  // ── المحفظة: عمولة المنصّة على الحرّاف فقط ──
  // النموذج: الزبون يدفع الحرّاف مباشرة (خارج المنصّة)، فلا قيود دفع/استحقاق هنا.
  // ما يُسجَّل هو شحن الحرّاف لرصيده وخصم عمولة المنصّة لحظة القبول.
  const walletRows: (typeof walletTransactions.$inferInsert)[] = [];
  for (const p of completedPairs) {
    const fee = Math.round((p.amount * PLATFORM_FEE_PERCENT) / 100);
    walletRows.push({
      userId: p.providerId,
      requestId: p.requestId,
      type: "fee",
      amount: -fee,
      description: `عمولة المنصّة ${PLATFORM_FEE_PERCENT}% على «${p.title}»`,
      createdAt: daysAgo(10),
    });
  }
  // شحن افتراضي يمنح أرصدة الحرّافين معنى (المحفظة سجلّ داخلي لا بوابة دفع).
  walletRows.push(
    { userId: userIdByEmail.get("karim@hirfi.ma")!, type: "topup", amount: 500, description: "شحن المحفظة", createdAt: daysAgo(90) },
    { userId: userIdByEmail.get("amine@hirfi.ma")!, type: "topup", amount: 400, description: "شحن المحفظة", createdAt: daysAgo(55) },
    { userId: userIdByEmail.get("khadija@hirfi.ma")!, type: "topup", amount: 600, description: "شحن المحفظة", createdAt: daysAgo(50) },
    { userId: userIdByEmail.get("youssef@hirfi.ma")!, type: "topup", amount: 300, description: "شحن المحفظة", createdAt: daysAgo(45) },
  );
  await db.insert(walletTransactions).values(walletRows);
  console.log(`  ✓ ${walletRows.length} معاملة محفظة`);

  // ── المجاميع المشتقّة (لا تُكتب يدوياً) ──
  await db.execute(sql`
    UPDATE provider_profiles p SET
      rating_sum   = COALESCE(r.sum, 0),
      rating_count = COALESCE(r.count, 0)
    FROM (
      SELECT target_id, SUM(rating)::int AS sum, COUNT(*)::int AS count
      FROM reviews GROUP BY target_id
    ) r
    WHERE p.user_id = r.target_id
  `);
  await db.execute(sql`
    UPDATE provider_profiles p SET
      is_verified = TRUE
    WHERE p.role = 'provider' AND p.rating_count >= 2 AND p.rating_sum * 1.0 / p.rating_count >= 4.5
  `);
  await db.execute(sql`
    UPDATE provider_profiles p SET
      completed_jobs = COALESCE(j.count, 0)
    FROM (
      SELECT o.provider_user_id, COUNT(*)::int AS count
      FROM requests rq JOIN offers o ON o.id = rq.accepted_offer_id
      WHERE rq.status = 'completed'
      GROUP BY o.provider_user_id
    ) j
    WHERE p.user_id = j.provider_user_id
  `);
  // أساس من الأعمال السابقة للمنصّة (خبرة سابقة) — يُضاف بعد حساب أعمال المنصّة.
  for (const u of USERS) {
    if (!u.baseJobs) continue;
    await db
      .update(providerProfiles)
      .set({ completedJobs: sql`${providerProfiles.completedJobs} + ${u.baseJobs}` })
      .where(eq(providerProfiles.userId, userIdByEmail.get(u.email)!));
  }

  // ── إشعارات إضافية (جرس غير فارغ عند أول دخول) ──
  const extra: (typeof notifications.$inferInsert)[] = [
    {
      userId: userIdByEmail.get("karim@hirfi.ma")!,
      type: "offer",
      title: "طلب جديد في حيّك",
      body: "طلب «تسريب ماء تحت حوض المطبخ» في المعاريف — ميزانية 400 درهم.",
      isRead: false,
      createdAt: hoursAgo(3),
    },
    {
      userId: userIdByEmail.get("karim@hirfi.ma")!,
      type: "review",
      title: "تقييم جديد من زبونة",
      body: "حصلت على 5/5 على «تغيير خلاط الحمّام الرئيسي».",
      isRead: false,
      createdAt: daysAgo(2),
    },
    {
      userId: userIdByEmail.get("sara@hirfi.ma")!,
      type: "message",
      title: "رسالة جديدة",
      body: "رسالة على «تركيب رفوف خشبية في الصالون».",
      isRead: false,
      createdAt: hoursAgo(6),
    },
    {
      userId: userIdByEmail.get("sara@hirfi.ma")!,
      type: "accepted",
      title: "تم تثبيت السعر المقبول",
      body: "اتفقت على «تنظيف شامل للشقة قبل العيد» بـ 650 درهم.",
      isRead: true,
      createdAt: daysAgo(2),
    },
    {
      userId: userIdByEmail.get("hind@hirfi.ma")!,
      type: "accepted",
      title: "تم قبول عرضك",
      body: "قبل الزبون عرضك على «تنظيف شامل للشقة قبل العيد».",
      isRead: false,
      createdAt: daysAgo(2),
    },
    {
      userId: userIdByEmail.get("youssef@hirfi.ma")!,
      type: "accepted",
      title: "تم قبول عرضك",
      body: "قبلت سارة عرضك على «تركيب رفوف خشبية في الصالون» بـ 950 درهم.",
      isRead: false,
      createdAt: daysAgo(4),
    },
    {
      userId: userIdByEmail.get("otmane@hirfi.ma")!,
      type: "accepted",
      title: "تم قبول عرضك",
      body: "قبل أمين عرضك على «صيانة ثلاثة مكيّفات في المكتب».",
      isRead: true,
      createdAt: daysAgo(3),
    },
    {
      userId: userIdByEmail.get("reda@hirfi.ma")!,
      type: "offer",
      title: "طلب جديد في مجال تخصّصك",
      body: "«إصلاح حاسوب محمول لا يشتغل» — ميزانية 350 درهم.",
      isRead: false,
      createdAt: daysAgo(3),
    },
  ];
  await db.insert(notifications).values(extra);

  // ── تقرير نهائي ──
  const counts = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM service_categories) AS categories,
      (SELECT COUNT(*) FROM users)             AS users,
      (SELECT COUNT(*) FROM provider_profiles WHERE role = 'provider') AS providers,
      (SELECT COUNT(*) FROM requests)          AS requests,
      (SELECT COUNT(*) FROM offers)            AS offers,
      (SELECT COUNT(*) FROM messages)          AS messages,
      (SELECT COUNT(*) FROM reviews)           AS reviews,
      (SELECT COUNT(*) FROM wallet_transactions) AS wallet,
      (SELECT COUNT(*) FROM notifications)     AS notifications
  `);
  console.log("\n📊 ملخّص البذور:", JSON.stringify(counts.rows[0] ?? counts, null, 1));
  console.log("\n✅ تمّت البذور. حسابا العرض:");
  console.log("   زبون   → sara@hirfi.ma / demo1234");
  console.log("   حرّاف  → karim@hirfi.ma / demo1234");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ فشلت البذور:", e);
    process.exit(1);
  });
