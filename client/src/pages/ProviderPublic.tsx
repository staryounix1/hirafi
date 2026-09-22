// ── الملف العام للحرف: ما يراه الزبون قبل أن يقبل عرضاً ───────────────────────────
import { Link, useParams } from "wouter";
import { ArrowRight, Briefcase, Check, Clock, MapPin, Star, Info, Award } from "lucide-react";
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  Stars,
  VerifiedBadge,
} from "@/components/hirfi/primitives";
import { trpc } from "@/_core/trpc";
import { categoryIcon, countAr, errorMessage, formatDateAr, ratingAvg } from "@/lib/format";

export default function ProviderPublic() {
  const params = useParams() as { id?: string };
  const id = params.id ?? "";
  const q = trpc.profile.public.useQuery({ userId: id }, { enabled: !!id });

  if (!id)
    return (
      <div className="p-4">
        <ErrorState message="رابط الملف غير صالح." />
      </div>
    );

  if (q.isLoading) {
    return (
      <div className="grid gap-4 px-4 pt-5">
        <div className="hirfi-skeleton h-24 rounded-3xl" />
        <div className="hirfi-skeleton h-40 rounded-3xl" />
        <div className="hirfi-skeleton h-56 rounded-3xl" />
      </div>
    );
  }
  if (q.isError) {
    return (
      <div className="p-4">
        <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
      </div>
    );
  }
  if (!q.data) return null;

  const { profile, skills, works, reviews } = q.data;
  const avg = ratingAvg(profile.ratingSum, profile.ratingCount);
  const isProvider = profile.role === "provider";

  return (
    <div className="grid pb-6">
      <div className="px-4 pt-4">
        <Link
          href="/browse"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-muted-foreground"
        >
          <ArrowRight className="size-3.5" />
          عودة
        </Link>
      </div>

      <PageHeader
        icon={isProvider ? Briefcase : MapPin}
        title={profile.displayName}
        description={`${profile.city}${profile.district ? ` — ${profile.district}` : ""}${
          isProvider ? ` · ${profile.yearsExperience} سنة خبرة` : " · حساب زبون"
        }`}
        action={profile.isVerified ? <VerifiedBadge /> : null}
      />

      {/* الأرقام الثلاثة */}
      <section className="grid grid-cols-3 gap-2 px-4 pt-4">
        <div className="card-flat p-3">
          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
            <Star className="size-3 fill-warn text-warn" />
            التقييم
          </div>
          <div className="text-price mt-1.5 text-[22px] leading-none">
            {avg !== null ? avg : "—"}
          </div>
          <div className="mt-1.5">
            <Stars value={avg ?? 0} size="sm" />
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">{countAr(profile.ratingCount, ["تقييم", "تقييمان", "تقييمات"], "تقييماً")}</div>
        </div>

        <div className="card-flat p-3">
          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
            <Award className="size-3 text-success" />
            منجزة
          </div>
          <div className="text-price mt-1.5 text-[22px] leading-none">{profile.completedJobs}</div>
          <div className="mt-1 text-[10px] text-muted-foreground">طلب أُتمّ بنجاح</div>
        </div>

        <div className="card-flat p-3">
          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
            <Clock className="size-3 text-brand-dark" />
            في المنصّة
          </div>
          <div className="mt-1.5 text-[12px] leading-tight font-black">{formatDateAr(profile.createdAt)}</div>
          <div className="mt-1 text-[10px] text-muted-foreground">تاريخ إنشاء الملف</div>
        </div>
      </section>

      {profile.bio || profile.hourlyNote ? (
        <section className="px-4 pt-3">
          <div className="card-flat p-4">
            <h2 className="text-[15px] font-black">نبذة</h2>
            {profile.bio ? (
              <p className="mt-2 text-[12.5px] leading-relaxed whitespace-pre-line">{profile.bio}</p>
            ) : null}
            {profile.hourlyNote ? (
              <p className="mt-3 flex items-start gap-2 rounded-2xl bg-teal-soft px-3 py-2.5 text-[12px] leading-relaxed font-bold text-teal">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                {profile.hourlyNote}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {skills.length > 0 ? (
        <section className="px-4 pt-3">
          <div className="card-flat p-4">
            <h2 className="text-[15px] font-black">الفئات التي يعمل فيها</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {skills.map((s) => {
                const Icon = categoryIcon(s.icon);
                return (
                  <div
                    key={s.id}
                    className="flex flex-col items-center gap-1.5 rounded-2xl bg-muted/70 px-2 py-3"
                  >
                    <Icon className="size-5" />
                    <span className="text-center text-[11px] leading-tight font-bold">{s.nameAr}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {works.length > 0 ? (
        <section className="px-4 pt-3">
          <div className="card-flat p-4">
            <h2 className="text-[15px] font-black">معرض الأعمال</h2>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {works.map((w) => (
                <figure key={w.id} className="relative overflow-hidden rounded-2xl">
                  <img
                    src={w.imageUrl}
                    alt={w.caption ?? "عمل سابق"}
                    className="aspect-square w-full object-cover"
                  />
                  {w.caption ? (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-foreground/75 px-2 py-1.5 text-[10.5px] text-background backdrop-blur">
                      {w.caption}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="px-4 pt-3">
        <div className="card-flat p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-[15px] font-black">
              <Star className="size-4.5 fill-warn text-warn" />
              المراجعات
            </h2>
            <Badge tone="muted">{reviews.length}</Badge>
          </div>

          {reviews.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                icon={Star}
                title="لا مراجعات بعد"
                description="هذا الملف جديد على المنصّة ولم يكمل أي طلب بعد. اطلب منه عرضاً وقيّمه بعد الإتمام لتساعد بقية الزبائن."
              />
            </div>
          ) : (
            <div className="mt-3 grid gap-2.5">
              {reviews.map((rv) => (
                <article key={rv.id} className="rounded-2xl bg-muted/60 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Stars value={rv.rating} />
                      <b className="text-[13px]">{rv.authorName}</b>
                      <Check className="size-3.5 text-success" />
                    </div>
                    <span className="text-[10.5px] text-muted-foreground">{formatDateAr(rv.createdAt)}</span>
                  </div>
                  {rv.comment ? (
                    <p className="mt-2 text-[12.5px] leading-relaxed">{rv.comment}</p>
                  ) : null}
                  <p className="mt-1.5 text-[10.5px] text-muted-foreground">على الطلب: {rv.requestTitle}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
