import { League } from '../entity/league'
import { Settings } from '../entity/settings'
import { User } from '../entity/user'
import { Team } from '../entity/team'

import { NFL_TEAMS } from '../data/nfl_teams.json'
import { NFL_POSITONS } from '../data/nfl_positions.json'
import { NFL_DATA } from '../data/nfl_data_complete.json'
import { VSF_USERS } from '../data/vsf_users.json'
import { VSF_SETTINGS } from '../data/vsf_settings.json'
import { VSF_LEAGUE_SETTINGS } from '../data/vsf_league_settings.json'

import { fetchWeeklyGames } from '../service/mySportsFeed/sports/nfl'
import { GameSchedule } from '../types'

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

export const Query = ({ entityManager, redis }) => ({
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
  weeklyGames: async () => {
    const data = await fetchWeeklyGames() as {games: any, errors: any}
    console.log("WEEKLY GAMES >>>>", data.games)
    if (data.errors) {
      return [];
    }
    return data.games.map(({schedule}: {schedule: GameSchedule}) => ({...schedule}))
  },
})
