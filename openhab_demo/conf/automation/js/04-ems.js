const { items, rules, Quantity, time } = require('openhab')

// ---------------------------------------------------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------------------------------------------------

// Give the rules 60 seconds to update all states by triggering 60 seconds before persistence stores the states
const CRON_BEFORE_EOD_PERSIST = '0 58 23 ? * * *'
const CRON_BEFORE_EOM_PERSIST = '0 57 23 L * * *' // run before EOD to make sure today's value not counted twice

const BATTERY_CAPACITY = Quantity('10 kWh')
const STEP_SECONDS = 15

// ---------------------------------------------------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------------------------------------------------
const solarPower = items.getItem('Solar_Power_Total')
const solarProductionDay = items.getItem('Solar_Production_Day')

const loadPower = items.getItem('EMS_Load_Power')
const consumptionDay = items.getItem('EMS_TotalConsumption_Day')
const consumptionMonth = items.getItem('EMS_TotalConsumption_Month')
const selfConsumptionDay = items.getItem('EMS_SelfConsumption_Day')
const selfConsumptionMonth = items.getItem('EMS_SelfConsumption_Month')

const gridPower = items.getItem('EMS_Grid_Power')
const gridConsumptionDay = items.getItem('EMS_GridConsumption_Day')
const gridConsumptionMonth = items.getItem('EMS_GridConsumption_Month')
const feedInDay = items.getItem('EMS_FeedIn_Day')
const feedInMonth = items.getItem('EMS_FeedIn_Month')

const batteryPower = items.getItem('EMS_Battery_Power')
const batterySoC = items.getItem('EMS_Battery_SoC')

// ---------------------------------------------------------------------------------------------------------------------
// Load Simulation Rule
// ---------------------------------------------------------------------------------------------------------------------
rules.when()
  .system().startLevel(100)
  .or().cron(`*/${STEP_SECONDS} */1 * ? * * *`)
  .then(() => {
    const base = Math.random() < 0.2 ? 2000 : 400
    const random = base + (150 - Math.random() * 300)
    loadPower.postUpdate(Quantity(random + ' W'))
  })
  .build('Load Simulation', '', ['EMS'])

// ---------------------------------------------------------------------------------------------------------------------
// Battery Simulation Rule
// ---------------------------------------------------------------------------------------------------------------------
rules.when()
  .system().startLevel(100)
  .or().cron(`*/${STEP_SECONDS} * * ? * * *`) // every STEP_SECOND seconds
  .then(() => {
    const solar = solarPower.quantityState ?? Quantity('0 W')
    const load = loadPower.quantityState ?? Quantity('0 W')
    let socPercent = batterySoC.numericState ?? 50                    // integer %
    let socEnergy = BATTERY_CAPACITY.multiply(socPercent / 100) // kWh

    console.info(`Battery Simulation - SoC = ${batterySoC.numericState} %, Stored Energy = ${socEnergy}`)

    const deltaP = solar.subtract(load) // Quantity (W): solar - load
    let battP = Quantity('0 W')   // +W discharging, -W charging
    let gridP = Quantity('0 W')   // +W import, -W export

    if (deltaP.greaterThan('0 W')) {
      // Surplus -> Charge battery
      console.info(`Battery Simulation - Surplus Power ${deltaP}`)
      const potentialCharge = deltaP.multiply(Quantity(STEP_SECONDS + ' s')).toUnit('Wh')
      const availableCap = BATTERY_CAPACITY.subtract(socEnergy)
      const actualCharge = potentialCharge.lessThan(availableCap) ? potentialCharge : availableCap
      console.info(`Battery Simulation - Charging ${actualCharge} -> Battery`)

      if (!actualCharge.equal('0 kWh')) {
        socEnergy = socEnergy.add(actualCharge)
        battP = actualCharge.divide(Quantity(STEP_SECONDS + ' s')).toUnit('W').multiply('-1')
      }
    } else if (deltaP.lessThan('0 W')) {
      // Deficit -> Discharge battery
      console.info(`Battery Simulation - Deficit Power ${deltaP.multiply('-1')}`)
      const needed = deltaP.multiply('-1').multiply(Quantity(STEP_SECONDS + ' s')).toUnit('Wh')
      const actualDischarge = needed.lessThan(socEnergy) ? needed : socEnergy
      console.info(`Battery Simulation - Discharging ${actualDischarge} <- Battery`)

      if (!actualDischarge.equal('0 kWh')) {
        socEnergy = socEnergy.subtract(actualDischarge)
        battP = actualDischarge.divide(Quantity(STEP_SECONDS + ' s')).toUnit('W')
      }
    }

    // Calculate grid power
    gridP = deltaP.add(battP)

    // Convert SoC back to %
    socPercent = Math.round(socEnergy.divide(BATTERY_CAPACITY).float * 100)

    // Update Items
    batterySoC.postUpdate(socPercent) // integer %
    batteryPower.postUpdate(battP)    // +W discharging, -W charging
    gridPower.postUpdate(gridP)       // +W import, -W export
  })
  .build('Battery Simulation', '', ['EMS'])

// ---------------------------------------------------------------------------------------------------------------------
// Energy Calculation Rules
// ---------------------------------------------------------------------------------------------------------------------
/**
 * Calculates the daily amount of energy from the power value using the Riemann Sum.
 * @param {items.Item} power the Item providing the power value
 * @param {items.Item} plusDay the Item to send the energy value to, if energy >= 0 kWh
 * @param {items.Item} [minusDay] the optional Item to send the energy value to, if energy < 0 kWh
 */
function createDailyEnergyCalculationRule (power, plusDay, minusDay) {
  rules.when()
    .system().startLevel(100)
    .or().cron('0 */15 * * * ? *')
    .or().cron(CRON_BEFORE_EOD_PERSIST)
    .then(() => {
      const begin = time.toZDT().withHour(0).withMinute(0).withSecond(0)
      const end = time.toZDT()
      // Use RiemannType.MIDPOINT approximation, see https://github.com/openhab/openhab-core/pull/4461#issue-2682710626
      const energy = power.persistence.riemannSumBetween(begin, end, items.RiemannType.MIDPOINT)?.quantityState
      if (!energy) return
      if (energy.greaterThanOrEqual('0 kWh')) {
        plusDay.postUpdate(energy)
        if (minusDay && minusDay.isUninitialized) minusDay.postUpdate('0 kWh')
      } else if (minusDay) {
        if (plusDay.isUninitialized) plusDay.postUpdate('0 kWh')
        minusDay.postUpdate(energy.multiply('-1'))
      }
    }).build(`Calculate ${plusDay.label}${minusDay ? ' and ' + minusDay.label : ''}`, '', ['EMS'])
}

/**
 * Calculates the monthly amount of energy by summarizing all persisted daily values of this month and today's value.
 * @param {items.Item} daily the Item of the daily energy values
 * @param {items.Item} monthly the Item for the monthly energy values
 */
function createMonthlyEnergyCalculationRule (daily, monthly) {
  rules.when()
    .system().startLevel(100)
    .or().cron('0 */15 * * * ? *')
    .or().cron(CRON_BEFORE_EOM_PERSIST)
    .then(() => {
      const begin = time.toZDT().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0)
      const end = time.toZDT()
      // Use RiemannType.MIDPOINT approximation, see https://github.com/openhab/openhab-core/pull/4461#issue-2682710626
      let total = daily.persistence.sumBetween(begin, end)?.quantityState
      if (!total) return
      if (!daily.quantityState) return
      monthly.postUpdate(total.add(consumptionDay.quantityState))
    })
    .build(`Calculate ${monthly.label}`, '', ['EMS'])
}

createDailyEnergyCalculationRule(loadPower, consumptionDay)
createDailyEnergyCalculationRule(gridPower, gridConsumptionDay, feedInDay)

rules.when()
  .system().startLevel(100)
  .or().cron('0 */15 * * * ? *')
  .or().cron(CRON_BEFORE_EOD_PERSIST)
  .then(() => {
    const production = solarProductionDay.quantityState
    const feedIn = feedInDay.quantityState
    const selfConsumption = production.subtract(feedIn)
    selfConsumptionDay.postUpdate(selfConsumption)
  }).build('Calculate daily self-consumption', '', ['EMS'])

createMonthlyEnergyCalculationRule(consumptionDay, consumptionMonth)
createMonthlyEnergyCalculationRule(selfConsumptionDay, selfConsumptionMonth)
createMonthlyEnergyCalculationRule(gridConsumptionDay, gridConsumptionMonth)
createMonthlyEnergyCalculationRule(feedInDay, feedInMonth)
