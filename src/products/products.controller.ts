import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { Roles } from 'src/auth/roles.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('shop_owner')
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.products.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.products.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('shop_owner')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('shop_owner')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }

  @Post(':id/decrement')
  decrement(@Param('id') id: string, @Body() dto: AdjustStockDto) {
    return this.products.decrement(id, dto.stock);
  }

  @Post(':id/restock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('shop_owner')
  restock(@Param('id') id: string, @Body() dto: AdjustStockDto) {
    return this.products.restock(id, dto.stock);
  }
}
