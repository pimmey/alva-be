import {
  FastifyInstance,
  FastifyRequest,
  FastifyReply
} from 'fastify'
import { EnergyUsage } from '../models/EnergyUsage' // Mongoose model
import dayjs from 'dayjs'

// Allowed devices
const devices = ['fridge', 'oven', 'lights', 'ev charger'] as const
type DeviceType = (typeof devices)[number]

interface DailyTrendQuery {
  date: string // "YYYY-MM-DD"
}

// MongoDB result type
interface EnergyUsageResult {
  _id: { hour: number; device: DeviceType }
  total_usage: number
}

// Trend data format
interface TrendData {
  x: string
  fridge: number
  oven: number
  lights: number
  'ev charger': number
}

export default async function trendsRoutes(fastify: FastifyInstance) {
  // 📌 Daily Trend: Get hourly usage for a specific date
  fastify.get(
    '/trends/daily',
    async (
      request: FastifyRequest<{ Querystring: DailyTrendQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const { date } = request.query

        if (!date) {
          return reply
            .status(400)
            .send({ error: "Missing 'date' parameter." })
        }

        console.log(`📌 Fetching local daily trend for ${date}`)

        // Query MongoDB for records that match the given date
        const energyUsage: EnergyUsageResult[] =
          await EnergyUsage.aggregate([
            {
              $match: {
                timestamp: {
                  $gte: new Date(`${date}T00:00:00`), // Match start of day
                  $lt: new Date(`${date}T23:59:59`) // Match end of day
                }
              }
            },
            {
              $group: {
                _id: {
                  hour: {
                    $hour: {
                      date: '$timestamp'
                      // timezone: 'Asia/Bangkok'
                    }
                  },
                  device: '$device'
                },
                total_usage: { $sum: '$usage_kwh' }
              }
            }
          ])

        // Initialize 24-hour structure
        const formattedData: TrendData[] = Array.from(
          { length: 24 },
          (_, i) => ({
            x: `${i}:00`,
            fridge: 0,
            oven: 0,
            lights: 0,
            'ev charger': 0
          })
        )

        // Populate data from MongoDB query
        energyUsage.forEach(
          ({ _id: { hour, device }, total_usage }) => {
            if (devices.includes(device)) {
              formattedData[hour][device] = total_usage
            }
          }
        )

        // Compute total usage & per-device breakdown
        const totalUsage = formattedData.reduce(
          (sum, entry) =>
            sum +
            devices.reduce((acc, device) => acc + entry[device], 0),
          0
        )

        const deviceBreakdown = devices.reduce<
          Record<DeviceType, number>
        >(
          (acc, device) => {
            acc[device] = formattedData.reduce(
              (sum, entry) => sum + entry[device],
              0
            )
            return acc
          },
          {} as Record<DeviceType, number>
        )

        return reply.send({
          total_usage_kwh: totalUsage.toFixed(2),
          device_breakdown: deviceBreakdown,
          data: formattedData
        })
      } catch (error) {
        console.error('❌ Error in /trends/daily:', error)
        return reply
          .status(500)
          .send({ error: 'Internal Server Error' })
      }
    }
  )

  // 📌 Weekly Trend: Get daily usage for a specific week
  fastify.get('/trends/weekly', async (request, reply) => {
    const { date } = request.query as { date: string }
    if (!date)
      return reply
        .status(400)
        .send({ error: 'Date parameter is required (YYYY-MM-DD)' })

    const selectedDate = new Date(date)
    const dayOfWeek = selectedDate.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const mondayOfWeek = new Date(selectedDate)
    mondayOfWeek.setDate(selectedDate.getDate() - daysToMonday)
    const sundayOfWeek = new Date(mondayOfWeek)
    sundayOfWeek.setDate(mondayOfWeek.getDate() + 6)

    console.log(
      `📆 Fetching weekly data from ${mondayOfWeek.toISOString().split('T')[0]} to ${sundayOfWeek.toISOString().split('T')[0]}`
    )

    const rawData = await EnergyUsage.aggregate([
      {
        $match: {
          timestamp: {
            $gte: mondayOfWeek,
            $lt: new Date(
              sundayOfWeek.getTime() + 24 * 60 * 60 * 1000
            )
          }
        }
      },
      {
        $group: {
          _id: {
            device: '$device',
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
      { $sort: { '_id.date': 1 } }
    ])

    // Ensure all 7 days exist (Monday → Sunday)
    const completeData: Record<string, any> = {}
    for (let i = 0; i < 7; i++) {
      const date = new Date(mondayOfWeek)
      console.log({ date })
      date.setDate(mondayOfWeek.getDate() + i)
      const dateKey = date.toISOString().split('T')[0]
      completeData[dateKey] = {
        x: date.toISOString().split('T')[0],
        fridge: 0,
        oven: 0,
        lights: 0,
        'ev charger': 0
      }
    }

    let totalEnergy = 0
    let deviceTotals: Record<string, number> = {
      fridge: 0,
      oven: 0,
      lights: 0,
      'ev charger': 0
    }

    rawData.forEach(({ _id, total_usage }) => {
      if (completeData[_id.date]) {
        completeData[_id.date][_id.device] = total_usage
        totalEnergy += total_usage
        deviceTotals[_id.device] += total_usage
      }
    })

    return reply.send({
      total_usage_kwh: totalEnergy.toFixed(2),
      device_breakdown: deviceTotals,
      data: Object.values(completeData)
    })
  })

  // 📌 Monthly Trend: Get daily usage for a specific month
  fastify.get('/trends/monthly', async (request, reply) => {
    const { date: month } = request.query as { date: string }
    if (!month)
      return reply
        .status(400)
        .send({ error: 'Month parameter is required (YYYY-MM)' })

    const startOfMonth = new Date(`${month}-01T00:00:00Z`)
    const endOfMonth = new Date(startOfMonth)
    endOfMonth.setMonth(startOfMonth.getMonth() + 1)
    endOfMonth.setDate(0) // Last day of the month

    console.log(
      `📆 Fetching monthly data from ${startOfMonth.toISOString().split('T')[0]} to ${endOfMonth.toISOString().split('T')[0]}`
    )

    const rawData = await EnergyUsage.aggregate([
      {
        $match: {
          timestamp: {
            $gte: startOfMonth,
            $lt: new Date(endOfMonth.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: {
            device: '$device',
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
      { $sort: { '_id.date': 1 } }
    ])

    // Ensure all days exist in the month
    const completeData: Record<string, any> = {}
    for (let i = 1; i <= endOfMonth.getDate(); i++) {
      const dateKey = `${month}-${i.toString().padStart(2, '0')}`
      completeData[dateKey] = {
        x: new Date(dateKey).toISOString().split('T')[0],
        fridge: 0,
        oven: 0,
        lights: 0,
        'ev charger': 0
      }
    }

    let totalEnergy = 0
    let deviceTotals: Record<string, number> = {
      fridge: 0,
      oven: 0,
      lights: 0,
      'ev charger': 0
    }

    rawData.forEach(({ _id, total_usage }) => {
      if (completeData[_id.date]) {
        completeData[_id.date][_id.device] = total_usage
        totalEnergy += total_usage
        deviceTotals[_id.device] += total_usage
      }
    })

    return reply.send({
      total_usage_kwh: totalEnergy.toFixed(2),
      device_breakdown: deviceTotals,
      data: Object.values(completeData)
    })
  })
}
