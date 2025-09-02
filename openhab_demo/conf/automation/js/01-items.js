const { items } = require('openhab')

// Non-semantic Function Groups ----------------------------------------------------------------------------------------
const lights = items.addItem({
  type: 'Group',
  name: 'gLights',
  label: 'Lights'
})
const shutters = items.addItem({
  type: 'Group',
  name: 'gShutters',
  label: 'Shutters'
})
const windows = items.addItem({
  type: 'Group',
  name: 'gWindows',
  label: 'Windows'
})
const temperatures = items.addItem({
  type: 'Group',
  name: 'gTemperatures',
  label: 'Temperatures'
})
const doors = items.addItem({
  type: 'Group',
  name: 'gDoors',
  label: 'Doors'
})
const locks = items.addItem({
  type: 'Group',
  name: 'gLocks',
  label: 'Locks'
})
const speakers = items.addItem({
  type: 'Group',
  name: 'gSpeakers',
  label: 'Speakers'
})

// Helper functions ----------------------------------------------------------------------------------------------------
/**
 * Gets the base Item name for members of the group.
 * @param {items.Item} group the group
 * @returns {string} the base Item name for Items in that group
 */
function getBaseNameFromGroup (group) {
  return group.name.substring(1)
}

// Item Provider Functions ---------------------------------------------------------------------------------------------
/**
 * Provides HVAC Items.
 * @param {items.Item} room the room to provide for
 * @param {boolean} [withAc=false] whether to include AC Items
 * @returns {items.Item} the HVAC group Item
 */
function provideHvac (room, withAc = false) {
  const hvac = items.addItem({
    type: 'Group',
    name: room.name + '_HVAC',
    label: room.label + ' HVAC',
    category: 'heating',
    groups: [room.name],
    tags: ['HVAC']
  })
  const baseName = getBaseNameFromGroup(hvac)
  items.addItem({
    type: 'Number:Temperature',
    name: baseName + '_Temperature',
    label: 'Current Temperature',
    category: 'temperature',
    groups: [hvac.name, temperatures.name],
    tags: ['Measurement', 'Temperature'],
    metadata: {
      unit: '°C',
      stateDescription: {
        value: '',
        config: {
          pattern: '%.1f %unit%'
        }
      }
    }
  })
  const setpoint = items.addItem({
    type: 'Number:Temperature',
    name: baseName + '_TemperatureSet',
    label: 'Temperature Setpoint',
    category: 'temperature',
    groups: [hvac.name],
    tags: ['Setpoint', 'Temperature'],
    metadata: {
      unit: '°C'
    }
  })
  setpoint.postUpdate('22 °C')
  const heating = items.addItem({
    type: 'Switch',
    name: baseName + '_Heating',
    label: 'Heating',
    category: 'temperature_hot',
    groups: [hvac.name],
    tags: ['Switch', 'Heating']
  })
  heating.postUpdate('OFF')
  if (withAc) {
    const cooling = items.addItem({
      type: 'Switch',
      name: baseName + '_AC',
      label: 'AC',
      category: 'temperature_cold',
      groups: [hvac.name],
      tags: ['Control', 'Power']
    })
    cooling.postUpdate('OFF')
  }
  return hvac
}

/**
 * Provides speaker Items.
 * @param {items.Item} room the room to provide for
 * @param {boolean} [withPlaybackControl=false] whether to include playback control Items, requires mock data from the remote openHAB server
 * @returns {items.Item} the speaker group Item
 */
function provideSpeaker (room, withPlaybackControl = false) {
  const speaker = items.addItem({
    type: 'Group',
    name: room.name + '_Speaker',
    label: room.label + ' Speaker',
    category: 'soundvolume',
    groups: [room.name, speakers.name],
    tags: ['Speaker']
  })
  const baseName = getBaseNameFromGroup(speaker)
  const power = items.addItem({
    type: 'Switch',
    name: baseName + '_Power',
    label: 'Power',
    category: 'switch',
    groups: [speaker.name],
    tags: ['Control', 'Power']
  })
  power.postUpdate('OFF')
  const volume = items.addItem({
    type: 'Number:Dimensionless',
    name: baseName + '_Volume',
    label: 'Volume',
    category: 'soundvolume',
    groups: [speaker.name],
    tags: ['Setpoint', 'SoundVolume'],
    metadata: {
      unit: '%',
    }
  })
  volume.postUpdate('25 %')
  const input = items.addItem({
    type: 'String',
    name: baseName + '_Input',
    label: 'Input',
    category: 'mediacontrol',
    groups: [speaker.name],
    tags: ['Control', 'MediaControl'],
    metadata: {
      stateDescription: {
        value: '',
        config: {
          options: 'FM=Radio,Server=Media Server'
        }
      }
    }
  })
  input.postUpdate('Server')
  if (withPlaybackControl) {
    items.addItem({
      type: 'Player',
      name: baseName + '_Playback',
      label: 'Playback',
      category: 'mediacontrol',
      groups: [speaker.name],
      tags: ['Control', 'MediaControl']
    })
    items.addItem({
      type: 'String',
      name: baseName + '_Artist',
      label: 'Artist',
      category: 'mediacontrol',
      groups: [speaker.name],
      tags: ['Status', 'MediaControl']
    })
    items.addItem({
      type: 'String',
      name: baseName + '_Album',
      label: 'Album',
      category: 'mediacontrol',
      groups: [speaker.name],
      tags: ['Status', 'MediaControl']
    })
    items.addItem({
      type: 'String',
      name: baseName + '_Song',
      label: 'Song',
      category: 'mediacontrol',
      groups: [speaker.name],
      tags: ['Status', 'MediaControl']
    })
    items.addItem({
      type: 'Image',
      name: baseName + '_Cover',
      label: 'Cover',
      category: 'mediacontrol',
      groups: [speaker.name],
      tags: ['Status', 'MediaControl']
    })
  }
  return speaker
}

/**
 * Provides a window Item.
 * @param {items.Item} room the room to provide for
 * @returns {items.Item} the window group Item
 */
function provideWindow (room) {
  const baseName = getBaseNameFromGroup(room)
  const window = items.addItem({
    type: 'Group',
    name: room.name + '_Window',
    label: room.label + ' Window',
    category: 'window',
    groups: [room.name],
    tags: ['Window']
  })
  const contact = items.addItem({
    type: 'Contact',
    name: baseName + '_Window_Contact',
    label: room.label + ' Window',
    category: 'window',
    groups: [window.name, windows.name],
    tags: ['OpenState']
  })
  contact.postUpdate('CLOSED')
  return window
}

/**
 * Provide a door Item with state and lock Items.
 * @param {items.Item} room the room to provide for
 * @param {string} type the type of the door, e.g. `FrontDoor` or `BackDoor`
 * @param {string} label the label for the door
 * @return {items.Item} the door group Item
 */
function provideDoor (room, type, label) {
  const door = items.addItem({
    type: 'Group',
    name: room.name + '_' + type,
    label,
    category: type === 'FrontDoor' ? 'frontdoor' : 'door',
    groups: [room.name],
    tags: [type]
  })
  const contact = items.addItem({
    type: 'Contact',
    name: getBaseNameFromGroup(door) + '_Contact',
    label: door.label,
    category: type === 'FrontDoor' ? 'frontdoor' : 'door',
    groups: [door.name, doors.name],
    tags: ['OpenState']
  })
  contact.postUpdate('CLOSED')
  const lock = items.addItem({
    type: 'Switch',
    name: getBaseNameFromGroup(door) + '_Lock',
    label: door.label + ' Lock',
    category: 'lock',
    groups: [door.name, locks.name],
    tags: ['Lock'],
    metadata: {
      stateDescription: {
        value: '',
        config: {
          options: 'ON=locked,OFF=unlocked'
        }
      }
    }
  })
  lock.postUpdate('ON')
  return door
}

/**
 * Provide a light Item.
 * @param {items.Item} room the room to provide for
 * @param {string} type the type of the light, e.g. `Downlight`, `LightStripe`, `AccentLight` or `Chandelier`
 * @param {string} [name] optional name override
 * @param {string} [label] optional label override
 * @param {string} [itemType=Dimmer] the type of the Item
 * @returns {items.Item} the light Item
 */
function provideLight (room, type, name, label, itemType = 'Dimmer') {
  const baseName = getBaseNameFromGroup(room)
  const light = items.addItem({
    type: itemType,
    name: name ?? baseName + '_Light',
    label: label ?? room.label + ' Light',
    category: itemType === 'Color' ? 'colorwheel' : (itemType === 'Dimmer' ? 'slider' : 'light'),
    groups: [room.name, lights.name],
    tags: [type],
    metadata: {
      stateDescription: {
        value: '',
        config: {
          pattern: '%d %%'
        }
      }
    }
  })
  if (itemType === 'Color') {
    light.postUpdate('14,89.1,90.2')
  } else {
    light.postUpdate('OFF')
  }
  return light
}

/**
 * Provide a shutter Item.
 * @param {items.Item} room the room to provide for
 * @param {string} [name] optional name override
 * @param {string} [label] optional label override
 * @returns {items.Item} the shutter Item
 */
function provideShutter (room, name, label) {
  const shutter = items.addItem({
    type: 'Rollershutter',
    name: getBaseNameFromGroup(room) + '_Shutter',
    label: label ?? room.label + ' Shutter',
    category: 'rollershutter',
    groups: [room.name, shutters.name],
    tags: ['Blinds']
  })
  shutter.postUpdate('0')
  return shutter
}

/**
 * Provides a corridor location Item.
 *
 * <p>A corridor contains a down-light and HVAC Items.
 *
 * @param {items.Item} floor the floor to add the corridor to
 * @param {boolean} [withHvac=true] whether to include HVAC
 * @returns {items.Item} the corridor Item
 */
function provideCorridor (floor, withHvac = true) {
  const corridor = items.addItem({
    type: 'Group',
    name: floor.name + '_Corridor',
    label: floor.label + ' Corridor',
    category: 'corridor',
    groups: [floor.name],
    tags: ['Corridor']
  })
  const baseName = floor.name.substring(1) + '_Corridor'
  provideLight(corridor, 'Downlight', baseName + '_Light', undefined, 'Switch')
  if (withHvac) provideHvac(corridor)
  return corridor
}

// Basement ------------------------------------------------------------------------------------------------------------
const basement = items.addItem({
  type: 'Group',
  name: 'gBasement',
  label: 'Basement',
  category: 'cellar',
  tags: ['Basement']
})
provideCorridor(basement, false)

const laundryRoom = items.addItem({
  type: 'Group',
  name: 'gLaundryRoom',
  label: 'Laundry Room',
  category: 'washingmachine',
  groups: [basement.name],
  tags: ['LaundryRoom']
})
provideLight(laundryRoom, 'Lightbulb', undefined, undefined, 'Switch')

const utilityRoom = items.addItem({
  type: 'Group',
  name: 'gUtilityRoom',
  label: 'Utility Room',
  category: 'softener',
  groups: [basement.name],
  tags: ['Room']
})
provideLight(utilityRoom, 'Lightbulb', undefined, undefined, 'Switch')

const cellar = items.addItem({
  type: 'Group',
  name: 'gCellar',
  label: 'Cellar',
  category: 'cellar',
  groups: [basement.name],
  tags: ['Cellar']
})
provideHvac(cellar)
provideLight(cellar, 'Downlight', undefined, undefined, 'Switch')

// Ground Floor --------------------------------------------------------------------------------------------------------
const groundFloor = items.addItem({
  type: 'Group',
  name: 'gGroundFloor',
  label: 'Ground Floor',
  category: 'groundfloor',
  tags: ['GroundFloor']
})
const gfCorridor = provideCorridor(groundFloor)
provideDoor(gfCorridor, 'FrontDoor', 'Front Door')

const livingRoom = items.addItem({
  type: 'Group',
  name: 'gLivingRoom',
  label: 'Living Room',
  category: 'sofa',
  groups: [groundFloor.name],
  tags: ['LivingRoom']
})
provideHvac(livingRoom, true)
provideSpeaker(livingRoom, true)
provideWindow(livingRoom)
provideShutter(livingRoom)
provideLight(livingRoom, 'LightStripe', 'LivingRoom_CeilingLight', 'Living Room Ceiling Light')
provideLight(livingRoom, 'AccentLight', 'LivingRoom_FloorLamp', 'Living Room Floor Lamp', 'Color')

const kitchen = items.addItem({
  type: 'Group',
  name: 'gKitchen',
  label: 'Kitchen',
  category: 'kitchen',
  groups: [groundFloor.name],
  tags: ['Kitchen']
})
provideHvac(kitchen)
provideSpeaker(kitchen, true)
provideWindow(kitchen)
provideShutter(kitchen)
provideLight(kitchen, 'LightStripe', 'Kitchen_CeilingLight', 'Kitchen Ceiling Light')
provideLight(kitchen, 'LightStripe', 'Kitchen_ShelfLight', 'Kitchen Shelf Light', 'Switch')

const toilet = items.addItem({
  type: 'Group',
  name: 'gToilet',
  label: 'Toilet',
  category: 'toilet',
  groups: [groundFloor.name],
  tags: ['Bathroom']
})
provideHvac(toilet)
provideLight(toilet, 'Downlight', 'Toilet_CeilingLight', 'Toilet Ceiling Light')
provideLight(toilet, 'LightStripe', 'Toilet_MirrorLight', 'Toilet Mirror Light', 'Switch')

// First Floor ---------------------------------------------------------------------------------------------------------
const firstFloor = items.addItem({
  type: 'Group',
  name: 'gFirstFloor',
  label: 'First Floor',
  category: 'firstfloor',
  tags: ['FirstFloor']
})
provideCorridor(firstFloor)

const bedroom = items.addItem({
  type: 'Group',
  name: 'gBedroom',
  label: 'Master Bedroom',
  category: 'bedroom',
  groups: [firstFloor.name],
  tags: ['Bedroom']
})
provideHvac(bedroom, true)
provideWindow(bedroom)
provideShutter(bedroom)
provideLight(bedroom, 'Downlight')

const office = items.addItem({
  type: 'Group',
  name: 'gOffice',
  label: 'Office',
  category: 'office',
  groups: [firstFloor.name],
  tags: ['Office']
})
provideHvac(office, true)
provideSpeaker(office, true)
provideWindow(office)
provideShutter(office)
provideLight(office, 'Downlight', 'Office_CeilingLight', 'Office Ceiling Light')
provideLight(office, 'Chandelier', 'Office_DeskLight', 'Office Desk Light', 'Switch')

const bathroom = items.addItem({
  type: 'Group',
  name: 'gBathroom',
  label: 'Bathroom',
  category: 'bath',
  groups: [firstFloor.name],
  tags: ['Bathroom']
})
provideHvac(bathroom)
provideWindow(bathroom)
provideShutter(bathroom)
provideLight(bathroom, 'Downlight')

const guests = items.addItem({
  type: 'Group',
  name: 'gGuestroom',
  label: 'Guestroom',
  category: 'bedroom_blue',
  groups: [firstFloor.name],
  tags: ['GuestRoom']
})
provideHvac(guests, true)
provideWindow(guests)
provideShutter(guests)
provideLight(guests, 'Downlight')

// Second Floor --------------------------------------------------------------------------------------------------------
const secondFloor = items.addItem({
  type: 'Group',
  name: 'gSecondFloor',
  label: 'Second Floor',
  category: 'attic',
  tags: ['SecondFloor']
})
provideCorridor(secondFloor)

const child1 = items.addItem({
  type: 'Group',
  name: 'gChild1',
  label: 'Oliver\'s Room',
  category: 'boy_3',
  groups: [secondFloor.name],
  tags: ['FamilyRoom']
})
provideHvac(child1, true)
provideWindow(child1)
provideShutter(child1)
provideLight(child1, 'Downlight', 'Child1_CeilingLight', 'Oliver Ceiling Light')
provideLight(child1, 'LightStripe', 'Child1_LightStripe', 'Oliver Light Stripe', 'Color')

const child2 = items.addItem({
  type: 'Group',
  name: 'gChild2',
  label: 'Amelias\'s Room',
  category: 'girl_3',
  groups: [secondFloor.name],
  tags: ['FamilyRoom']
})
provideHvac(child2, true)
provideWindow(child2)
provideShutter(child2)
provideLight(child2, 'Downlight', 'Child2_CeilingLight', 'Amelia Ceiling Light')
provideLight(child2, 'LightStripe', 'Child2_LightStripe', 'Amelia Light Stripe', 'Color')

// Garage --------------------------------------------------------------------------------------------------------------
const garage = items.addItem({
  type: 'Group',
  name: 'gGarage',
  label: 'Garage',
  category: 'garage',
  tags: ['Garage']
})
provideDoor(garage, 'BackDoor', 'Garage Door')
provideLight(garage, 'LightStripe', undefined, undefined, 'Switch')

// Garten --------------------------------------------------------------------------------------------------------------
const garden = items.addItem({
  type: 'Group',
  name: 'gGarden',
  label: 'Garden',
  category: 'garden',
  tags: ['Garden']
})
