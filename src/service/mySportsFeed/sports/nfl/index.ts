import * as vshttp from '../../../../api'

const authToken = Buffer.from(
  `${process.env.MY_SPORTS_FEED_SECRET_TOKEN}:MYSPORTSFEEDS`
).toString('base64')

export const fetchWeeklyGames = async () => {
  try {
    const {data} = await vshttp.get(
      `${process.env.MY_SPORTS_FEED_URL}/nfl/2020-playoff/games.json`,
      {
        headers: {
          Authorization: `Basic ${authToken}`,
        },
      }
    )
    return data;
  } catch (e) {
    return {
      error: e,
    }
  }
}
