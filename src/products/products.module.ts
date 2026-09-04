import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PersistanceModule } from './persistance/persistance.module';

@Module({
  imports: [PersistanceModule.register()],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
