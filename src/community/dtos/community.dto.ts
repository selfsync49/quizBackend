import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export type communityCreateDto = {
    userId: string;
    description: string;
}

export type paginationDto = {
    limit: number;
    page: number;
}

export type createcomentDto = {
    userId: string;
    comment: string;
    parentCommentId?: string;
}

export class communityPostEditDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return value;
  })
  attachmentsToDelete?: string[];
}
export const attachmentType = [
    'image',
    'gif',
    'video',
    'pdf',
    'word',
    'excel',
    'others',
]

export const ALLOWED_FILE_EXTENSIONS = [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
    '.svg',

    '.mp4',
    '.mov',
    '.webm',

    '.pdf',

    '.doc',
    '.docx',

    '.xls',
    '.xlsx',

    '.ppt',
    '.pptx',

    '.txt',
    '.csv',
];

