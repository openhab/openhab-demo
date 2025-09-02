const { actions, items, rules } = require('openhab')
const HttpUtil = Java.type('org.openhab.core.io.net.http.HttpUtil')

const MOCK_DATA = [
  { artist: 'Eminem', album: 'Curtain Call: The Hits', song: 'Mockingbird', coverUrl: '/static/cover/CurtainCall.jpg' },
  { artist: 'Macklemore & Ryan Lewis', album: 'The Heist', song: 'Can\' Hold Us (feat. Ray Dalton)', coverUrl: '/static/cover/TheHeist.png' },
  { artist: 'Alan Walker & ISAK', album: 'Sorry', song: 'Sorry', coverUrl: '/static/cover/Sorry.jpg' },
  { artist: 'Metallica', album: 'Metallica', song: 'Enter Sandman', coverUrl: '/static/cover/Metallica.jpg' },
  { artist: 'Linking Park', album: 'From Zero', song: 'Heavy Is The Crown', coverUrl: '/static/cover/FromZero.jpg' },
  { artist: 'Phil Collins', album: 'Face Value', song: 'In the Air Tonight', coverUrl: '/static/cover/ForceValue.webp' }
]

function mockSpeakerPlayback (prefix, initialIndex = 0) {
  const powerItem = items.getItem(prefix + '_Power')
  const playbackItem = items.getItem(prefix + '_Playback')
  const artistItem = items.getItem(prefix + '_Artist')
  const albumItem = items.getItem(prefix + '_Album')
  const songItem = items.getItem(prefix + '_Song')
  const coverItem = items.getItem(prefix + '_Cover')

  let i = initialIndex
  let interval = null

  function updateItems (index) {
    index = index % MOCK_DATA.length
    artistItem.postUpdate(MOCK_DATA[index].artist)
    albumItem.postUpdate(MOCK_DATA[index].album)
    songItem.postUpdate(MOCK_DATA[index].song)
    const raw = HttpUtil.downloadImage('http://localhost:8080' + MOCK_DATA[index].coverUrl)
    if (raw != null) actions.BusEvent.postUpdate(coverItem.rawItem, raw)
  }

  function createUpdateItemsInterval () {
    return setInterval(() => {
      i++
      updateItems(i)
    }, 1 * 60 * 1000)
  }

  // Initialize
  powerItem.postUpdate('ON')
  playbackItem.postUpdate('PLAY')
  updateItems(i)

  // Handle playback PLAY and power ON commands
  rules.when()
    .item(powerItem.name).receivedCommand()
    .or().item(playbackItem.name).receivedCommand()
    .then((event) => {
      const power = (event.itemName === powerItem.name) ? event.receivedCommand : powerItem.state
      const playback = (event.itemName === playbackItem.name) ? event.receivedCommand : playbackItem.state
      if (power === 'OFF' || playback === 'PAUSE') {
        if (interval !== null) {
          clearInterval(interval)
          interval = null
        }
      } else { // power is ON
        switch (playback) {
          case 'PLAY':
            interval = createUpdateItemsInterval()
            break
          case 'NEXT':
            i++
            updateItems(i)
            break
          case 'PREVIOUS':
            i--
            if (i < 0) i = MOCK_DATA.length - 1
            updateItems(i)
            break
        }
      }
    }).build(`Mock playback for ${prefix}`)

  // Automatically switch song regularly
  interval = createUpdateItemsInterval()
}

mockSpeakerPlayback('LivingRoom_Speaker')
mockSpeakerPlayback('Kitchen_Speaker', 1)
mockSpeakerPlayback('Office_Speaker', 2)
