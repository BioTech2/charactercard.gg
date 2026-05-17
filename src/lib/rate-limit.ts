import type { NextRequest } from "next/server";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export function isRateLimited(
  request: NextRequest,
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const bucketKey = `${key}:${getClientIp(request)}`;
  const now = Date.now();
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    pruneExpiredBuckets(now);
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function pruneExpiredBuckets(now: number) {
  if (buckets.size < 500) return;

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
