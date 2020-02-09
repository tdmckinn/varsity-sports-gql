declare module 'lodash.shuffle'

declare module '*.json' {
  const value: any
  const NFL_DATA: any
  const NFL_ADP: any
  const NFL_TEAMS: any
  const NFL_POSITONS: any

  const VSF_USERS: any
  const VSF_LEAGUES: any
  const VSF_TEAMS: any
  const VSF_SETTINGS: any
  const VSF_LEAGUE_SETTINGS: any

  export default value
  export { NFL_DATA }
  export { NFL_ADP }
  export { NFL_TEAMS }
  export { NFL_POSITONS }

  export { VSF_USERS }
  export { VSF_LEAGUES }
  export { VSF_TEAMS }
  export { VSF_SETTINGS }
  export { VSF_LEAGUE_SETTINGS }
}
