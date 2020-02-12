import shuffle from 'lodash.shuffle'
import { format } from 'date-fns'
import * as faker from 'faker'

import { League } from '../entity/league'
import { User } from '../entity/user'
import { Settings } from '../entity/settings'
import { Team } from '../entity/team'

// import { VSF_SETTINGS } from '../data/vsf_settings.json'
import { VSF_LEAGUE_SETTINGS } from '../data/vsf_league_settings.json'
import { NFL_ADP } from '../data/nfl_adp.json'

const DRAFT_STATUS_CHANGED = "draft_status_changed";
const NEW_USER_DRAFT_PICK = "new_user_draft_pick";

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

export const Mutation = ({entityManager, pubsub, redis}) => ({
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
})