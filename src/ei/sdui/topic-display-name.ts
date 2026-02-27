/**
 * Canonical topic display name source.
 *
 * Single place for deriving human-readable topic labels. When no richer source exists,
 * falls back to title-casing topicId. Future: inject from ei_topic_state.display_name
 * or curriculum projection.
 */

/**
 * Returns the display name for a topic. Use this for pending list, headers, etc.
 *
 * @param topicId - The topic identifier (e.g. "thermodynamics", "organic-chemistry")
 * @param canonicalDisplayName - Optional override from projection/read-model when available
 */
export function getTopicDisplayName(
  topicId: string,
  canonicalDisplayName?: string | null,
): string {
  if (canonicalDisplayName != null && canonicalDisplayName.trim() !== '') {
    return canonicalDisplayName.trim();
  }
  return topicId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
