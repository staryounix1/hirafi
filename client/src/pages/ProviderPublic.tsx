// ── الملف العام للحرّاف: ما يراه الزبون قبل أن يقبل عرضاً ────────────────────
import { Link, useParams } from "wouter";
import {
  ArrowRight,
  Briefcase,
  Check,
  Clock,
  MapPin,
  Star,
  Info,
  Award,
} from "lucide-react";
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  Stars,
  VerifiedBadge,
} from "@/components/hirfi/primitives";
import { trpc } from "@/_core/trpc";
import { categoryIcon, errorMessage, formatDateAr, ratingAvg } from "@/lib/format";

export default function ProviderPublic() {
  const params = useParams() as { id?: string };
  const id = params.id ?? "";
  const q = trpc.profile.public.useQuery({ userId: id }, { enabled: !!id });

  if (!id) return <ErrorState message="رابط الملف غير صالح." />;

  if (q.isLoading) {
    return (
      <div className="grid gap-5">
        <div className="hirfi-skeleton h-20 rounded-xl" />
        <div className="hirfi-skeleton h-40 rounded-xl" />
        <div className="hirfi-skeleton h-56 rounded-xl" />
      </div>
    );
  }
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  if (!q.data) return null;

  const { profile, skills, works, reviews } = q.data;
  const avg = ratingAvg(profile.ratingSum, profile.ratingCount);

  return (
    <div className="grid gap-5">
      <Link
        href="/browse"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        عودة
      </Link>

      <PageHeader
        icon={profile.role === "provider" ? Briefcase : MapPin}
        title={profile.displayName}
        description={`${profile.city}${profile.district ? ` — ${profile.district}` : ""}${
          profile.role === "provider" ? ` · ${profile.yearsExperience} سنة خبرة` : " · حساب زبون"
        }`}
        action={<div className="flex flex-wrap items-center gap-2">{profile.isVerified ? <VerifiedBadge /> : null}</div>}
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card-warm rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Star className="size-3.5 text-warn" />
            متوسّط التقييم
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-display text-2xl leading-none font-extrabold">
              {avg !== null ? avg : "—"}
            </span>
            <span className="text-xs text-muted-foreground">من 5</span>
          </div>
          <div className="mt-1.5">
            <Stars value={avg ?? 0} size="sm" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {profile.ratingCount} تقييم
          </p>
        </div>

        <div className="card-warm rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Award className="size-3.5 text-success" />
            أعمال منجزة
          </div>
          <div className="mt-2 font-display text-2xl leading-none font-extrabold">
            {profile.completedJobs}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">طلب أُتمّ بنجاح</p>
        </div>

        <div className="card-warm rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5 text-brand" />
            في المنصّة منذ
          </div>
          <div className="mt-2 text-sm font-bold">{formatDateAr(profile.createdAt)}</div>
          <p className="mt-1.5 text-xs text-muted-foreground">تاريخ إنشاء الملف</p>
        </div>
      </section>

      {profile.bio || profile.hourlyNote ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-bold">نبذة</h2>
          {profile.bio ? (
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{profile.bio}</p>
          ) : null}
          {profile.hourlyNote ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-teal-soft/60 px-3 py-2.5 text-sm text-teal">
              <Info className="mt-0.5 size-4 shrink-0" />
              {profile.hourlyNote}
            </p>
          ) : null}
        </section>
      ) : null}

      {skills.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-bold">الفئات التي يعمل فيها</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {skills.map((s) => {
              const Icon = categoryIcon(s.icon);
              return (
                <Badge key={s.id} tone="teal" icon={Icon}>
                  {s.nameAr}
                </Badge>
              );
            })}
          </div>
        </section>
      ) : null}

      {works.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-bold">معرض الأعمال</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {works.map((w) => (
              <figure key={w.id} className="overflow-hidden rounded-lg border border-border">
                <img src={w.imageUrl} alt={w.caption ?? "عمل سابق"} className="aspect-square w-full object-cover" />
                {w.caption ? (
                  <figcaption className="bg-card px-2 py-1.5 text-[11px] text-muted-foreground">
                    {w.caption}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-1.5 text-base font-bold">
          <Star className="size-4.5 text-warn" />
          المراجعات
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
            {reviews.length}
          </span>
        </h2>

        {reviews.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={Star}
              title="لا مراجعات بعد"
              description="هذا الملف جديد على المنصّة ولم يكمل أي طلب بعد. اطلب منه عرضاً وقيّمه بعد الإتمام لتساعد بقية الزبائن."
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {reviews.map((rv) => (
              <article key={rv.id} className="rounded-lg border border-border bg-background p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Stars value={rv.rating} />
                    <b className="text-sm">{rv.authorName}</b>
                    <Check className="size-3.5 text-success" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{formatDateAr(rv.createdAt)}</span>
                </div>
                {rv.comment ? (
                  <p className="mt-2 text-sm leading-relaxed">{rv.comment}</p>
                ) : null}
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  على الطلب: {rv.requestTitle}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
