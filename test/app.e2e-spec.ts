import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { ProductsModule } from '../src/products/products.module';
import { PersistenceModule } from '../src/products/persistence/persistence.module';

const adminToken = () =>
  jwt.sign({ sub: 'test-admin', role: 'shop_owner' }, 'test-secret');
const asAdmin = () => ({ Authorization: `Bearer ${adminToken()}` });

describe('Products (integration)', () => {
  let app: INestApplication;
  let container: StartedPostgreSqlContainer;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    process.env.DATABASE_KIND = 'postgres';
    process.env.DATABASE_HOST = container.getHost();
    process.env.DATABASE_PORT = String(container.getPort());
    process.env.DATABASE_USER = container.getUsername();
    process.env.DATABASE_PASSWORD = container.getPassword();
    process.env.DATABASE_NAME = container.getDatabase();
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
    await app?.close();
    await container?.stop();
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
    expect(res.body.price).toBe('12.50');
  });

  it('finds products by search term', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .set(asAdmin())
      .send({ name: 'Healthy granola', price: '4.00', stock: 10 })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/products?search=granola')
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Healthy granola');
  });

  it('decrements stock atomically and rejects overselling', async () => {
    const created = await request(app.getHttpServer())
      .post('/products')
      .set(asAdmin())
      .send({ name: 'Limited item', price: '1.00', stock: 2 })
      .expect(201);
    const id = created.body.id;

    // Two concurrent decrements of 2 against a stock of 2: exactly one wins.
    const [a, b] = await Promise.all([
      request(app.getHttpServer())
        .post(`/products/${id}/decrement`)
        .send({ stock: 2 }),
      request(app.getHttpServer())
        .post(`/products/${id}/decrement`)
        .send({ stock: 2 }),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]);

    const after = await request(app.getHttpServer())
      .get(`/products/${id}`)
      .expect(200);
    expect(after.body.stock).toBe(0);
  });

  it('restocks a product', async () => {
    const created = await request(app.getHttpServer())
      .post('/products')
      .set(asAdmin())
      .send({ name: 'Restockable', price: '2.00', stock: 0 })
      .expect(201);
    const id = created.body.id;

    const res = await request(app.getHttpServer())
      .post(`/products/${id}/restock`)
      .set(asAdmin())
      .send({ stock: 7 })
      .expect(201);

    expect(res.body.stock).toBe(7);
  });

  it('rejects an invalid product (missing price)', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .set(asAdmin())
      .send({ name: 'No price', stock: 1 })
      .expect(400);
  });
});
