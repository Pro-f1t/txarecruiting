import { computeStats } from "@/lib/firebase/stats";
import StatsTabs from "@/components/StatsTabs";

export default async function AdminStats() {
  const s = await computeStats();
  return (
    <div className="space-y-6">
      <h1 className="t-card-title">Stats</h1>
      <StatsTabs s={s} />
    </div>
  );
}
