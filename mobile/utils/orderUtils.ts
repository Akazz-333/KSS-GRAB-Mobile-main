/**
 * Unified Order ID formatting utility for GrabIt.
 * Guarantees 100% consistent order ID formatting (e.g. GB-6ECD7D) across:
 * Customer Portal, Seller Portal, Rider Portal, Admin Portal, and Notifications.
 */
export function formatDisplayOrderId(orderOrId: any): string {
  if (!orderOrId) return 'GB-000000';
  let str = '';
  if (typeof orderOrId === 'string') {
    str = orderOrId;
  } else if (typeof orderOrId === 'object') {
    str = String(
      orderOrId.display_id ||
      orderOrId.displayId ||
      orderOrId.order_number ||
      orderOrId.orderNumber ||
      orderOrId.rawId ||
      orderOrId.id ||
      orderOrId.order_id ||
      ''
    );
  }
  const clean = str.replace(/^(GB|ORD)-?/i, '').replace(/[^a-zA-Z0-9]/g, '');
  if (!clean) return 'GB-000000';
  const code = clean.length >= 6 ? clean.slice(0, 6).toUpperCase() : clean.toUpperCase();
  return `GB-${code}`;
}
