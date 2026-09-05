import { Inject, Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../products/product-repository.adapter';

@Injectable()
export class PersistenceHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly repo: ProductRepository,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.repo.ping();
      return this.getStatus(key, true);
    } catch (e) {
      throw new HealthCheckError(
        'Persistence unavailable',
        this.getStatus(key, false, { message: (e as Error).message }),
      );
    }
  }
}
