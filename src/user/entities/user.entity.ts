import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  phone: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  username: string;

  @Column({ type: 'varchar' })
  full_name: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'varchar', nullable: true })
  target_exam: string;

  @Column({ type: 'varchar', nullable: true })
  qualification: string;

  @Column({ type: 'varchar', nullable: true })
  preferred_language: string;

  @Column({ type: 'text', nullable: true })
  password_hash: string;

  @Column({ type: 'date', nullable: true })
  date_of_birth: Date;

  @Column({ type: 'text', nullable: true })
  avatar_url: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  is_verified: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  email_verified_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}