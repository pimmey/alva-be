import mongoose, { Schema, Document } from 'mongoose'

export interface EnergyUsageDocument extends Document {
  timestamp: Date
  device: 'fridge' | 'oven' | 'lights' | 'ev charger'
  usage_kwh: number
}

const EnergyUsageSchema = new Schema<EnergyUsageDocument>(
  {
    timestamp: { type: Date, required: true, index: true },
    device: {
      type: String,
      enum: ['fridge', 'oven', 'lights', 'ev charger'],
      required: true
    },
    usage_kwh: { type: Number, required: true }
  },
  { collection: 'energyUsage' } // Explicitly name collection
)

// ✅ Ensure MongoDB creates a time-series collection
EnergyUsageSchema.set('timeseries', {
  timeField: 'timestamp',
  metaField: 'device',
  granularity: 'hours' // Optimize storage for hourly data TODO: or change to 15 min?
})

export const EnergyUsage = mongoose.model<EnergyUsageDocument>(
  'EnergyUsage',
  EnergyUsageSchema
)
