import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  // "broj komada na raspolaganju" (spec 2.1) — stock on hand.
  @Column('int', { default: 0 })
  stock!: number;

  // Crypto price. Kept as a string with the same precision/scale the order
  // service uses for money, so totals line up across services without rounding.
  @Column('decimal', { precision: 18, scale: 6 })
  price!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
