// ── مسار غير موجود: بدل «Not found» العارية ───────────────────────────────
import { Link } from "wouter";
import { SearchX, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/hirfi/primitives";

export default function NotFound() {
  return (
    <div className="shell grid min-h-screen place-items-center py-10">
      <div className="w-full max-w-lg">
        <EmptyState
          icon={SearchX}
          title="الصفحة غير موجودة"
          description="الرابط الذي فتحته لا يقابل أي شاشة في «حِرْفي». قد يكون قديماً أو مكتوباً بخطأ."
        />
        <div className="mt-4 flex justify-center">
          <Button asChild className="gap-2">
            <Link href="/dashboard">
              <ArrowLeft className="size-4" />
              عُد إلى لوحة التحكم
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
