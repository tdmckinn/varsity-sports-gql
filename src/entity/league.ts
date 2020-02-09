import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  ManyToOne,
} from 'typeorm'

import { Team } from './team'
import { Settings } from './settings'
import { User } from './user'

@Entity()
export class League {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  draft_id: string

  @Column()
  commissioner_name: string

  @Column()
  commissioner_id: string

  @Column()
  league_name: string

  @Column()
  draft_date_time: Date

  @OneToMany((_type) => Team, (team) => team.league, { cascade: true })
  teams: Team[]

  @ManyToOne((_type) => User, (user) => user.leagues)
  @JoinColumn({ name: 'commissioner_id' })
  commissioner: User

  @OneToOne((_type) => Settings, { nullable: true, cascade: true })
  @JoinColumn({ name: 'league_settings_id' })
  settings: Settings | null

  @CreateDateColumn()
  date_created: Date
}
