import Fastify from 'fastify'
import { connectDB } from './db'
import trendsRoutes from './routes/trends'
import insightRoutes from './routes/insights'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

const fastify = Fastify({ logger: true })

// Define Type for Energy Entry
interface EnergyEntry {
  timestamp: Date
  device: 'fridge' | 'oven' | 'lights' | 'ev charger'
  usage_kwh: number
}

async function startServer() {
  await connectDB()

  fastify.register(trendsRoutes)
  fastify.register(insightRoutes)

  await fastify.listen({ port: 3000 })
  console.log('🚀 Server running at http://localhost:3000')
}

startServer().catch(console.error)
