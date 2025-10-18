const { items, rules } = require('openhab')

const PIN_CODE = 1234;

const presenceItem = items.addItem({
  type: 'Switch',
  name: 'Presence',
  label: 'Presence',
  category: 'presence',
  tags: ['Status', 'Presence']
})

rules.JSRule({
  name: 'Disarm alarm system by PIN',
  execute: (event) => {
    const code = event.raw?.code
    if (code === PIN_CODE) presenceItem.postUpdate('ON')
  },
  id: 'disarm-alarmsystem-by-pin'
})
