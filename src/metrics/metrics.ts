import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client';

export const registry = new Registry();

collectDefaultMetrics({ register: registry });

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [registry],
});

export const httpResponseSizeBytes = new Counter({
  name: 'http_response_size_bytes_total',
  help: 'Total bytes sent in HTTP responses',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

export const uniqueVisitorsTotal = new Counter({
  name: 'unique_visitors_total',
  help: 'Distinct visitors (client IP + browser) seen in the last 24 hours',
  registers: [registry],
});

// --- Inventory-specific metrics ---

// Current stock per product. Drives the low-stock alert -> Discord channel.
export const inventoryStockLevel = new Gauge({
  name: 'inventory_stock_level',
  help: 'Current stock on hand per product',
  labelNames: ['product_id', 'product_name'],
  registers: [registry],
});

// Failed stock decrements, split by reason (insufficient stock vs missing product).
export const inventoryStockDecrementFailuresTotal = new Counter({
  name: 'inventory_stock_decrement_failures_total',
  help: 'Number of stock decrement attempts that failed',
  labelNames: ['reason'],
  registers: [registry],
});

export function setStockGauge(
  productId: string,
  productName: string,
  quantity: number,
): void {
  inventoryStockLevel.set(
    { product_id: productId, product_name: productName },
    quantity,
  );
}
