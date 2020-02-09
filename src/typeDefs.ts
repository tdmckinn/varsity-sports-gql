//#region GraphQL schema
export const typeDefs = `
  type RosterPosition {
    id: Int
    Name: String
  }

  type Player {
    "Player Info!"
    id: Int
    Rank: Int
    Name: String
    Position: String
    Team: String
    Age: Int
    PassingYards: Float
    PassingTouchDowns: Int
    PassingInterceptions: Int
    RushingYards: Int
    RushingTouchdowns: Int
    ReceivingTouchDowns: Int
    Fumbles: Int
    FubmlesRecovered: Int
    FantasyPoints: Float
    FantasyPointsPerGame: Float
  }

  type NFL_ADP_Player {
    id: Int
    Rank: Int
    Name: String
    Position: String
    Team: String
    Age: Int
    FantasyPoints: Float
    AverageDraftPosition: Float
    LineUpPosition: String
  }

  type NFL_Team {
    id: Int
    Team: String
    FullName: String
    ShortName: String
  }

  type LeagueSettings {
    id: Int
    LeagueID: Int
    DraftType: String
    Scoring: String
    MaxTeams: Int
    WaiverType: String
    RosterPositions: [String]
    TradeDeadline: String
  }

  type ConfigValue {
    id: String
    value: String
  }

  type LeagueConfigSetting {
    id: String
    type: String
    text: String
    value: String
    values: [ConfigValue]
    singleValues: [String]
    readOnly: Boolean
  }

  type League {
    id: Int
    DraftID: Int
    DraftDateTime: String
    CommissionerName: String
    CommissionerID: String
    LeagueName: String
    LeagueTeams: [UserTeam]
    LeagueSettings: LeagueSettings
    Users: [User]
    DateCreated: String
    IsDraftComplete: Boolean
  }

  type User {
    id: String
    Name: String
    Email: String
    Avatar: String
    Teams: [UserTeam]
    Leagues: [League]
    TimeZone: String
  }

  type UserTeam {
    id: Int
    LeagueID: Int
    Name: String
    OwnerID: String
    Players: [UserPlayer]
    DateCreated: String
    Picks: [Int]
  }

  type UserPlayer {
    id: Int
    TeamID: Int
    Name: String
    Position: String
    LineUpPosition: String
  }

  type Draft {
    id: String
    LeagueID: Int
    CurrentRound: Int
    CurrentUserDrafting: String
    DraftDateTime: String
    IsDraftComplete: Boolean
    Rounds: Int
    Teams: [UserTeam]
    Players: [NFL_ADP_Player]
  }

  type Result {
    msg: String
    error: String
    success: Boolean
  }

  # QUERIES
  type Query {
    players: [Player]
    draft(draftId: String): Draft
    users: [User]
    userTeams(userId: String): [UserTeam]
    leagues: [League]
    settings: [LeagueConfigSetting]
    teams: [NFL_Team]
    rosterPositions: [RosterPosition]
  }

  # INPUTS
  input CreateUserInput {
    id: String
    Name: String
    Email: String
  }

  input CreateTeamInput {
    name: String
    owner: String
  }

  input CreateLeagueInput {
    CommissionerID: String
    CommissionerName: String
    LeagueName: String
    DraftDateTime: String
    TeamName: String
  }

  input JoinLeagueInput {
    id: Int
    ownerId: String
    name: String
  }

  input UpdateLeagueSettingsInput {
    id: Int
    LeagueID: Int
    DraftType: String
    Scoring: String
    MaxTeams: Int
    WaiverType: String
    RosterPositions: [String]
    TradeDeadline: String
  }

  input PlayerPickInput {
    id: Int
    DraftID: String
    TeamID: Int
    Name: String
    LineUpPosition: String
  }

  # The mutation root type, used to define all mutations.
  type Mutation {
    addDraftPickToUserTeam(selectedPick: PlayerPickInput!): UserPlayer
    createUser(user: CreateUserInput!): User
    createTeam(team: CreateTeamInput!): UserTeam
    createLeague(league: CreateLeagueInput!): League
    joinLeague(input: JoinLeagueInput!): UserTeam
    enteredDraft(leagueId: String!): Draft
    exitDraftSession(userId: String!, draftId: String!): Result
    updateLeagueSettings(settings: UpdateLeagueSettingsInput!): LeagueSettings
  }

  # SUBSCRIPTIONS
  type Subscription {
    draftStatusChanged(isDraftStarted: Boolean!): Boolean
    newUserDraftPick(selectedPick: PlayerPickInput!): UserPlayer
  }
`
//#endregion
