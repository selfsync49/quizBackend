import { Injectable, Logger } from '@nestjs/common';
import Redis, { Redis as RedisType } from 'ioredis';

@Injectable()
export class RedisService {
  private client: RedisType;
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) {
          return null; // Stop retrying repeatedly if redis is down
        }
        return Math.min(times * 1000, 3000);
      },
      lazyConnect: false,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      this.logger.log('Connected to Redis');
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      // Suppress spammy unhandled error trace when redis is offline
      this.logger.warn(`Redis connection error: ${err.message}`);
    });
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected && this.client.status !== 'ready') return null;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      this.logger.warn(`Redis get failed for key "${key}": ${e?.message || e}`);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      if (!this.isConnected && this.client.status !== 'ready') return;
      const data = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.set(key, data, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, data);
      }
    } catch (e) {
      this.logger.warn(`Redis set failed for key "${key}": ${e?.message || e}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (!this.isConnected && this.client.status !== 'ready') return;
      await this.client.del(key);
    } catch (e) {
      this.logger.warn(`Redis del failed for key "${key}": ${e?.message || e}`);
    }
  }
}