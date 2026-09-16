/**
 * Unified Order ID formatting utility for GrabIt.
 * Guarantees 100% consistent order ID formatting (e.g. GB-A3F1E7) across:
 * Customer Portal, Seller Portal, Rider Portal, Admin Portal, and Notifications.
 *
 * Strategy: Always derive the display alias from the canonical UUID (rawId/id).
 * The backend uses the first 6 hex chars of the UUID (dashes stripped) as the
 * display code, e.g. UUID "a3f1e7b2-..." → "GB-A3F1E7".
 * This function mirrors that logic so ALL portals show the same ID.
 */
export function formatDisplayOrderId(orderOrId: any): string {
  if (!orderOrId) return 'GB-000000';

  let uuidStr = '';
  let displayStr = '';

  if (typeof orderOrId === 'string') {
    displayStr = orderOrId;
  } else if (typeof orderOrId === 'object') {
<<<<<<< HEAD
    str = String(
      orderOrId.display_id ||
      orderOrId.displayId ||
      orderOrId.order_number ||
      orderOrId.orderNumber ||
      orderOrId.rawId ||
      orderOrId.id ||
      orderOrId.order_id ||
      ''
=======
    // Prefer rawId (canonical UUID) so the display alias is always UUID-derived
    uuidStr = String(orderOrId.rawId || '');
    displayStr = String(
      orderOrId.order_number || orderOrId.orderNumber ||
      orderOrId.display_id  || orderOrId.displayId  ||
      orderOrId.id          || ''
>>>>>>> 7d19c6569bcec01d67be66bfd6b5109beb6196b8
    );
  }

  // If we have a valid UUID, derive display from its first 6 hex chars (same as backend)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidStr && uuidPattern.test(uuidStr.trim())) {
    const hex6 = uuidStr.replace(/-/g, '').slice(0, 6).toUpperCase();
    return `GB-${hex6}`;
  }

  // Fallback: strip any GB/ORD prefix, take first 6 alphanumeric chars
  const clean = displayStr.replace(/^(GB|ORD)-?/i, '').replace(/[^a-zA-Z0-9]/g, '');
  if (!clean) return 'GB-000000';
  const code = clean.length >= 6 ? clean.slice(0, 6).toUpperCase() : clean.toUpperCase();
  return `GB-${code}`;
}
