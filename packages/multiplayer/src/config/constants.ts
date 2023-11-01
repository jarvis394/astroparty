import dotenv from 'dotenv'

const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env'
dotenv.config({ path: envFile })

export const PORT = process.env.PORT ? Number(process.env.PORT) : 9028
export const SIMULATE_LATENCY = process.env.SIMULATE_LATENCY === 'true'
export const LATENCY_RANGE_START = Number(process.env.LATENCY_RANGE_START)
export const LATENCY_RANGE_END = Number(process.env.LATENCY_RANGE_END)
