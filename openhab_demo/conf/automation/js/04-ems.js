const { items, rules, Quantity, time } = require('openhab')

// ---------------------------------------------------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------------------------------------------------

// Give the rules 55 seconds to update all states by triggering 55 seconds before persistence stores the states
const CRON_BEFORE_EOD_PERSIST = '0 59 23 ? * * *'
const CRON_BEFORE_EOM_PERSIST = '0 58 23 L * * *' // run before EOD to make sure today's value not counted twice

const CRON_AFTER_BOD = '01 00 00 ? * * *';
const CRON_AFTER_BOM = '01 00 00 1 * * *';

const BATTERY_CAPACITY = Quantity('10 kWh')
const STEP_SECONDS = 15

// ---------------------------------------------------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------------------------------------------------
const solarPower = () => items.getItem('EMS_Solar_Power')
const solarProductionDay = () => items.getItem('Solar_Production_Day')

const loadPower = () => items.getItem('EMS_Load_Power')
const consumptionDay = () => items.getItem('EMS_TotalConsumption_Day')
const consumptionMonth = () => items.getItem('EMS_TotalConsumption_Month')
const selfConsumptionDay = () => items.getItem('EMS_SelfConsumption_Day')
const selfConsumptionMonth = () => items.getItem('EMS_SelfConsumption_Month')

const gridPower = () => items.getItem('EMS_Grid_Power')
const gridConsumptionDay = () => items.getItem('EMS_GridConsumption_Day')
const gridConsumptionMonth = () => items.getItem('EMS_GridConsumption_Month')
const feedInDay = () => items.getItem('EMS_FeedIn_Day')
const feedInMonth = () => items.getItem('EMS_FeedIn_Month')

const batteryPower = () => items.getItem('EMS_Battery_Power')
const batterySoC = () => items.getItem('EMS_Battery_SoC')

const electricityTariff = () => items.getItem('EMS_Electricity_Tariff')
const feedInTariff = () => items.getItem('EMS_FeedIn_Tariff')

const electricityCostMonth = () => items.getItem('EMS_ElectricityCost_Month')
const electricityCostSavingsMonth = () => items.getItem('EMS_ElectricityCostSavings_Month')
const feedInCompensationMonth = () => items.getItem('EMS_FeedInCompensation_Month')

const lights = () => items.getItem('gLights').members

// ---------------------------------------------------------------------------------------------------------------------
// Load Simulation Rule
// ---------------------------------------------------------------------------------------------------------------------
rules.when()
  .system().startLevel(100)
  .or().cron(`*/${STEP_SECONDS} */1 * ? * * *`)
  .then(() => {
    const isDay = time.toZDT().isBetweenTimes(time.toZDT('07:00'), time.toZDT('22:00'))
    const base = isDay && Math.random() < 0.2 ? -2000 : -500
    const random = (150 - Math.random() * 300)
    const lightsPower = lights().filter(m => m.state === 'ON' || m.numericState > 0).length * 25;
    const sum = base + lightsPower + random
    loadPower().postUpdate(Quantity(sum + ' W'))
  })
  .build('Simulation load power consumption', '', ['EMS'])

// ---------------------------------------------------------------------------------------------------------------------
// Battery Simulation Rule
// ---------------------------------------------------------------------------------------------------------------------
rules.when()
  .system().startLevel(100)
  .or().cron(`*/${STEP_SECONDS} * * ? * * *`) // every STEP_SECOND seconds
  .then(() => {
    function roundToUnit (qty, unit, decimals = 0) {
      return Math.round(qty.toUnit(unit).float).toFixed(decimals)
    }

    const solar = solarPower().quantityState ?? Quantity('0 W')
    const load = loadPower().quantityState.multiply('-1') ?? Quantity('0 W')
    let socPercent = batterySoC().numericState ?? 50                    // integer %
    let socEnergy = BATTERY_CAPACITY.multiply(socPercent / 100) // kWh

    console.debug(`Battery Simulation - Current: SoC = ${socPercent} %, Stored Energy = ${socEnergy}`)

    const deltaP = solar.subtract(load) // Quantity (W): solar - load
    let battP = Quantity('0 W')   // +W discharging, -W charging
    let gridP = Quantity('0 W')   // +W import, -W export

    if (deltaP.greaterThan('0 W')) {
      // Surplus -> Charge battery
      console.info(`Battery Simulation - Surplus, deltaP = ${roundToUnit(deltaP, 'W')} W`)
      const potentialCharge = deltaP.multiply(Quantity(STEP_SECONDS + ' s')).toUnit('Wh')
      const availableCap = BATTERY_CAPACITY.subtract(socEnergy)
      const actualCharge = potentialCharge.lessThan(availableCap) ? potentialCharge : availableCap
      console.debug(`Battery Simulation - Charging ${roundToUnit(actualCharge, 'Wh', 3)} Wh -> Battery`)

      if (!actualCharge.equal('0 kWh')) {
        socEnergy = socEnergy.add(actualCharge)
        battP = actualCharge.divide(Quantity(STEP_SECONDS + ' s')).toUnit('W').multiply('-1')
      }
    } else if (deltaP.lessThan('0 W')) {
      // Deficit -> Discharge battery
      console.info(`Battery Simulation - Deficit, deltaP = ${roundToUnit(deltaP, 'W')} W`)
      const needed = deltaP.multiply('-1').multiply(Quantity(STEP_SECONDS + ' s')).toUnit('Wh')
      const actualDischarge = needed.lessThan(socEnergy) ? needed : socEnergy
      console.debug(`Battery Simulation - Discharging ${roundToUnit(actualDischarge, 'Wh', 3)} Wh <- Battery`)

      if (!actualDischarge.equal('0 kWh')) {
        socEnergy = socEnergy.subtract(actualDischarge)
        battP = actualDischarge.divide(Quantity(STEP_SECONDS + ' s')).toUnit('W')
      }
    }

    // Calculate grid power
    gridP = deltaP.multiply('-1').subtract(battP)

    // Convert SoC back to %
    socPercent = socEnergy.divide(BATTERY_CAPACITY).float * 100

    console.debug(`Battery Simulation - New: SoC = ${socPercent} %, Battery Power = ${roundToUnit(battP, 'W')} W, Grid Power = ${roundToUnit(gridP, 'W')} W`)

    // Update Items
    batterySoC().postUpdate(socPercent) // integer %
    batteryPower().postUpdate(battP)    // +W discharging, -W charging
    gridPower().postUpdate(gridP)       // +W import, -W export
  })
  .build('Battery Simulation', '', ['EMS'])

// ---------------------------------------------------------------------------------------------------------------------
// Reset Values Rules
// ---------------------------------------------------------------------------------------------------------------------
rules.when()
  .cron('0 0 * * * ? *')
  .then(() => {
    electricityTariff().postUpdate('0.35 EUR/kWh')
    feedInTariff().postUpdate('0.072 EUR/kWh')
  })
  .build('Reset electricity & feed-in tariffs to defaults', '', ['EMS'])

rules.when()
  .cron(CRON_AFTER_BOD)
  .then(() => {
    const cmd = '0 kWh'
    consumptionDay().postUpdate(cmd)
    selfConsumptionDay().postUpdate(cmd)
    gridConsumptionDay().postUpdate(cmd)
    feedInDay().postUpdate(cmd)
  })
  .build('Reset daily energy values after begin of day', '', ['EMS'])

rules.when()
  .cron(CRON_AFTER_BOM)
  .then(() => {
    const cmd = '0 kWh'
    consumptionMonth().postUpdate(cmd)
    selfConsumptionMonth().postUpdate(cmd)
    gridConsumptionMonth().postUpdate(cmd)
    feedInMonth().postUpdate(cmd)
  })
  .build('Reset monthly energy values after begin of month', '', ['EMS'])

// ---------------------------------------------------------------------------------------------------------------------
// Energy Calculation Rules
// ---------------------------------------------------------------------------------------------------------------------
/**
 * Calculates the daily amount of energy from the power value using the Riemann Sum.
 * @param {() => items.Item} power the Item providing the power value
 * @param {() => items.Item} [plusDay] the Item to send the energy value to, if energy >= 0 kWh
 * @param {() => items.Item} [minusDay] the Item to send the energy value to, if energy < 0 kWh
 */
function createDailyEnergyCalculationRule (power, plusDay, minusDay) {
  let label = 'Calculate '
  if (plusDay) label += plusDay().label
  if (plusDay && minusDay) label += ' and '
  if (minusDay) label += minusDay().label
  rules.when()
    .system().startLevel(100)
    .or().cron('0 */15 * * * ? *')
    .or().cron(CRON_BEFORE_EOD_PERSIST)
    .then(() => {
      const begin = time.toZDT().withHour(0).withMinute(0).withSecond(0)
      const end = time.toZDT()
      // Use RiemannType.MIDPOINT approximation, see https://github.com/openhab/openhab-core/pull/4461#issue-2682710626
      const energy = power().persistence.riemannSumBetween(begin, end, items.RiemannType.MIDPOINT)?.quantityState
      if (!energy) return
      if (energy.greaterThanOrEqual('0 kWh')) {
        if (plusDay) plusDay().postUpdate(energy)
        if (minusDay && minusDay().isUninitialized) minusDay().postUpdate('0 kWh')
      } else if (minusDay) {
        if (plusDay && plusDay().isUninitialized) plusDay().postUpdate('0 kWh')
        minusDay().postUpdate(energy.multiply('-1'))
      }
    }).build(label, '', ['EMS'])
}

/**
 * Calculates the monthly amount of energy by summarizing all persisted daily values of this month and today's value.
 * @param {() => items.Item} daily the Item of the daily energy values
 * @param {() => items.Item} monthly the Item for the monthly energy values
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
      const total = daily().persistence.sumBetween(begin, end, 'influxdb')?.quantityState
      const today = daily().quantityState
      if (!total && today) monthly().postUpdate(today)
      if (total && today) monthly().postUpdate(total.add(today))
    })
    .build(`Calculate ${monthly().label}`, '', ['EMS'])
}

createDailyEnergyCalculationRule(loadPower, undefined, consumptionDay)
createDailyEnergyCalculationRule(gridPower, gridConsumptionDay, feedInDay)

rules.when()
  .system().startLevel(100)
  .or().cron('0 */15 * * * ? *')
  .or().cron(CRON_BEFORE_EOD_PERSIST)
  .then(() => {
    const production = solarProductionDay().quantityState
    const feedIn = feedInDay().quantityState
    const selfConsumption = production.subtract(feedIn)
    selfConsumptionDay().postUpdate(selfConsumption)
  }).build('Calculate Daily Self-Consumption', '', ['EMS'])

createMonthlyEnergyCalculationRule(consumptionDay, consumptionMonth)
createMonthlyEnergyCalculationRule(selfConsumptionDay, selfConsumptionMonth)
createMonthlyEnergyCalculationRule(gridConsumptionDay, gridConsumptionMonth)
createMonthlyEnergyCalculationRule(feedInDay, feedInMonth)

// ---------------------------------------------------------------------------------------------------------------------
// Cost Calculation Rules
// ---------------------------------------------------------------------------------------------------------------------
rules.when()
  .item(gridConsumptionMonth().name).receivedUpdate()
  .then(() => {
    const tariff = electricityTariff().quantityState
    const consumption = gridConsumptionMonth().quantityState
    if (!tariff || !consumption) return
    electricityCostMonth().postUpdate(tariff.multiply(consumption))
  })
  .build('Calculate Monthly Electricty Cost', '', ['EMS'])

rules.when()
  .item(selfConsumptionMonth().name).receivedUpdate()
  .then(() => {
    const supplyTariff = electricityTariff().quantityState
    const fiTariff = feedInTariff().quantityState
    if (!supplyTariff || ! fiTariff) return
    const savingsTariff = supplyTariff.subtract(fiTariff)
    const selfConsumption = selfConsumptionMonth().quantityState
    if (!selfConsumption) return
    electricityCostSavingsMonth().postUpdate(savingsTariff.multiply(selfConsumption))
  })
  .build('Calculate Monthly Electricity Cost Savings', '', ['EMS'])

rules.when()
  .item(feedInMonth().name).receivedUpdate()
  .then(() => {
    const tariff = feedInTariff().quantityState
    const feedIn = feedInMonth().quantityState
    if (!tariff || !feedIn) return
    feedInCompensationMonth().postUpdate(tariff.multiply(feedIn))
  })
  .build('Calculate Monthly Feed-In Compensation', '', ['EMS'])
