import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm'

import { Team } from './team'

@Entity()
export class Player {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  remote_id: number

  @Column()
  lineup_position: string

  @ManyToOne((_type) => Team, (team) => team.players)
  @JoinColumn({ name: 'team_id' })
  team: Team

  @CreateDateColumn()
  date_created: string
}
