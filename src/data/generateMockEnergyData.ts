import { EnergyUsage } from '../models/EnergyUsage'
import { random } from 'lodash'
import dayjs from 'dayjs'

import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

export async function generateMockEnergyData(
  startDate: string,
  endDate: string,
  intervalMinutes: number = 15
) {
  console.log(
    `📊 Generating mock energy data from ${startDate} to ${endDate}`
  )

  let current = dayjs(startDate).utc() // ✅ Ensure UTC storage
  const end = dayjs(endDate).utc()
  const energyData = []

  while (current.isBefore(end)) {
    const timestamp = current.toDate()

    energyData.push({
      timestamp,
      device: 'fridge',
      usage_kwh: random(0.025, 0.045, true)
    })

    if (
      random(0, 1, true) < 0.5 &&
      ((current.hour() >= 12 && current.hour() < 14) ||
        (current.hour() >= 18 && current.hour() < 20))
    ) {
      energyData.push({
        timestamp,
        device: 'oven',
        usage_kwh: random(2.5, 3.5, true) / 4
      })
    }

    if (
      (current.hour() >= 15 && current.hour() < 24) ||
      (current.hour() >= 6 && current.hour() <= 9)
    ) {
      energyData.push({
        timestamp,
        device: 'lights',
        usage_kwh: random(0.01, 0.05, true)
      })
    }

    if (current.hour() >= 22 || current.hour() < 2) {
      energyData.push({
        timestamp,
        device: 'ev charger',
        usage_kwh: random(3.5, 4.5, true) / (4 * 4) // Spread ~4 kWh over 4 hours
      })
    }

    current = current.add(intervalMinutes, 'minutes')
  }

  await EnergyUsage.insertMany(energyData)
  console.log(`✅ Inserted ${energyData.length} mock records.`)
}
