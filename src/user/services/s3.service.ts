import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as https from 'https';

export interface S3UploadResult {
  fileUrl: string;
  key: string;
  size: number;
  mimeType: string;
  attachmentType: 'image' | 'video' | 'pdf';
  fileName: string;
}

@Injectable()
export class S3Service {
  private readonly region = process.env.AWS_REGION || 'ap-south-1';
  private readonly accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
  private readonly secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
  private readonly bucketName =
    process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME || 'selfsync-development-files-009929032530-ap-south-1-an';

  public getBucketName(): string {
    return this.bucketName;
  }

  public getRegion(): string {
    return this.region;
  }

  private getHost(): string {
    return `${this.bucketName}.s3.${this.region}.amazonaws.com`;
  }

  private sha256(data: string | Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private hmacSha256(key: Buffer | string, data: string): Buffer {
    return crypto.createHmac('sha256', key).update(data).digest();
  }

  private getSigningKey(dateStamp: string): Buffer {
    const kDate = this.hmacSha256('AWS4' + this.secretAccessKey, dateStamp);
    const kRegion = this.hmacSha256(kDate, this.region);
    const kService = this.hmacSha256(kRegion, 's3');
    return this.hmacSha256(kService, 'aws4_request');
  }

  public determineAttachmentType(fileName: string, mimeType?: string): 'image' | 'video' | 'pdf' {
    const lowerName = fileName.toLowerCase();
    const lowerMime = (mimeType || '').toLowerCase();

    if (lowerName.endsWith('.pdf') || lowerMime.includes('pdf')) {
      return 'pdf';
    }
    if (
      lowerName.endsWith('.mp4') ||
      lowerName.endsWith('.mov') ||
      lowerName.endsWith('.avi') ||
      lowerName.endsWith('.mkv') ||
      lowerName.endsWith('.webm') ||
      lowerMime.includes('video')
    ) {
      return 'video';
    }
    return 'image';
  }

  /**
   * Upload buffer directly to AWS S3 using SigV4 signed HTTP PUT request
   */
  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    mimeType: string = 'application/octet-stream',
    folder: string = 'discussions',
  ): Promise<S3UploadResult> {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds the 10 MB limit');
    }
    const attachmentType = this.determineAttachmentType(fileName, mimeType);
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${folder}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${cleanName}`;
    const host = this.getHost();

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    const payloadHash = this.sha256(buffer);

    const canonicalUri = `/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
    const canonicalHeaders = `content-length:${buffer.length}\ncontent-type:${mimeType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-length;content-type;host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = [
      'PUT',
      canonicalUri,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      this.sha256(canonicalRequest),
    ].join('\n');

    const signingKey = this.getSigningKey(dateStamp);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    const authHeader = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return new Promise((resolve) => {
      const options: https.RequestOptions = {
        hostname: host,
        port: 443,
        path: canonicalUri,
        method: 'PUT',
        headers: {
          'Host': host,
          'Content-Length': buffer.length,
          'Content-Type': mimeType,
          'x-amz-date': amzDate,
          'x-amz-content-sha256': payloadHash,
          'Authorization': authHeader,
        },
      };

      const req = https.request(options, (res) => {
        let respData = '';
        res.on('data', (c) => (respData += c));
        res.on('end', () => {
          const fileUrl = `https://${host}${canonicalUri}`;
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`✅ AWS S3 Upload successful [${attachmentType}]: ${fileUrl}`);
          } else {
            console.warn(`S3 Upload response ${res.statusCode}:`, respData);
          }
          resolve({
            fileUrl,
            key,
            size: buffer.length,
            mimeType,
            attachmentType,
            fileName,
          });
        });
      });

      req.on('error', (err) => {
        console.error('S3 Upload Network Error:', err);
        const fileUrl = `https://${host}${canonicalUri}`;
        resolve({
          fileUrl,
          key,
          size: buffer.length,
          mimeType,
          attachmentType,
          fileName,
        });
      });

      req.write(buffer);
      req.end();
    });
  }

  /**
   * Upload base64 encoded data to S3
   */
  async uploadBase64(
    base64Data: string,
    fileName: string,
    folder: string = 'discussions',
  ): Promise<S3UploadResult> {
    let cleanBase64 = base64Data;
    let mimeType = 'application/octet-stream';

    if (base64Data.includes(';base64,')) {
      const parts = base64Data.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      cleanBase64 = parts[1];
    }

    const buffer = Buffer.from(cleanBase64, 'base64');
    return this.uploadBuffer(buffer, fileName, mimeType, folder);
  }

  /**
   * Generate an AWS S3 Presigned URL for direct upload from the client
   */
  getPresignedUploadUrl(
    fileName: string,
    mimeType: string = 'application/octet-stream',
    folder: string = 'discussions',
    expiresInSeconds: number = 3600,
  ): { uploadUrl: string; fileUrl: string; key: string; attachmentType: 'image' | 'video' | 'pdf' } {
    const attachmentType = this.determineAttachmentType(fileName, mimeType);
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${folder}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${cleanName}`;
    const host = this.getHost();

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const canonicalUri = `/${encodeURIComponent(key).replace(/%2F/g, '/')}`;

    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': expiresInSeconds.toString(),
      'X-Amz-SignedHeaders': 'host',
    };

    const canonicalQueryString = Object.keys(queryParams)
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = [
      'PUT',
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      this.sha256(canonicalRequest),
    ].join('\n');

    const signingKey = this.getSigningKey(dateStamp);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const uploadUrl = `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
    const fileUrl = `https://${host}${canonicalUri}`;

    return { uploadUrl, fileUrl, key, attachmentType };
  }
}
