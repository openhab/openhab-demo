const { items, rules } = require('openhab')

rules.when()
  .system().startLevel(100)
  .or().cron('0 0/5 * ? * * *')
  .then(() => {
    items.getItem('gWindows').members.forEach(window => {
      const random = Math.random() < 0.5
      window.postUpdate(random ? 'OPEN' : 'CLOSED')
    })
  })
  .build('Set random window states')

/**
 * Get the seasonal base temperatur for the fake temperature measurements.
 *
 * <p>The seasonal base temperature peaks at 22 °C in July and linearly decreases till December/January to 19 °C.
 *
 * @param {Date} date
 * @returns {number} the seasonal base temperature
 */
function getSeasonalBaseTemperature (date = new Date()) {
  // Month index: 0 = Jan, ..., 11 = Dec
  const m = date.getMonth();

  // Min, Max temperatures
  const min = 19;
  const max = 22;

  // Distances to July (6)
  let distance = Math.abs(m - 6);

  // Wrap around the year (e.g. Dec/Jan are 6 months away from July)
  if (distance > 6) {
    distance = 12 - distance;
  }

  // distance = 0 at July, distance = 6 at Dec/Jan
  // Map linearly: 0 → max, 6 → min
  return max - (distance / 6) * (max - min);
}

rules.when()
  .system().startLevel(100)
  .or().cron('0 0/5 * ? * * *')
  .then(() => {
    const baseTemperature = getSeasonalBaseTemperature()
    items.getItem('gTemperatures').members.forEach(temperature => {
      const value = baseTemperature + (1.5 - Math.random() * 3)
      temperature.postUpdate(value + ' °C')
    })
  })
  .build('Set random temperature states')
