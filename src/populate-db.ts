import mongoose from 'mongoose'
import { generateMockEnergyData } from './data/generateMockEnergyData'
import dayjs from 'dayjs'

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/local'

export async function populateDb() {
  try {
    console.log('🚀 Connecting to MongoDB...')
    await mongoose.connect(MONGO_URI)
    console.log('✅ Connected!')

    const startDate = '2024-10-01' // Let's gen some data starting October 2024
    const endDate = dayjs().add(1, 'day').format('YYYY-MM-DD') // ✅ Today + 1

    // Generate mock data for the past 3 months + real-time updates
    await generateMockEnergyData(startDate, endDate)

    console.log('🎉 Data population completed!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  }
}

populateDb()
