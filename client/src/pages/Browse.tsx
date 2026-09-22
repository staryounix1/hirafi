// ── تصفّح الطلبات القريبة (الحرفي) ──────────────────────────────────────────────
// الفلترة كلها تجري على الخادم (SQL) لا في المتصفح: الفئة، المدينة، الحي، نطاق
// المسافة، الميزانية، الاستعجال، وبحث نصّي — مع إخفاء ما قدّمت عليه عرضاً بالفعل.
import { useState } from "react";
import { Search, SlidersHorizontal, RotateCcw, Inbox, MapPin, UserCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Badge,
  Chip,
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
    <div className="grid">
      <PageHeader
        icon={Search}
        title="الطلبات القريبة"
        description={
          profile
            ? `تُرتَّب أولاً الطلبات المنشورة في ${profile.city}${profile.district ? ` — ${profile.district}` : ""}، ويمكنك توسيع النطاق إلى مدن أخرى.`
            : "طلبات منشورة تنتظر عرضاً من حرف."
        }
        action={
          <Badge tone="teal" icon={Inbox}>
            {rows.length} نتيجة
          </Badge>
        }
      />

      {/* شريط البحث الثابت */}
      <div className="px-4 pt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setAppliedSearch(search.trim());
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={80}
              placeholder="تسريب، تكييف، نقل…"
              className="ps-9"
            />
          </div>
          <Button
            type="button"
            size="icon"
            variant={panelOpen || activeFilters > 0 ? "default" : "outline"}
            className="relative rounded-full"
            aria-label="الفلاتر"
            onClick={() => setPanelOpen((v) => !v)}
          >
            <SlidersHorizontal className="size-4.5" />
            {activeFilters > 0 ? (
              <span className="absolute -end-1 -top-1 grid size-5 place-items-center rounded-full bg-teal text-[10px] font-black text-white">
                {activeFilters}
              </span>
            ) : null}
          </Button>
        </form>
      </div>

      {/* شرائح سريعة: المسافة والاستعجال */}
      <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {([...DISTANCE_BANDS, { key: "all", labelAr: "كل المسافات" }] as const).map((d) => (
          <Chip
            key={d.key}
            active={distance === d.key}
            icon={d.key === "all" ? undefined : MapPin}
            onClick={() => setDistance(d.key as Distance)}
          >
            {d.labelAr}
          </Chip>
        ))}
        {URGENCIES.map((u) => (
          <Chip
            key={u}
            active={urgency === u}
            onClick={() => setUrgency(urgency === u ? "" : u)}
          >
            {URGENCY_LABEL[u]}
          </Chip>
        ))}
      </div>

      {/* لوحة الفلاتر الكاملة — تُطوى على الجوال */}
      {panelOpen ? (
        <section className="mt-2 grid gap-4 px-4">
          <div className="card-flat grid gap-4 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-1.5 text-[15px] font-black">
                <SlidersHorizontal className="size-4 text-brand-dark" />
                تصفية النتائج
              </h2>
              {activeFilters > 0 ? (
                <Button variant="ghost" size="sm" className="gap-1 rounded-full text-xs" onClick={reset}>
                  <RotateCcw className="size-3" />
                  صفّر
                </Button>
              ) : null}
            </div>

            <Field label="الفئة">
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">— كل الفئات —</option>
                {(cats.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr}
                  </option>
                ))}
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

            <Field label="الترتيب">
              <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl bg-muted/70 px-3 py-2.5">
              <input
                type="checkbox"
                checked={excludeOwnOffers}
                onChange={(e) => setExcludeOwnOffers(e.target.checked)}
                className="size-4 accent-[var(--brand)]"
              />
              <span className="text-[12px] leading-snug font-bold">
                أخفِ الطلبات التي قدّمت عليها عرضاً بالفعل
              </span>
            </label>
          </div>
        </section>
      ) : null}

      {/* شرائح الفلاتر المطبّقة */}
      {activeFilters > 0 ? (
        <div className="scrollbar-none mt-2 flex flex-wrap items-center gap-2 px-4">
          <span className="text-[11px] font-bold text-muted-foreground">{activeFilters} فلتر</span>
          {distance !== "all" ? (
            <Badge tone="success" icon={MapPin}>
              {DISTANCE_BANDS.find((d) => d.key === distance)?.labelAr}
            </Badge>
          ) : null}
          {city ? <Badge tone="teal">{city}</Badge> : null}
          {urgency ? <Badge tone="warn">{URGENCY_LABEL[urgency]}</Badge> : null}
          {appliedSearch ? <Badge tone="info">«{appliedSearch}»</Badge> : null}
          {excludeOwnOffers ? <Badge tone="muted">بلا عروضي</Badge> : null}
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground"
          >
            <X className="size-3" />
            مسح
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 px-4 pt-3 pb-6">
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
            <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-muted-foreground">
              <UserCircle className="mt-0.5 size-3.5 shrink-0" />
              المسافة تقديرية من المدينة والحي (قريب = نفس الحي، متوسط = نفس المدينة، بعيد = مدينة أخرى) — لا خرائط ولا GPS في هذا النطاق.
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
  );
}
