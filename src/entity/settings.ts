import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm'

@Entity()
export class Settings {
  @PrimaryGeneratedColumn()
  id: number

  @Column('json')
  settings_json: any

  @CreateDateColumn()
  date_created: string
}
