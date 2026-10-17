import { AttachmentType } from '../entities/post-attachment.entity';

export type communityPostAttachment = {
    fileName: string;
    fileSize: number;
    buffer: Buffer,
    attachmentType: AttachmentType;
    fileExt: string;
    fileUrl?: string;
}