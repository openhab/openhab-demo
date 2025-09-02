const { items, rules, time } = require('openhab')

// Give the rules 60 seconds to update all states by triggering 60 seconds before persistence stores the states
const CRON_BEFORE_EOD_PERSIST = '0 58 23 ? * * *';
const CRON_BEFORE_EOM_PERSIST = '0 58 23 L * * *';

const power = items.getItem('Solar_Power_Total')
const energyDay = items.getItem('Solar_Production_Day')
const energyMonth = items.getItem('Solar_Production_Month')

rules.when().item(power.name).changed().or().cron(CRON_BEFORE_EOD_PERSIST).then(() => {
  const begin = time.toZDT().withHour(0).withMinute(0).withSecond(0);
  const end = time.toZDT();
  // Use RiemannType.MIDPOINT approximation, see https://github.com/openhab/openhab-core/pull/4461#issue-2682710626
  const production = power.persistence.riemannSumBetween(begin, end, items.RiemannType.MIDPOINT)?.quantityState;
  if (!production) return;
  energyDay.postUpdate(production);
}).build('Calculate daily solar production', '', ['Solar'])

rules.when().cron('0 0/15 * * * ? *').or().cron(CRON_BEFORE_EOM_PERSIST).then(() => {
  const begin = time.toZDT().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
  const end = time.toZDT();
  // Use RiemannType.MIDPOINT approximation, see https://github.com/openhab/openhab-core/pull/4461#issue-2682710626
  const production = power.persistence.riemannSumBetween(begin, end, items.RiemannType.MIDPOINT)?.quantityState;
  if (!production) return;
  energyMonth.postUpdate(production);
}).build('Calculate monthly solar production', '', ['Solar'])
