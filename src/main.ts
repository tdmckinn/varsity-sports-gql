import { ApolloServer, gql } from 'apollo-server'
import { RedisPubSub } from 'graphql-redis-subscriptions'
import { format } from 'date-fns'
import shuffle from 'lodash.shuffle'
import Redis from 'ioredis'
import * as faker from 'faker'
import 'reflect-metadata'
import { createConnection, getConnectionOptions } from 'typeorm'

import { NFL_DATA } from './data/nfl_data_complete.json'
import { NFL_ADP } from './data/nfl_adp.json'
import { NFL_TEAMS } from './data/nfl_teams.json'
import { NFL_POSITONS } from './data/nfl_positions.json'

import { VSF_USERS } from './data/vsf_users.json'
// import { VSF_LEAGUES } from './data/vsf_leagues.json'
// import { VSF_TEAMS } from './data/vsf_teams.json'
import { VSF_SETTINGS } from './data/vsf_settings.json'
import { VSF_LEAGUE_SETTINGS } from './data/vsf_league_settings.json'

import { User } from './entity/user'
import { League } from './entity/league'
import { Team } from './entity/team'
import { Settings } from './entity/settings'
// import { Player } from './entity/player's

import { typeDefs } from './typeDefs'

const redisOptions: any = {
  port: process.env.REDIS_PORT,
  host: process.env.REDIS_HOST || '127.0.0.1',
  retry_strategy: (opts: { attempt: number }) => {
    return Math.max(opts.attempt * 100, 3000)
  },
}
const redis = new Redis(redisOptions)
const pubsub = new RedisPubSub({
  publisher: new Redis(redisOptions),
  subscriber: new Redis(redisOptions),
})

const getShuffledUserDraftPositions = () =>
  shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

/**
 * TODO: Use Leagues Settings
 */
const draftPicksByRound = (numberOfTeams = 10, numOfRosterPositions = 15) => {
  const allDraftPicks = {}
  for (let draftPosition = 1; draftPosition <= numberOfTeams; draftPosition++) {
    const picks: number[] = []
    for (let round = 1; round <= numOfRosterPositions; round++) {
      let draftPick: number

      draftPick =
        round % 2 === 0
          ? round * numberOfTeams - draftPosition + 1
          : (draftPick = (round - 1) * numberOfTeams + draftPosition)

      picks.push(draftPick)
    }
    allDraftPicks[draftPosition] = picks
  }
  return allDraftPicks
}

const getLeagueTeams = (teams: Team[]) => {
  return teams.map((team) => {
    return {
      id: team.id,
      Name: team.name,
      LeagueID: team.league_id,
      OwnerID: team.user_id,
      Players: team.players,
      Picks: team.picks,
    }
  })
}

getConnectionOptions().then((connectionOptions) => {
  return createConnection({
    ...connectionOptions,
    ...{
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT,
      database: process.env.POSTGRES_DB,
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    },
  } as any)
    .then(async (connection) => {
      /**
       * Subscription Events
       */
      const DRAFT_STATUS_CHANGED = 'draft_status_changed'
      const DRAFT_COMPLETE = 'draft_complete'
      const NEW_USER_DRAFT_PICK = 'new_user_draft_pick'
      const entityManager = connection.manager

      const resolvers = {
        Query: {
          /**
           *  VSF player info used for live draft
           */
          draft: async (_root: any, { draftId }: any) => {
            const userDraft = await redis.get(draftId)
            if (draftId && userDraft) {
              return JSON.parse(userDraft)
            }

            return null
          },
          /**
           * Replace JSON with MySportsFeed API
           */
          players: () => NFL_DATA,
          teams: () => NFL_TEAMS,
          userTeams: async (_: any, { userId }: { userId: string }) => {
            const user = await entityManager
              .createQueryBuilder(User, 'user')
              .leftJoinAndSelect('user.teams', 'team')
              .where('user.id = :id', { id: userId })
              .getOne()

            if (user) {
              return getLeagueTeams(user.teams)
            }
            return []
          },
          async leagues() {
            const leagues = await entityManager
              .createQueryBuilder(League, 'league')
              .leftJoinAndSelect('league.teams', 'team')
              .leftJoinAndSelect('league.settings', 'settings')
              .getMany()

            const _leagues = leagues
              ? leagues.map((league) => {
                  return {
                    id: league.id,
                    CommissionerID: league.commissioner_id,
                    DraftDateTime: league.draft_date_time,
                    LeagueName: league.league_name,
                    LeagueSettings: {
                      id: league.settings!.id,
                      ...league.settings!.settings_json,
                    },
                    LeagueTeams: getLeagueTeams(league.teams),
                  }
                })
              : []

            return _leagues
          },
          rosterPositions: () => NFL_POSITONS,
          users: () => VSF_USERS,
          settings: () => VSF_SETTINGS,
        },
        Mutation: {
          async createUser(_: any, { user }: any) {
            const existingUser = await entityManager.findOne(User, user.id)

            if (existingUser && existingUser.id) {
              return user
            }

            const newUser = await entityManager.save(User, {
              id: user.id,
              name: user.Name,
              email: user.Email,
              avatar: '',
              time_zone: '',
            })
            return newUser
          },
          createTeam(_team: any) {
            return {
              id: 1,
              LeagueID: 1,
              Name: 'Boozoo 49',
              OwnerName: 'John Doe',
              Players: [],
              DateCreated: '12-02-2008',
            }
          },
          // editTeam() {},
          // deleteTeam() {},
          async createLeague(_root: any, { league }: any, _context: any) {
            if (!league) {
              return null
            }
            const {
              CommissionerID,
              LeagueName,
              CommissionerName,
              DraftDateTime,
              TeamName,
            } = league

            const user = await entityManager
              .createQueryBuilder(User, 'user')
              .leftJoinAndSelect('user.leagues', 'league')
              .where('user.id = :id', { id: CommissionerID })
              .getOne()

            if (!user || !CommissionerID) {
              throw new Error(
                `You must be a registered user to create a league`
              )
            }
            if (user && user.leagues.length === 5) {
              throw new Error(
                `You have reached the maximum number of leagues allowed`
              )
            }

            const settings = new Settings()
            settings.settings_json = {
              ...VSF_LEAGUE_SETTINGS,
            }

            const newTeam = new Team()
            newTeam.name = TeamName
            newTeam.user_id = CommissionerID
            newTeam.picks = []
            newTeam.players = []

            const newLeague = await entityManager.create(League, {
              draft_id: '',
              commissioner_id: CommissionerID,
              commissioner_name: CommissionerName,
              league_name: LeagueName,
              draft_date_time: DraftDateTime,
              settings,
              teams: [newTeam],
            })

            await entityManager.save(League, newLeague)

            return {
              id: newLeague.id,
              CommissionerID: newLeague.commissioner_id,
              LeagueName: newLeague.league_name,
              LeagueSettings: {},
              LeagueTeams: newLeague.teams.map(({ id, user_id }) => {
                return {
                  id,
                  OwnerID: user_id,
                }
              }),
            }
          },
          async joinLeague(_root: any, { input }: any, _context: any) {
            const league = await entityManager
              .createQueryBuilder(League, 'league')
              .leftJoinAndSelect('league.teams', 'team')
              .where('league.id = :id', { id: input.id })
              .getOne()

            const newTeam = new Team()
            newTeam.name = input.name
            newTeam.league_id = input.id
            newTeam.user_id = input.ownerId
            newTeam.picks = []
            newTeam.players = []

            league!.teams.push(newTeam)
            await entityManager.save(League, league!)

            return ''
          },
          async updateLeagueSettings(
            _root: any,
            { settings }: any,
            _context: any
          ) {
            const league = await entityManager.findOne(League, {
              where: { id: settings.LeagueID },
              relations: ['settings'],
            })

            if (league) {
              delete settings.LeagueID
              league.settings!.settings_json = settings

              await entityManager.save(League, league)
              return settings
            }
            return 'No associated league for updating settings'
          },
          enteredDraft: async (_root: any, { leagueId }: any) => {
            try {
              if (!leagueId) {
                throw new Error('League Id Required to Enter Draft')
              }

              const draftId = `draft_${leagueId}`
              const currentDraft = await redis.get(draftId)

              pubsub.publish(DRAFT_STATUS_CHANGED, { draftStatusChanged: true })

              if (currentDraft) {
                return JSON.parse(currentDraft)
              } else {
                const league = await entityManager
                  .createQueryBuilder(League, 'league')
                  .leftJoinAndSelect('league.teams', 'team')
                  .leftJoinAndSelect('league.settings', 'settings')
                  .where('league.id = :id', { id: leagueId })
                  .getOne()

                const teamPickOrder = getShuffledUserDraftPositions()
                const teams = league!.teams
                while (league!.teams.length < 10) {
                  /**
                   *
                   * User Creation Info
                   * OwnerID: teams.length + 1,
                   * Name: faker.name.findName(),
                   * Email: faker.internet.email(),
                   * DateCreated: format(new Date(), 'YYYY-MM-DD'),
                   * TimeZone: "America/Charlotte",
                   */
                  teams.push({
                    id: Math.floor(Math.random() * Math.floor(12000)),
                    user_id: (teams.length + 1).toString(),
                    user: new User(),
                    league: new League(),
                    league_id: Number(leagueId),
                    name: faker.commerce.productName(),
                    date_created: format(new Date(), 'YYYY-MM-DD'),
                    picks: [],
                    players: [],
                  })
                }

                const picks = draftPicksByRound()

                const draftTeams: any = teams.map((team, index) => {
                  const draftingPosition = teamPickOrder[index]
                  return {
                    id: team.id,
                    LeagueID: team.league_id,
                    Name: team.name,
                    OwnerID: team.user_id,
                    DateCreated: team.date_created,
                    Picks: picks[draftingPosition],
                    Players: [],
                  }
                })

                const draftSetup = {
                  id: draftId,
                  LeagueID: league!.id,
                  CurrentRound: 1,
                  CurrentUserDrafting: 'John Doe',
                  DraftDateTime: league!.draft_date_time,
                  IsDraftComplete: false,
                  Players: NFL_ADP,
                  Rounds: 15,
                  Teams: draftTeams,
                }

                redis.set(draftId, JSON.stringify(draftSetup))

                return draftSetup
              }
            } catch (error) {
              return {
                error,
              }
            }
          },
          addDraftPickToUserTeam: async (_: any, { selectedPick }: any) => {
            pubsub.publish(NEW_USER_DRAFT_PICK, { selectedPick })
            const userDraft = await redis.get(selectedPick.DraftID)

            if (userDraft) {
              const parsedDraftSession = JSON.parse(userDraft)
              parsedDraftSession.Teams.find(
                (team: { id: any }) => team.id === selectedPick.TeamID
              ).Players.push({
                id: selectedPick.id,
                Name: selectedPick.Name,
                LineUpPosition: selectedPick.LineUpPosition,
              })

              const index = parsedDraftSession.Players.findIndex(
                (player: { id: any }) => player.id === selectedPick.id
              )
              parsedDraftSession.Players.splice(index, 1)

              redis.set(
                selectedPick.DraftID,
                JSON.stringify(parsedDraftSession)
              )
            }
            return selectedPick
          },
        },
        Subscription: {
          draftStatusChanged: {
            resolve: (payload: { draftStatusChanged: any }) => {
              console.log('Apollo Subscription - Draft Status Changed')
              return payload.draftStatusChanged
            },
            subscribe: () => pubsub.asyncIterator(DRAFT_STATUS_CHANGED),
          },
          newUserDraftPick: {
            resolve: (payload: { selectedPick: any }) => {
              console.log('Apollo Subscription - Draft Status Changed')
              return payload.selectedPick
            },
            subscribe: () => pubsub.asyncIterator(NEW_USER_DRAFT_PICK),
          },
        },
      }
      //#endregion

      // TODO: On Completion of draft save results from redis to DB
      const apolloOptions: any = {
        typeDefs: gql(typeDefs),
        resolvers,
        subscriptions: true,
        cors: true,
        host: '0.0.0.0',
      }

      const server = new ApolloServer(apolloOptions)

      server.listen().then(({ url }) => {
        console.log(`🚀 Server ready at ${url}`)
      })
    })
    .catch((error) => console.log('TypeORM connection error: ', error))
})
