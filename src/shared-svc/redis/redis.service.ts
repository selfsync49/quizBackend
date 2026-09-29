import { Injectable } from '@nestjs/common';
import Redis, { Redis as RedisType } from 'ioredis';
@Injectable()
export class RedisService {
  private client: RedisType;
  constructor() {
    this.client = new Redis({
      host: '127.0.0.1',
      port: 6379,
      // password: 'yourpassword', // if needed
    });
  }
  async get<T = any>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }
  async set(key: string, value: any, ttlSeconds?: number) {
    const data = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, data, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, data);
    }
  }
  async del(key: string) {
    await this.client.del(key);
  }
}