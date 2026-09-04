import { CreateProductDto } from './dto/create-product.dto';
import { Product } from './entities/product.entity';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export type DecrementResult =
  | { status: 'ok'; product: Product }
  | { status: 'insufficient' }
  | { status: 'not_found' };

export interface ProductRepository {
  create(dto: CreateProductDto): Promise<Product>;
  findAll(search?: string): Promise<Product[]>;
  findOne(id: string): Promise<Product | null>;
  update(id: string, patch: Partial<Product>): Promise<Product | null>;
  remove(id: string): Promise<boolean>;
  decrement(id: string, qty: number): Promise<DecrementResult>;
  restock(id: string, qty: number): Promise<Product | null>;
  ping(): Promise<void>;
}
