/**
 * Canonical mapping between series_prefix (A〜K) and series_name.
 * Used to keep the legacy `series_name` column in sync whenever
 * `series_prefix` is mutated so that grouping/related-video queries
 * stay consistent.
 */
export const SERIES_PREFIX_TO_NAME: Record<string, string> = {
  A: "クローズドガード",
  B: "クローズドガードブレイク",
  C: "コンバットベース",
  D: "マウント",
  E: "引き込み",
  F: "コンバットベースへの対応",
  G: "サイドポジション",
  H: "バックコントロール",
  I: "スパイダーガード",
  J: "エスケープ",
  K: "サブミッション",
};

export const SERIES_NAME_TO_PREFIX: Record<string, string> = Object.fromEntries(
  Object.entries(SERIES_PREFIX_TO_NAME).map(([prefix, name]) => [name, prefix])
);

/**
 * Return the canonical series_name for a given prefix, or null if the
 * prefix is empty / unknown (e.g. legacy "Z" or blank).
 */
export const getCanonicalSeriesName = (prefix?: string | null): string | null => {
  if (!prefix) return null;
  return SERIES_PREFIX_TO_NAME[prefix] ?? null;
};

/**
 * Return the canonical prefix for a given series_name, or null if unknown.
 */
export const getCanonicalSeriesPrefix = (name?: string | null): string | null => {
  if (!name) return null;
  return SERIES_NAME_TO_PREFIX[name] ?? null;
};

/**
 * Given a partial technique update, return additional fields needed to
 * keep `series_prefix` and `series_name` consistent. Pass in the existing
 * row values so we only override when the user actually changed something.
 */
export const syncSeriesFields = (
  next: { series_prefix?: string | null; series_name?: string | null },
  prev?: { series_prefix?: string | null; series_name?: string | null }
): { series_prefix?: string | null; series_name?: string | null } => {
  const patch: { series_prefix?: string | null; series_name?: string | null } = {};

  const prefixChanged =
    next.series_prefix !== undefined && next.series_prefix !== prev?.series_prefix;
  const nameChanged =
    next.series_name !== undefined && next.series_name !== prev?.series_name;

  if (prefixChanged) {
    const canonicalName = getCanonicalSeriesName(next.series_prefix);
    if (canonicalName) patch.series_name = canonicalName;
  }
  if (nameChanged && !prefixChanged) {
    const canonicalPrefix = getCanonicalSeriesPrefix(next.series_name);
    if (canonicalPrefix) patch.series_prefix = canonicalPrefix;
  }
  return patch;
};