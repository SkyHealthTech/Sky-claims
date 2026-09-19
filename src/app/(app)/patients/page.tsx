import { getCurrentContext, getPatients, getClaimStats } from '@/lib/dal';
import PatientsClient from './patients-client';

export default async function PatientsPage() {
  const ctx = await getCurrentContext();
  const [patients, stats] = await Promise.all([
    getPatients(ctx.practiceId),
    getClaimStats(ctx.practiceId),
  ]);
  return <PatientsClient patients={patients} mtdRevenue={stats.mtdRevenue} />;
}
