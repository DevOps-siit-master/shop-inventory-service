import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../entities/product.entity';
import { PRODUCT_REPOSITORY } from '../product-repository.adapter';
import { TypeOrmProductRepository } from './typeorm-product.repository';
import Redis from 'ioredis';
import { RedisProductRepository } from './redis-product.repository';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Module({})
export class PersistenceModule {
  static register(): DynamicModule {
    const kind = process.env.DATABASE_KIND ?? 'postgres';

    if (kind === 'redis') {
      return {
        module: PersistenceModule,
        global: true,
        imports: [],
        providers: [
          {
            provide: REDIS_CLIENT,
            useFactory: () =>
              new Redis({
                host: process.env.DATABASE_HOST ?? 'localhost',
                port: parseInt(process.env.DATABASE_PORT ?? '6379', 10),
                password: process.env.DATABASE_PASSWORD || undefined,
              }),
          },
          {
            provide: PRODUCT_REPOSITORY,
            inject: [REDIS_CLIENT],
            useFactory: (redis: Redis) => new RedisProductRepository(redis),
          },
        ],
        exports: [PRODUCT_REPOSITORY],
      };
    }

    return {
      module: PersistenceModule,
      global: true,
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DATABASE_HOST || 'localhost',
          port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
          username: process.env.DATABASE_USER || 'inventory',
          password: process.env.DATABASE_PASSWORD || 'inventory',
          database: process.env.DATABASE_NAME || 'inventory',
          autoLoadEntities: true,
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Product]),
      ],
      providers: [
        { provide: PRODUCT_REPOSITORY, useClass: TypeOrmProductRepository },
      ],
      exports: [PRODUCT_REPOSITORY],
    };
  }
}
