import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'src/auth/jwt.strategy';

@Module({
  imports: [PassportModule],
  controllers: [ProductsController],
  providers: [ProductsService, JwtStrategy],
})
export class ProductsModule {}
