import { IsInt, Min } from 'class-validator';

// Body for the decrement / restock endpoints. Positive integer only; the
// service applies the sign, so callers can't accidentally push stock negative.
export class AdjustStockDto {
  @IsInt()
  @Min(1)
  quantity!: number;
}
