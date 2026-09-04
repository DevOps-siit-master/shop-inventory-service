import { InjectRepository } from '@nestjs/typeorm';
import {
  DecrementResult,
  ProductRepository,
} from '../product-repository.adapter';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Product } from '../entities/product.entity';
import { ILike, Repository } from 'typeorm';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

@Injectable()
export class TypeOrmProductRepository implements ProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.products.create(dto);
    const saved = await this.products.save(product);
    return saved;
  }

  findAll(search?: string): Promise<Product[]> {
    return this.products.find({
      where: search ? { name: ILike(`%${search}%`) } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Product | null> {
    return this.products.findOne({ where: { id } });
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product | null> {
    const product = await this.findOne(id);
    if (!product) return null;
    Object.assign(product, dto);
    return await this.products.save(product);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.products.delete(id);
    return !!result.affected;
  }

  async decrement(id: string, amount: number): Promise<DecrementResult> {
    const result = await this.products
      .createQueryBuilder()
      .update(Product)
      .set({ stock: () => `stock - ${amount}` })
      .where('id = :id', { id })
      .andWhere('stock >= :amount', { amount })
      .execute();

    if (result.affected) {
      const product = await this.products.findOne({ where: { id } });
      return { status: 'ok', product: product! };
    }

    const exists = await this.products.exists({ where: { id } });
    return exists ? { status: 'insufficient' } : { status: 'not_found' };
  }

  async restock(id: string, qty: number): Promise<Product | null> {
    const amount = Math.trunc(qty);
    const result = await this.products
      .createQueryBuilder()
      .update(Product)
      .set({ stock: () => `stock + ${amount}` })
      .where('id = :id', { id })
      .execute();

    if (!result.affected)
      throw new NotFoundException(`Product ${id} not found`);

    const updated = await this.findOne(id);
    return updated;
  }

  async ping(): Promise<void> {
    await this.products.query('SELECT 1');
  }
}
