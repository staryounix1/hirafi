// ── كتالوج خدمات «حِرْفي» — المصدر الواحد للزرع والقاعدة الحيّة ────────────────
// كل خدمة تحمل نوعها (ميداني/رقمي/شركات) وعمولتها وشرط التوثيق ووصفاً مختصراً.
// الملف مشترك بين الخادم والواجهة (الأيقونة اسم lucide) وبين az seed والهجرة.
import type { ServiceKind } from "./constants";

export interface CatalogEntry {
  slug: string;
  nameAr: string;
  icon: string;
  kind: ServiceKind;
  commissionPercent: number;
  requiresVerification?: boolean;
  description: string;
}

const field = (e: Omit<CatalogEntry, "kind" | "commissionPercent">): CatalogEntry => ({
  ...e,
  kind: "field",
  commissionPercent: 15,
});
const digital = (e: Omit<CatalogEntry, "kind" | "commissionPercent">): CatalogEntry => ({
  ...e,
  kind: "digital",
  commissionPercent: 12,
});
const b2b = (e: Omit<CatalogEntry, "kind" | "commissionPercent">): CatalogEntry => ({
  ...e,
  kind: "b2b",
  commissionPercent: 10,
});

export const SERVICE_CATALOG: CatalogEntry[] = [
  // ── ميداني — حرف أساسية (الموجودة) ──
  field({ slug: "plumbing", nameAr: "سباكة", icon: "Wrench", description: "تسريبات، خلاطات، سخانات وأنابيب." }),
  field({ slug: "electrical", nameAr: "كهرباء", icon: "Zap", description: "إنارة، لوحات توزيع وإصلاح أعطال." }),
  field({ slug: "carpentry", nameAr: "نجارة", icon: "Hammer", description: "أبواب، خزائن وأثاث خشبي." }),
  field({ slug: "painting", nameAr: "صباغة", icon: "PaintRoller", description: "صباغة الجدران والأسقف بمختلف الأنواع." }),
  field({ slug: "hvac", nameAr: "تكييف وتبريد", icon: "Snowflake", description: "تركيب وصيانة المكيّفات والثلاجات." }),
  field({ slug: "cleaning", nameAr: "تنظيف", icon: "Sparkles", description: "تنظيف المنازل والمكاتب بعمق." }),
  field({ slug: "moving", nameAr: "نقل أثاث", icon: "Truck", description: "نقل وتركيب الأثاث بأمان." }),
  field({ slug: "electronics", nameAr: "إصلاح إلكترونيات", icon: "Smartphone", description: "تلفاز، حواسيب وأجهزة إلكترونية." }),
  field({ slug: "tailoring", nameAr: "خياطة", icon: "Scissors", description: "خياطة وتعديل الملابس." }),
  field({ slug: "photography", nameAr: "تصوير", icon: "Camera", description: "تصوير المناسبات والمنتجات." }),
  field({ slug: "tutoring", nameAr: "دروس خصوصية", icon: "GraduationCap", description: "دعم دراسي لجميع المستويات." }),
  field({ slug: "handyman", nameAr: "خدمات عامة", icon: "Settings", description: "إصلاحات صغيرة ومتنوعة." }),
  field({ slug: "grocery", nameAr: "قضاء الأغراض", icon: "ShoppingBasket", description: "شراء وتوصيل احتياجاتك." }),
  field({ slug: "queue", nameAr: "الوقوف فالطابور", icon: "ListChecks", description: "نيابة عنك في الطوابير والمهام." }),
  field({ slug: "rental", nameAr: "الكراء", icon: "KeyRound", description: "كراء معدّات ولوازم." }),

  // ── ميداني — بناية وتشطيب ──
  field({ slug: "building", nameAr: "البناء والتشييد", icon: "Hammer", description: "أعمال البناء والترميم بالقياس." }),
  field({ slug: "blacksmith", nameAr: "الحدادة", icon: "Hammer", description: "أبواب، ويندوات ودرابزين معدني." }),
  field({ slug: "aluminum", nameAr: "الألمنيوم والزجاج", icon: "Wrench", description: "نوافذ، واجهات وأبواب زجاجية." }),
  field({ slug: "plaster-decor", nameAr: "جبص وديكورات الأسقف", icon: "Hammer", description: "أسقف جبصية وديكور بالقياس." }),
  field({ slug: "interior-finishing", nameAr: "طلاء وتشطيب داخلي", icon: "PaintRoller", description: "تشطيبات راقية بفرق الجودة." }),
  field({ slug: "aluminum-glass", nameAr: "زجاج ومقاطع", icon: "Wrench", description: "تركيب الزجاج والمقاطع." }),
  field({ slug: "solar-panels", nameAr: "الطاقة الشمسية", icon: "Sun", description: "تركيب الألواح والسخانات الشمسية." }),
  field({ slug: "post-construction-cleaning", nameAr: "تنظيف ما بعد البناء", icon: "Sparkles", description: "إزالة مخلفات البناء وتنظيف شامل." }),

  // ── ميداني — إصلاح وصيانة ──
  field({ slug: "appliance-repair", nameAr: "إصلاح الأجهزة المنزلية", icon: "Settings", description: "ثلاجة، مكينة غسيل، فور." }),
  field({ slug: "gas-heating", nameAr: "صيانة السخانات والغاز", icon: "Flame", description: "فحص وصيانة آمنة للسخانات.", requiresVerification: true }),
  field({ slug: "cctv-security", nameAr: "كاميرات وإنترسوم", icon: "ShieldCheck", description: "تركيب كاميرات المراقبة والإنترسوم." }),
  field({ slug: "device-repair", nameAr: "إصلاح الهواتف والحواسيب", icon: "Laptop", description: "إصلاح فالمكان بموديل الجهاز." }),
  field({ slug: "pest-control", nameAr: "مكافحة الحشرات", icon: "Bug", description: "رشّ وقائي ودوري للمنازل." }),
  field({ slug: "cctv", nameAr: "المراقبة والأمن المنزلي", icon: "ShieldCheck", description: "حلول أمن البيوت والمتاجر." }),

  // ── ميداني — سيارات ──
  field({ slug: "car-wash", nameAr: "غسيل السيارات", icon: "Car", description: "غسيل فالمكان بعناية." }),
  field({ slug: "car-mechanic", nameAr: "ميكانيك السيارات", icon: "Car", description: "إصلاح طارئ (رود سايد) وميكانيك." }),
  field({ slug: "car-bodywork", nameAr: "سمكرة وصباغة السيارات", icon: "Car", description: "سمكرة وصباغة بجودة الورشة." }),

  // ── ميداني — منزل وعناية ──
  field({ slug: "gardening", nameAr: "البستنة والحدائق", icon: "Trees", description: "تمشيط، تقليم وصيانة الحدائق." }),
  field({ slug: "home-care", nameAr: "مساعدة منزلية وجليسة", icon: "HeartHandshake", description: "مساعدة بالمنزل ورعاية الأطفال." }),
  field({ slug: "catering", nameAr: "الطبخ والمناسبات", icon: "ChefHat", description: "طبخ الأعراس والمناسبات." }),
  field({ slug: "beauty", nameAr: "الكوافير والحلاقة", icon: "Scissors", description: "حلاقة وتجميل فالمكان." }),
  field({ slug: "health-care", nameAr: "رعاية صحية بسيطة", icon: "Stethoscope", description: "حجامة وخدمات صحية بسيطة.", requiresVerification: true }),

  // ── رقمي — فريلانس ──
  digital({ slug: "logo-design", nameAr: "لوغو وهوية بصرية", icon: "Palette", description: "تصميم شعار وهوية كاملة." }),
  digital({ slug: "video-editing", nameAr: "مونتاج فيديو وريلز", icon: "Clapperboard", description: "مونتاج احترافي للمحتوى والقنوات." }),
  digital({ slug: "social-media", nameAr: "إدارة صفحات وتواصل", icon: "Share2", description: "إدارة شهرية للصفحات والمحتوى." }),
  digital({ slug: "social-design", nameAr: "تصميم منشورات ومحتوى بصري", icon: "Image", description: "منشورات ومحتوى بصري للسوشل." }),
  digital({ slug: "content-writing", nameAr: "كتابة مقالات ومحتوى", icon: "PenLine", description: "محتوى عربي/فرنسي للمتاجر والشركات." }),
  digital({ slug: "photo-editing", nameAr: "تحرير الصور وتحسين جودتها", icon: "ImagePlus", description: "تنقيح، تفريغ ورفع جودة الصور." }),
  digital({ slug: "translation", nameAr: "ترجمة وتعريبة المحتوى", icon: "Languages", description: "ترجمة عربية↔فرنسية↔إنجليزية." }),
  digital({ slug: "ecommerce-store", nameAr: "متجر إلكتروني", icon: "ShoppingCart", description: "إنشاء متجر بسيط جاهز للبيع." }),
  digital({ slug: "web-development", nameAr: "موقع وصفحة هبوط", icon: "Code2", description: "تطوير مواقع وصفحات هبوط سريعة." }),
  digital({ slug: "backend-dev", nameAr: "باك-إند وواجهات API", icon: "Server", description: "خدمات خلفية وقواعد بيانات وواجهات." }),
  digital({ slug: "voice-over", nameAr: "تعليق صوتي بالدارجة", icon: "Mic", description: "تعليق صوتي مغربي أصيل." }),
  digital({ slug: "mobile-app", nameAr: "تطبيق جوال", icon: "Smartphone", description: "تطبيقات أندرويد/iOS بسيطة." }),

  // ── شركات — عقود ودوريات ──
  b2b({ slug: "office-cleaning", nameAr: "تنظيف وتعقيم المكاتب", icon: "Building2", description: "عقد شهري لتنظيف المقارّ." }),
  b2b({ slug: "building-maintenance", nameAr: "صيانة المباني بعقد", icon: "Wrench", description: "كهرباء، سباكة وتنظيف بعقد سنوي." }),
  b2b({ slug: "office-moving", nameAr: "نقل وتركيب مكاتب الشركات", icon: "Truck", description: "نقل مقراتّ ومكاتب بعقد." }),
  b2b({ slug: "sales-rep", nameAr: "مناديب مبيعات وتوزيع", icon: "Briefcase", description: "مندوبون للشركات والتوزيع." }),
  b2b({ slug: "corporate-delivery", nameAr: "توصيل محلي للشركات", icon: "Truck", description: "توصيل يومي خلال ساعات العمل." }),
  b2b({ slug: "inventory", nameAr: "عدّ وجرد السلعة", icon: "ClipboardList", description: "جرد المخزون موسمياً." }),
  b2b({ slug: "private-security", nameAr: "حراسة ومصاحبة الأحداث", icon: "ShieldCheck", description: "حراسة خاصة وفق القانون.", requiresVerification: true }),
];

export const CATALOG_BY_SLUG = new Map(SERVICE_CATALOG.map((c) => [c.slug, c]));
