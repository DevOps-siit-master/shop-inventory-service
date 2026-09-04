import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PRODUCT_REPOSITORY } from './product-repository.adapter';
import type { ProductRepository } from './product-repository.adapter';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    return this.products.create(dto);
  }

  findAll(search?: string): Promise<Product[]> {
    return this.products.findAll(search);
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.products.findOne(id);
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.products.update(id, dto);
    if (!product) throw new NotFoundException(`Product {id} not found`);
    return product;
  }

  async remove(id: string): Promise<void> {
    const ok = await this.products.remove(id);
    if (!ok) throw new NotFoundException(`Product ${id} not found`);
  }

  async decrement(id: string, qty: number): Promise<Product> {
    const amount = Math.trunc(qty);
    const result = await this.products.decrement(id, amount);
    if (result.status === 'not_found')
      throw new NotFoundException(`Product ${id} not found`);
    if (result.status === 'insufficient')
      throw new ConflictException(`Insufficient stock for product ${id}`);
    return result.product;
  }

  async restock(id: string, qty: number): Promise<Product> {
    const amount = Math.trunc(qty);
    const product = await this.products.restock(id, amount);
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }
}
