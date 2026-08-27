import {
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumberString()
  price!: string;

  @IsInt()
  @Min(0)
  quantity!: number;
}
