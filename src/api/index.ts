import axios from 'axios'

export const get = (url: string, options: any) => {
  return axios.get(url, {
    ...options,
  })
}
