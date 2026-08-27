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
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  // Admin: add an article (spec 2.1).
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  // Browse / search catalogue (spec 2.3). e.g. GET /products?search=shirt
  @Get()
  findAll(@Query('search') search?: string) {
    return this.products.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.products.findOne(id);
  }

  // Admin: edit an article (name / price / quantity).
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  // Admin: delete an article.
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }

  // Called by the order/payment flow when a purchase is confirmed.
  // Returns 409 if there isn't enough stock, so the caller can fail the order.
  @Post(':id/decrement')
  decrement(@Param('id') id: string, @Body() dto: AdjustStockDto) {
    return this.products.decrement(id, dto.quantity);
  }

  // Admin: put stock back / replenish.
  @Post(':id/restock')
  restock(@Param('id') id: string, @Body() dto: AdjustStockDto) {
    return this.products.restock(id, dto.quantity);
  }
}
