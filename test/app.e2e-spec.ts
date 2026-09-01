import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import request from 'supertest';
import { ProductsModule } from '../src/products/products.module';

describe('Products (integration)', () => {
  let app: INestApplication;
  let container: StartedPostgreSqlContainer;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();

    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: container.getHost(),
          port: container.getPort(),
          username: container.getUsername(),
          password: container.getPassword(),
          database: container.getDatabase(),
          autoLoadEntities: true,
          synchronize: true,
        }),
        ProductsModule,
      ],
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
  });

  it('creates a product', async () => {
    const res = await request(app.getHttpServer())
      .post('/products')
      .send({ name: 'T-shirt', price: '12.50', stock: 5 })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.stock).toBe(5);
    expect(res.body.price).toBe('12.50');
  });

  it('finds products by search term', async () => {
    await request(app.getHttpServer())
      .post('/products')
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
      .send({ name: 'Restockable', price: '2.00', stock: 0 })
      .expect(201);
    const id = created.body.id;

    const res = await request(app.getHttpServer())
      .post(`/products/${id}/restock`)
      .send({ stock: 7 })
      .expect(201);

    expect(res.body.stock).toBe(7);
  });

  it('rejects an invalid product (missing price)', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .send({ name: 'No price', stock: 1 })
      .expect(400);
  });
});
