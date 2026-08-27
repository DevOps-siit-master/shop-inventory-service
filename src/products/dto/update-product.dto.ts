import {
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// Every field optional — admin can edit name, price and/or quantity (spec 2.1).
// Hand-written (no @nestjs/mapped-types) to match the DTO style in the other
// shop services.
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsNumberString()
  price?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;
}
