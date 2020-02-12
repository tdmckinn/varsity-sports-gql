export interface Weather {
  type: string
  description: string
  wind: {
    speed: string
    direction: {
      degrees: number
      label: string
    }
  }
  temperature: {
    fahrenheit: number
    celsius: number
  }
  humidityPercent: string
}

export interface Venue {
  id: number
  name: string
}

export interface GameSchedule {
  id: number
  week: number
  awayTeam: Team
  homeTeam: Team
  broadcasters: [string]
  weather: Weather
  venue: Venue
  startTime: string
  venueAllegiance: string
}

export interface Team {
  id: number
  abbreviation: string
}