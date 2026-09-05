import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PersistenceHealthIndicator } from './persistence.health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [PersistenceHealthIndicator],
})
export class HealthModule {}
