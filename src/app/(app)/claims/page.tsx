import { Suspense } from 'react';
import { getCurrentContext, getClaims, getClaimStats, type ClaimRow } from '@/lib/dal';
import ClaimsClient from './claims-client';

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; province?: string; q?: string }>;
}) {
  const params = await searchParams;
  const ctx = await getCurrentContext();

  const [claims, stats] = await Promise.all([
    getClaims(ctx.practiceId, {
      status: params.status !== 'all' ? params.status : undefined,
      province: params.province,
    }),
    getClaimStats(ctx.practiceId),
  ]);

  return (
    <Suspense fallback={<div className="empty"><div className="empty-ico" style={{ display: 'inline-flex' }}/></div>}>
      <ClaimsClient
        initialClaims={claims}
        stats={stats}
        initialStatus={params.status ?? 'all'}
        initialQ={params.q ?? ''}
      />
    </Suspense>
  );
}
