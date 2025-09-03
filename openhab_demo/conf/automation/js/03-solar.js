const { items, rules, time } = require('openhab')

// ---------------------------------------------------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------------------------------------------------

// Give the rules 55 seconds to update all states by triggering 55 seconds before persistence stores the states
const CRON_BEFORE_EOD_PERSIST = '0 59 23 ? * * *'
const CRON_BEFORE_EOM_PERSIST = '0 59 23 L * * *'

// ---------------------------------------------------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------------------------------------------------
const power = items.getItem('Solar_Power_Total')
const energyDay = items.getItem('Solar_Production_Day')
const energyMonth = items.getItem('Solar_Production_Month')

// ---------------------------------------------------------------------------------------------------------------------
// Production Calculation Rules
// ---------------------------------------------------------------------------------------------------------------------
rules.when()
  .system().startLevel(100)
  .or().item(power.name).changed()
  .or().cron(CRON_BEFORE_EOD_PERSIST)
  .then(() => {
    const begin = time.toZDT().withHour(0).withMinute(0).withSecond(0)
    const end = time.toZDT()
    // Use RiemannType.MIDPOINT approximation, see https://github.com/openhab/openhab-core/pull/4461#issue-2682710626
    const production = power.persistence.riemannSumBetween(begin, end, items.RiemannType.MIDPOINT)?.quantityState
    if (!production) return
    energyDay.postUpdate(production)
  })
  .build('Calculate daily solar production', '', ['Solar'])

rules.when()
  .system().startLevel(100)
  .or().cron('0 */15 * * * ? *')
  .or().cron(CRON_BEFORE_EOM_PERSIST)
  .then(() => {
    const begin = time.toZDT().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0)
    const end = time.toZDT()
    // Use RiemannType.MIDPOINT approximation, see https://github.com/openhab/openhab-core/pull/4461#issue-2682710626
    const total = energyDay.persistence.sumBetween(begin, end, 'influxdb')?.quantityState
    const today = energyDay.quantityState
    if (!total && today) energyMonth.postUpdate(today)
    if (total && today) energyMonth.postUpdate(total.add(today))
  })
  .build('Calculate monthly solar production', '', ['Solar'])
