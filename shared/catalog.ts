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

  // ── ميداني — خدمات جديدة (من قائمة التوسيع) ──
  field({ slug: "masonry", nameAr: "البنّاء والأشغال", icon: "HardHat", description: "بناء، ترميم وأشغال بالقياس." }),
  field({ slug: "welding", nameAr: "اللحام والحدادة الفنية", icon: "Flame", description: "لحام المعادن والأبواب والدربزين." }),
  field({ slug: "locksmith", nameAr: "السباكة والفتح الطارئ", icon: "KeyRound", description: "فتح الأبواب والأقفال الطارئة." }),
  field({ slug: "movers-office", nameAr: "نقل وتركيب المكاتب", icon: "Truck", description: "نقل الأثاث والتجهيزات المكتبية." }),
  field({ slug: "babysitting", nameAr: "جليسة أطفال بالساعة", icon: "Baby", description: "رعاية الأطفال بالمنزل بالساعة.", requiresVerification: true }),
  field({ slug: "laundry", nameAr: "كي وغسيل الملابس", icon: "Shirt", description: "كي الملابس وغسيلها بجودة." }),
  field({ slug: "tiling-zellige", nameAr: "تبليط وزليج", icon: "Grid3x3", description: "تركيب الزليج والرخام للأرضيات." }),
  field({ slug: "insulation", nameAr: "العزل الحراري والمائي", icon: "Layers", description: "عزل الأسطح والجدران ضد الماء." }),
  field({ slug: "paving", nameAr: "تبليط الخارج والمسارات", icon: "Route", description: "تبليط الأفنية والمداخل والمسارات." }),
  field({ slug: "waterproofing", nameAr: "معالجة الرطوبة والتسربات", icon: "Droplets", description: "معالجة الرطوبة وتسربات المياه." }),
  field({ slug: "pool-cleaning", nameAr: "صيانة وتنظيف المسابح", icon: "Waves", description: "تنظيف وصيانة دورية للمسابح." }),
  field({ slug: "well-drilling", nameAr: "حفر الآبار والري", icon: "Droplet", description: "حفر الآبار وأنظمة الري الفلاحي." }),
  field({ slug: "extermination", nameAr: "مكافحة القوارض والحشرات", icon: "Bug", description: "رش ومكافحة القوارض دورياً." }),
  field({ slug: "signage", nameAr: "اللافتات والواجهات الإشهارية", icon: "Signpost", description: "تصميم وتركيب اللافتات للواجهات." }),
  field({ slug: "glazing", nameAr: "تركيب الزجاج والأبواب", icon: "Square", description: "زجاج، أبواب وشبابيك بالقياس." }),
  field({ slug: "floor-laying", nameAr: "تركيب الباركي والأرضيات", icon: "LayoutPanelTop", description: "تركيب الباركي والأرضيات الخشبية." }),
  field({ slug: "terrace-waterproof", nameAr: "عزل الشرفات والأسطح", icon: "Umbrella", description: "عزل الشرفات والأسطح ضد الأمطار." }),
  field({ slug: "marble-fitting", nameAr: "تركيب الرخام والغرانيت", icon: "Gem", description: "قص وتركيب الرخام والغرانيت." }),
  field({ slug: "carpentry-bespoke", nameAr: "نجارة الأثاث بالقياس", icon: "Hammer", description: "خزائن، مطابخ وأثاث بالقياس." }),
  field({ slug: "curtain-install", nameAr: "تركيب الستائر والديكور", icon: "Ribbon", description: "تركيب الستائر وحلول التزيين." }),

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

  // ── رقمي — خدمات جديدة ──
  digital({ slug: "seo", nameAr: "تحسين الظهور SEO", icon: "Search", description: "تحسين ترتيب موقعك فمحركات البحث." }),
  digital({ slug: "ads-management", nameAr: "إدارة الإعلانات الممولة", icon: "Megaphone", description: "حملات فيسبوك وإنستغرام والإعلانات." }),
  digital({ slug: "motion-graphics", nameAr: "موشن غرافيك وإنفوجرافيك", icon: "Film", description: "فيديوهات متحركة وإنفوجرافيك." }),
  digital({ slug: "brand-guidelines", nameAr: "دليل الهوية البصرية", icon: "BookOpen", description: "دليل استعمال الشعار والألوان والخطوط." }),
  digital({ slug: "ui-ux", nameAr: "تصميم واجهات UI/UX", icon: "PenTool", description: "تصميم واجهات وتجربة المستخدم." }),
  digital({ slug: "data-entry", nameAr: "إدخال وترتيب البيانات", icon: "Table", description: "إدخال وتنظيم البيانات فالجدول." }),
  digital({ slug: "virtual-assistant", nameAr: "مساعد افتراضي عن بُعد", icon: "UserCog", description: "مساعدة إدارية وتنسيق عن بُعد." }),
  digital({ slug: "podcast-editing", nameAr: "مونتاج البودكاست والصوت", icon: "AudioLines", description: "تنقية ومونتاج الحلقات الصوتية." }),
  digital({ slug: "email-marketing", nameAr: "التسويق بالبريد الإلكتروني", icon: "Mail", description: "حملات بريدية وقوائم مشتركين." }),
  digital({ slug: "copywriting", nameAr: "كتابة إعلانية وتسويقية", icon: "Feather", description: "نصوص إعلانية تبيع للمنتج." }),

  // ── شركات — عقود ودوريات ──
  b2b({ slug: "office-cleaning", nameAr: "تنظيف وتعقيم المكاتب", icon: "Building2", description: "عقد شهري لتنظيف المقارّ." }),
  b2b({ slug: "building-maintenance", nameAr: "صيانة المباني بعقد", icon: "Wrench", description: "كهرباء، سباكة وتنظيف بعقد سنوي." }),
  b2b({ slug: "office-moving", nameAr: "نقل وتركيب مكاتب الشركات", icon: "Truck", description: "نقل مقراتّ ومكاتب بعقد." }),
  b2b({ slug: "sales-rep", nameAr: "مناديب مبيعات وتوزيع", icon: "Briefcase", description: "مندوبون للشركات والتوزيع." }),
  b2b({ slug: "corporate-delivery", nameAr: "توصيل محلي للشركات", icon: "Truck", description: "توصيل يومي خلال ساعات العمل." }),
  b2b({ slug: "inventory", nameAr: "عدّ وجرد السلعة", icon: "ClipboardList", description: "جرد المخزون موسمياً." }),
  b2b({ slug: "private-security", nameAr: "حراسة ومصاحبة الأحداث", icon: "ShieldCheck", description: "حراسة خاصة وفق القانون.", requiresVerification: true }),

  // ── شركات — خدمات جديدة ──
  b2b({ slug: "b2b-catering", nameAr: "تموين الشركات والمناسبات", icon: "UtensilsCrossed", description: "وجبات وتموين للاجتماعات والمناسبات." }),
  b2b({ slug: "b2b-landscaping", nameAr: "تهيئة وصيانة الفضاءات الخضراء", icon: "Trees", description: "صيانة حدائق ومحيط المقارّ بعقد." }),
  b2b({ slug: "b2b-it-support", nameAr: "الدعم المعلوماتي للشركات", icon: "MonitorCog", description: "دعم تقني، شبكات وصيانة حواسيب." }),
  b2b({ slug: "b2b-recruitment", nameAr: "التوظيف والانتقاء", icon: "UserPlus", description: "انتقاء مرشحين وتوظيف للشركات." }),
  b2b({ slug: "b2b-accounting", nameAr: "المحاسبة والتصريحات", icon: "Calculator", description: "مسك الحسابات والتصريحات الجبائية." }),
  b2b({ slug: "b2b-training", nameAr: "تكوين الفرق والموظفين", icon: "Presentation", description: "دورات تكوينية لفائدة الموظفين." }),
  b2b({ slug: "b2b-signage", nameAr: "الإشهار ولافتات المقارّ", icon: "Signpost", description: "لافتات وواجهات ومطبوعات الشركات." }),
  b2b({ slug: "b2b-packaging", nameAr: "التغليف وتجهيز الطلبات", icon: "Package", description: "تغليف وتجهيز الطلبات للشحن." }),
  b2b({ slug: "b2b-transport", nameAr: "النقل واللوجستيك", icon: "Truck", description: "نقل السلع واللوجستيك بعقد." }),
  b2b({ slug: "b2b-print", nameAr: "الطباعة والتجليد", icon: "Printer", description: "طباعة وتجليد وثائق الشركات." }),
];

export const CATALOG_BY_SLUG = new Map(SERVICE_CATALOG.map((c) => [c.slug, c]));
