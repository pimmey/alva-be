import { FastifyInstance } from 'fastify'
import { EnergyUsage } from '../models/EnergyUsage'
import dayjs from 'dayjs'

export default async function insightRoutes(
  fastify: FastifyInstance
) {
  fastify.get('/insights', async (request, reply) => {
    const today = dayjs().add(1, 'day') // Mock today for testing
    const startDate = today.startOf('week')
    const previousStartDate = startDate.subtract(1, 'week')
    const nextStartDate = startDate.add(1, 'week')

    // Fetch current week's data
    const usageData = await EnergyUsage.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate.toDate(), $lt: today.toDate() }
        }
      },
      {
        $group: {
          _id: '$device',
          total_usage: { $sum: '$usage_kwh' }
        }
      },
      { $sort: { total_usage: -1 } }
    ])

    const highestDevice = usageData[0] || {
      _id: 'Unknown',
      total_usage: 0
    }

    // Fetch previous week's data
    const previousUsageData = await EnergyUsage.aggregate([
      {
        $match: {
          timestamp: {
            $gte: previousStartDate.toDate(),
            $lt: startDate.toDate()
          }
        }
      },
      { $group: { _id: null, total_usage: { $sum: '$usage_kwh' } } }
    ])

    // ⏳ Peak usage hour across all devices
    const peakHourData = await EnergyUsage.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate.toDate(), $lt: today.toDate() }
        }
      },
      {
        $group: {
          _id: { hour: { $hour: '$timestamp' } },
          total_usage: { $sum: '$usage_kwh' }
        }
      },
      { $sort: { total_usage: -1 } }
    ])
    const peakHour = peakHourData.length
      ? peakHourData[0]._id.hour
      : null

    // 🍽️ Unusual Oven Usage Insight
    const ovenSpike = await EnergyUsage.aggregate([
      {
        $match: {
          timestamp: {
            $gte: startDate.toDate(),
            $lt: today.toDate()
          },
          device: 'oven'
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$timestamp'
              }
            }
          },
          total_usage: { $sum: '$usage_kwh' }
        }
      },
      { $sort: { total_usage: -1 } },
      { $limit: 1 }
    ])
    const unusualOvenUsage =
      ovenSpike.length && ovenSpike[0].total_usage > 5
        ? ovenSpike[0]
        : null

    // 🏠 Fridge Peak Consumption
    const fridgeUsage = await EnergyUsage.aggregate([
      {
        $match: {
          timestamp: {
            $gte: startDate.toDate(),
            $lt: today.toDate()
          },
          device: 'fridge'
        }
      },
      {
        $group: {
          _id: { hour: { $hour: '$timestamp' } },
          total_usage: { $sum: '$usage_kwh' }
        }
      },
      { $sort: { total_usage: -1 } },
      { $limit: 1 }
    ])
    const fridgePeak = fridgeUsage.length
      ? fridgeUsage[0]._id.hour
      : null

    reply.send([
      {
        emoji: '🔌',
        title: 'Highest consuming device',
        insight: `${highestDevice._id} with ${highestDevice.total_usage.toFixed(2)} kWh`
      },
      {
        emoji: '⚡️',
        title: 'Peak usage hour this week',
        insight: peakHour ? `${peakHour}:00` : 'N/A'
      },
      {
        emoji: '‼️',
        title: 'Energy spikes',
        insight: unusualOvenUsage
          ? `Your oven’s energy use spiked by ${unusualOvenUsage.total_usage.toFixed(2)} kWh on ${unusualOvenUsage._id.date}. Was it left on accidentally?`
          : null
      },
      {
        emoji: '🔋',
        title: 'Fridge peak usage',
        insight: fridgePeak
          ? `Your fridge consumes the most energy around ${fridgePeak}:00. Consider adjusting settings to save power.`
          : null
      }
    ])
  })
}
