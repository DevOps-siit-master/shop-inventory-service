import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
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

  async findOne(id: string): Promise<Product> {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    const saved = await this.products.save(product);
    return saved;
  }

  async remove(id: string): Promise<void> {
    const result = await this.products.delete(id);
    if (!result.affected)
      throw new NotFoundException(`Product ${id} not found`);
  }

  async decrement(id: string, qty: number): Promise<Product> {
    const amount = Math.trunc(qty);

    const result = await this.products
      .createQueryBuilder()
      .update(Product)
      .set({ stock: () => `stock - ${amount}` })
      .where('id = :id', { id })
      .andWhere('stock >= :amount', { amount })
      .execute();

    if (!result.affected) {
      const exists = await this.products.exists({ where: { id } });
      throw new ConflictException(
        exists
          ? `Insufficient stock for product ${id}`
          : `Product ${id} not found`,
      );
    }

    const updated = await this.findOne(id);
    return updated;
  }

  async restock(id: string, qty: number): Promise<Product> {
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
}
