// ── تصفّح الطلبات القريبة (الحرّاف) ─────────────────────────────────────────
// الفلترة كلها تجري على الخادم (SQL) لا في المتصفح: الفئة، المدينة، الحي، نطاق
// المسافة، الميزانية، الاستعجال، وبحث نصّي — مع إخفاء ما قدّمت عليه عرضاً بالفعل.
import { useState } from "react";
import { Search, SlidersHorizontal, RotateCcw, Inbox, MapPin, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Badge,
  EmptyState,
  ErrorState,
  Field,
  ListSkeleton,
  PageHeader,
  Spinner,
} from "@/components/hirfi/primitives";
import { RequestCard } from "@/components/hirfi/cards";
import { trpc } from "@/_core/trpc";
import { useCategories, useMyProfile } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/format";
import {
  BUDGET_BANDS,
  DISTANCE_BANDS,
  MOROCCAN_CITIES,
  DISTRICTS_BY_CITY,
  URGENCIES,
} from "@shared/constants";

const URGENCY_LABEL: Record<string, string> = {
  flexible: "مرن في الوقت",
  today: "اليوم",
  urgent: "عاجل جداً",
};

const SORTS = [
  { key: "newest", label: "الأحدث" },
  { key: "budget_desc", label: "الأعلى ميزانية" },
  { key: "budget_asc", label: "الأدنى ميزانية" },
] as const;

type Distance = "near" | "medium" | "far" | "all";
type Sort = (typeof SORTS)[number]["key"];

export default function Browse() {
  const me = useMyProfile();
  const cats = useCategories();

  const [categoryId, setCategoryId] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [distance, setDistance] = useState<Distance>("all");
  const [budgetBand, setBudgetBand] = useState("");
  const [urgency, setUrgency] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [excludeOwnOffers, setExcludeOwnOffers] = useState(false);
  const [sort, setSort] = useState<Sort>("newest");
  const [panelOpen, setPanelOpen] = useState(false);

  const band = BUDGET_BANDS.find((b) => b.key === budgetBand);
  const districts = city ? (DISTRICTS_BY_CITY[city] ?? []) : [];

  const q = trpc.requests.browse.useQuery({
    categoryId: categoryId || undefined,
    city: city || undefined,
    district: district || undefined,
    distance,
    budgetMin: band ? band.min : undefined,
    budgetMax: band ? band.max : undefined,
    urgency: (urgency || undefined) as "flexible" | "today" | "urgent" | undefined,
    search: appliedSearch || undefined,
    excludeOwnOffers,
    sort,
  });

  const profile = me.data?.profile;
  const rows = q.data ?? [];
  const activeFilters =
    (categoryId ? 1 : 0) +
    (city ? 1 : 0) +
    (district ? 1 : 0) +
    (distance !== "all" ? 1 : 0) +
    (budgetBand ? 1 : 0) +
    (urgency ? 1 : 0) +
    (appliedSearch ? 1 : 0) +
    (excludeOwnOffers ? 1 : 0);

  function reset() {
    setCategoryId("");
    setCity("");
    setDistrict("");
    setDistance("all");
    setBudgetBand("");
    setUrgency("");
    setSearch("");
    setAppliedSearch("");
    setExcludeOwnOffers(false);
    setSort("newest");
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        icon={Search}
        title="الطلبات القريبة"
        description={
          profile
            ? `تُرتَّب أولاً الطلبات المنشورة في ${profile.city}${profile.district ? ` — ${profile.district}` : ""}، ويمكنك توسيع النطاق إلى مدن أخرى.`
            : "طلبات منشورة تنتظر عرضاً من حرّاف."
        }
        action={
          <div className="flex items-center gap-2">
            <Badge tone="teal" icon={Inbox}>
              {rows.length} نتيجة
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 md:hidden"
              onClick={() => setPanelOpen((v) => !v)}
            >
              <SlidersHorizontal className="size-3.5" />
              الفلاتر
              {activeFilters > 0 ? (
                <span className="rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
                  {activeFilters}
                </span>
              ) : null}
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* لوحة الفلاتر */}
        <aside className={cn("min-w-0", !panelOpen && "hidden md:block")}>
          <div className="card-warm grid gap-4 rounded-xl border border-border bg-card p-4 lg:sticky lg:top-20">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-1.5 text-sm font-bold">
                <SlidersHorizontal className="size-4 text-brand" />
                تصفية النتائج
              </h2>
              {activeFilters > 0 ? (
                <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={reset}>
                  <RotateCcw className="size-3" />
                  صفّر
                </Button>
              ) : null}
            </div>

            <Field label="بحث في العنوان والوصف">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setAppliedSearch(search.trim());
                }}
                className="flex gap-2"
              >
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  maxLength={80}
                  placeholder="تسريب، تكييف، نقل…"
                />
                <Button type="submit" size="icon" variant="outline" aria-label="ابحث">
                  <Search className="size-4" />
                </Button>
              </form>
            </Field>

            <Field label="نطاق المسافة" hint={DISTANCE_BANDS.find((d) => d.key === distance)?.hintAr}>
              <div className="grid grid-cols-2 gap-1.5">
                {([...DISTANCE_BANDS, { key: "all", labelAr: "الكل", hintAr: "بلا قيد" }] as const).map(
                  (d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setDistance(d.key as Distance)}
                      className={cn(
                        "rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors",
                        distance === d.key
                          ? "border-brand bg-brand/10 text-brand-dark"
                          : "border-border bg-background text-muted-foreground hover:border-brand/40",
                      )}
                    >
                      {d.labelAr}
                    </button>
                  ),
                )}
              </div>
            </Field>

            <Field label="فئة الخدمة">
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">— كل الفئات —</option>
                {cats.isLoading ? (
                  <option disabled>جارٍ التحميل…</option>
                ) : (
                  (cats.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr}
                    </option>
                  ))
                )}
              </Select>
            </Field>

            <Field label="المدينة">
              <Select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setDistrict("");
                }}
              >
                <option value="">— كل المدن —</option>
                {MOROCCAN_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            {city ? (
              <Field label="الحي">
                <Select value={district} onChange={(e) => setDistrict(e.target.value)}>
                  <option value="">— كل الأحياء —</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            <Field label="الميزانية المقترحة">
              <Select value={budgetBand} onChange={(e) => setBudgetBand(e.target.value)}>
                <option value="">— كل الميزانيات —</option>
                {BUDGET_BANDS.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.labelAr}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="الاستعجال">
              <Select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                <option value="">— الكل —</option>
                {URGENCIES.map((u) => (
                  <option key={u} value={u}>
                    {URGENCY_LABEL[u]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="الترتيب">
              <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
              <input
                type="checkbox"
                checked={excludeOwnOffers}
                onChange={(e) => setExcludeOwnOffers(e.target.checked)}
                className="size-4 accent-[var(--brand)]"
              />
              <span className="text-xs font-medium leading-snug">
                أخفِ الطلبات التي قدّمت عليها عرضاً بالفعل
              </span>
            </label>
          </div>
        </aside>

        {/* النتائج */}
        <div className="grid min-w-0 gap-3">
          {activeFilters > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
              <span className="text-xs font-semibold text-muted-foreground">
                {activeFilters} فلتر مُطبَّق
              </span>
              {distance !== "all" ? (
                <Badge tone="success" icon={MapPin}>
                  {DISTANCE_BANDS.find((d) => d.key === distance)?.labelAr}
                </Badge>
              ) : null}
              {city ? <Badge tone="teal">{city}</Badge> : null}
              {urgency ? <Badge tone="warn">{URGENCY_LABEL[urgency]}</Badge> : null}
              {appliedSearch ? <Badge tone="info">«{appliedSearch}»</Badge> : null}
              {excludeOwnOffers ? <Badge tone="muted">بلا عروضي</Badge> : null}
            </div>
          ) : null}

          {q.isLoading ? (
            <ListSkeleton count={4} />
          ) : q.isError ? (
            <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Search}
              title="لا طلبات تطابق هذا البحث"
              description="جرّب توسيع نطاق المسافة إلى «متوسط» أو «الكل»، أو أزل فلتر الميزانية والفئة. أما لو كنت في مدينة صغيرة فطلباتها تنشر ببطء — عُد غداً."
              actionLabel="صفّر الفلاتر"
              onAction={reset}
            />
          ) : (
            <>
              <div className="grid gap-3">
                {rows.map((r) => (
                  <RequestCard
                    key={r.id}
                    request={r}
                    href={`/requests/${r.id}`}
                    viewerCity={profile?.city}
                    viewerDistrict={profile?.district}
                    showDistance
                  />
                ))}
              </div>
              <p className="flex items-start gap-1.5 px-1 text-xs text-muted-foreground">
                <UserCircle className="mt-0.5 size-3.5 shrink-0" />
                المسافة تقديرية من المدينة والحي (قريب = نفس الحي، متوسط = نفس المدينة، بعيد = مدينة
                أخرى) — لا خرائط ولا GPS في هذا النطاق.
              </p>
            </>
          )}

          {q.isFetching && !q.isLoading ? (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Spinner className="size-3" />
              تحديث النتائج…
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
