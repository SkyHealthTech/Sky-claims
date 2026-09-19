import { getCurrentContext, getEligibilityHistory } from '@/lib/dal';
import EligibilityClient from './eligibility-client';

export default async function EligibilityPage() {
  const ctx = await getCurrentContext();
  const history = await getEligibilityHistory(ctx.practiceId, 20);
  return <EligibilityClient initialHistory={history} />;
}
