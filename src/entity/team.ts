import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm'

import { League } from './league'
import { User } from './user'
import { Player } from './player'

@Entity()
export class Team {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  league_id: number

  @Column()
  user_id: string

  @Column('simple-array')
  picks: number[]

  @ManyToOne((_type) => User, (user) => user.teams)
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne((_type) => League, (league) => league.teams)
  @JoinColumn({ name: 'league_id' })
  league: League

  // has many players
  @OneToMany((_type) => Player, (player) => player.team, { cascade: true })
  players: Player[]

  @CreateDateColumn()
  date_created: string
}
