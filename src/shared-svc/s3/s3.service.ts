import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY')!,
      },
    });

    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET')!;
  }


  async upload(
    key: string | undefined,
    buffer: Buffer,
    contentType: string,
  ) {
    if (!key) {
      throw new Error('Key is required for upload.');
    }

    if (!buffer) {
      throw new Error('Buffer is required for upload.');
    }

    if (!contentType) {
      throw new Error('Content type is required for upload.');
    }
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.s3Client.send(command);

    return {
      key,
      bucket: this.bucketName,
    };
  }

  async getSignedDownloadUrl(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: 3600,
    });
  }

  async delete(key: string |undefined) {
    if (!key) {
      throw new Error('Key is required for deletion.');
    }
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);

    return {
      key,
      deleted: true,
    };
  }
}