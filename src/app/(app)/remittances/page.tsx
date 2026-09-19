import { getCurrentContext, getRemittances } from '@/lib/dal';
import RemittancesClient from './remittances-client';

export default async function RemittancesPage() {
  const ctx = await getCurrentContext();
  const remittances = await getRemittances(ctx.practiceId);
  return <RemittancesClient remittances={remittances} />;
}
