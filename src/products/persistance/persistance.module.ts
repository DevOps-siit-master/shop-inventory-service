import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../entities/product.entity';
import { PRODUCT_REPOSITORY } from '../product-repository.adapter';
import { TypeOrmProductRepository } from './typeorm-product.repository';

@Module({})
export class PersistanceModule {
  static register(): DynamicModule {
    return {
      module: PersistanceModule,
      imports: [TypeOrmModule.forFeature([Product])],
      providers: [
        { provide: PRODUCT_REPOSITORY, useClass: TypeOrmProductRepository },
      ],
      exports: [PRODUCT_REPOSITORY],
    };
  }
}
