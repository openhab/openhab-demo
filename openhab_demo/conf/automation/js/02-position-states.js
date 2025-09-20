const { items, rules } = require('openhab')

rules.when()
  .system().startLevel(100)
  .or().cron('*/15 */1 * ? * * *')
  .then(() => {
    for (const itemName of ['Amelia_Position', 'Oliver_Position']) {
        const lat = 52.2 + Math.random() * 0.6
        const lon = 13.06 + Math.random() * 0.6
        const pos = [lat, lon].join(',')
        items.getItem(itemName).postUpdate(pos)
    }
  })
  .build('Simulate position updates')
