import { ApolloServer, gql } from 'apollo-server'
import { RedisPubSub } from 'graphql-redis-subscriptions'
import Redis from 'ioredis'
import 'reflect-metadata'
import { createConnection, getConnectionOptions } from 'typeorm'

// import { VSF_LEAGUES } from './data/vsf_leagues.json'
// import { VSF_TEAMS } from './data/vsf_teams.json'
import { VSF_SETTINGS } from './data/vsf_settings.json'
import { VSF_LEAGUE_SETTINGS } from './data/vsf_league_settings.json'

import { Team } from './entity/team'
// import { Player } from './entity/player's

import { typeDefs } from './typeDefs'
import { Subscription } from './resolvers/subscription'
import { Query } from './resolvers/query'
import { Mutation } from './resolvers/mutation'

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
      const entityManager = connection.manager

      const resolvers = {
        Query: Query({ entityManager, redis }),
        Mutation: Mutation({ entityManager, pubsub, redis }),
        Subscription: Subscription({ pubsub }),
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
