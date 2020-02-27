import * as vshttp from '../../../../api'

const {
  MY_SPORTS_FEED_SECRET_TOKEN,
  MY_SPORTS_FEED_PASSWORD,
  MY_SPORTS_FEED_URL,
} = process.env

const authToken = Buffer.from(
  `${MY_SPORTS_FEED_SECRET_TOKEN}${MY_SPORTS_FEED_PASSWORD}`
).toString('base64')


export const fetchWeeklyGames = async () => {
  try {
    const { data } = await vshttp.get(
      `${MY_SPORTS_FEED_URL}/nfl/2020-playoff/games.json`,
      {
        headers: {
          Authorization: `Basic ${authToken}`,
        },
      }
    )
    return data
  } catch (e) {
    return {
      error: e,
    }
  }
}
