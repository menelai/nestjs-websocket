import {IsOptional, IsString} from 'class-validator';

export class WatchEventDto {
  @IsString()
  event: string;

  @IsOptional()
  @IsString()
  payload?: string | null;
}
