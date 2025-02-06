import mongoose from 'mongoose'

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/local'

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI)
    console.log('✅ MongoDB connected!')
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    process.exit(1)
  }
}
