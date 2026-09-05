import { Injectable, NestMiddleware } from '@nestjs/common';
import { httpRequestDuration, httpRequestsTotal } from './metrics';

/** Kept local (not express's Request/Response) so this file does not depend
 *  on @types/express, matching shophub-auth-service's HttpMetricsMiddleware. */
interface MetricsRequest {
  method: string;
  path?: string;
  route?: { path?: string };
}
interface MetricsResponse {
  statusCode: number;
  on(event: 'finish', listener: () => void): void;
}
type NextFn = () => void;

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  use(req: MetricsRequest, res: MetricsResponse, next: NextFn) {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const route = req.route?.path ?? req.path ?? 'unknown';
      const labels = {
        method: req.method,
        route,
        status_code: String(res.statusCode),
      };
      httpRequestsTotal.inc(labels);
      httpRequestDuration.observe(
        labels,
        Number(process.hrtime.bigint() - start) / 1e9,
      );
    });
    next();
  }
}
