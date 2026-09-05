import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import {
  PersistenceModule,
  REDIS_CLIENT,
} from '../src/products/persistence/persistence.module';
import { ProductsModule } from '../src/products/products.module';

const adminToken = () =>
  jwt.sign({ sub: 'test-admin', role: 'shop_owner' }, 'test-secret');
const asAdmin = () => ({ Authorization: `Bearer ${adminToken()}` });

describe('Products (integration, Redis)', () => {
  let app: INestApplication;
  let container: StartedRedisContainer;

  beforeAll(async () => {
    container = await new RedisContainer('redis:7-alpine').start();

    process.env.DATABASE_KIND = 'redis';
    process.env.DATABASE_HOST = container.getHost();
    process.env.DATABASE_PORT = String(container.getMappedPort(6379));
    process.env.JWT_ACCESS_SECRET = 'test-secret';

    const moduleRef = await Test.createTestingModule({
      imports: [PersistenceModule.register(), ProductsModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  }, 60000);

  afterAll(async () => {
    const redis = app.get(REDIS_CLIENT, { strict: false });
    await redis?.quit();
    await app?.close();
    await container?.stop();
    delete process.env.DATABASE_KIND;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.DATABASE_KIND;
  });

  it('creates a product', async () => {
    const res = await request(app.getHttpServer())
      .post('/products')
      .set(asAdmin())
      .send({ name: 'T-shirt', price: '12.50', stock: 5 })
      .expect(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.stock).toBe(5);
  });

  it('rejects overselling under concurrency', async () => {
    const created = await request(app.getHttpServer())
      .post('/products')
      .set(asAdmin())
      .send({ name: 'Limited', price: '1.00', stock: 2 })
      .expect(201);
    const id = created.body.id;

    const [a, b] = await Promise.all([
      request(app.getHttpServer())
        .post(`/products/${id}/decrement`)
        .send({ stock: 2 }),
      request(app.getHttpServer())
        .post(`/products/${id}/decrement`)
        .send({ stock: 2 }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);

    const after = await request(app.getHttpServer())
      .get(`/products/${id}`)
      .expect(200);
    expect(after.body.stock).toBe(0);
  });
});
