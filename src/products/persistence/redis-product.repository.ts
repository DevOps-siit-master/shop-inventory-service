import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { CreateProductDto } from '../dto/create-product.dto';
import { Product } from '../entities/product.entity';
import {
  DecrementResult,
  ProductRepository,
} from '../product-repository.adapter';

const key = (id: string) => `product:${id}`;
const INDEX = 'products:index'; // zset: member=id, score=createdAt(ms)

// -2 = not found, -1 = insufficient, else = new stock. Atomic check-and-decrement,
// the Redis equivalent of SQL's `UPDATE ... WHERE stock >= :qty`.
const DECREMENT_LUA = `
local s = redis.call('HGET', KEYS[1], 'stock')
if not s then return -2 end
s = tonumber(s)
local q = tonumber(ARGV[1])
if s < q then return -1 end
redis.call('HSET', KEYS[1], 'stock', s - q, 'updatedAt', ARGV[2])
return s - q`;

@Injectable()
export class RedisProductRepository implements ProductRepository {
  constructor(private readonly redis: Redis) {}

  private toProduct(id: string, h: Record<string, string>): Product {
    return {
      id,
      name: h.name,
      stock: Number(h.stock),
      price: h.price,
      createdAt: new Date(h.createdAt),
      updatedAt: new Date(h.updatedAt),
    };
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const id = randomUUID();
    const iso = new Date().toISOString();
    const fields = {
      name: dto.name,
      stock: String(Math.trunc(dto.stock)),
      price: dto.price,
      createdAt: iso,
      updatedAt: iso,
    };
    await this.redis
      .multi()
      .hset(key(id), fields)
      .zadd(INDEX, Date.now(), id)
      .exec();
    return this.toProduct(id, fields);
  }

  async findAll(search?: string): Promise<Product[]> {
    const ids = await this.redis.zrevrange(INDEX, 0, -1);
    if (!ids.length) return [];
    const pipe = this.redis.pipeline();
    ids.forEach((id) => pipe.hgetall(key(id)));
    const rows = await pipe.exec();
    const products = ids
      .map((id, i) => {
        const h = rows![i][1] as Record<string, string>;
        return h && Object.keys(h).length ? this.toProduct(id, h) : null;
      })
      .filter((p): p is Product => p !== null);

    return search
      ? products.filter((p) =>
          p.name.toLowerCase().includes(search.toLowerCase()),
        )
      : products;
  }

  async findOne(id: string): Promise<Product | null> {
    const h = await this.redis.hgetall(key(id));
    return Object.keys(h).length ? this.toProduct(id, h) : null;
  }

  async update(id: string, patch: Partial<Product>): Promise<Product | null> {
    const cur = await this.findOne(id);
    if (!cur) return null;
    const next = { ...cur, ...patch, updatedAt: new Date() };
    await this.redis.hset(key(id), {
      name: next.name,
      stock: String(Math.trunc(next.stock)),
      price: next.price,
      createdAt: cur.createdAt.toISOString(),
      updatedAt: next.updatedAt.toISOString(),
    });
    return next;
  }

  async remove(id: string): Promise<boolean> {
    const del = await this.redis.del(key(id));
    await this.redis.zrem(INDEX, id);
    return del > 0;
  }

  async decrement(id: string, qty: number): Promise<DecrementResult> {
    const r = (await this.redis.eval(
      DECREMENT_LUA,
      1,
      key(id),
      String(qty),
      new Date().toISOString(),
    )) as number;
    if (r === -2) return { status: 'not_found' };
    if (r === -1) return { status: 'insufficient' };
    return { status: 'ok', product: (await this.findOne(id))! };
  }

  async restock(id: string, qty: number): Promise<Product | null> {
    if (!(await this.redis.exists(key(id)))) return null;
    await this.redis
      .multi()
      .hincrby(key(id), 'stock', qty)
      .hset(key(id), 'updatedAt', new Date().toISOString())
      .exec();
    return this.findOne(id);
  }

  async ping(): Promise<void> {
    await this.redis.ping();
  }
}
