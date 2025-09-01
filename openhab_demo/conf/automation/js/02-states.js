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

rules.when()
  .system().startLevel(100)
  .or().cron('0 0/5 * ? * * *')
  .then(() => {
    items.getItem('gTemperatures').members.forEach(temperature => {
      const value = 20 + Math.random() * 4.5
      temperature.postUpdate(value + ' °C')
    })
  })
  .build('Set random temperature states')
