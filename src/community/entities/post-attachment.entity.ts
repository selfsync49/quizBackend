// post-attachment.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum AttachmentType {
  IMAGE = 'image',
  GIF = 'gif',
  VIDEO = 'video',
  PDF = 'pdf',
  WORD = 'word',
  EXCEL = 'excel',
  OTHERS = 'others',
}

@Entity('post_attachments')
export class PostAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  post_id: string;

  @Column({
    type: 'enum',
    enum: AttachmentType,
    enumName: 'attachment_type',
  })
  attachment_type: AttachmentType;

  @Column({ type: 'varchar', default: '' })
  file_ext: string | '';

  @Column({ type: 'text' })
  file_url: string;

  @Column({ type: 'varchar' })
  file_name: string;

  @Column({ type: 'bigint', nullable: true })
  file_size_bytes: number | null;

  @Column({ type: 'smallint', default: 0 })
  order_index: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}