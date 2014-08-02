var EventEmitter = require('events').EventEmitter

module.exports = function(scheduler, connection){
  var self = new EventEmitter()

  var currentTempo = 120

  var syncStart = null
  var tempoSyncTimeout = null
  var syncId = 0
  var closed = false

  function onTempoChange(tempo){
    if (tempo !== currentTempo){
      currentTempo = tempo
      connection.write({
        tempo: currentTempo
      })
    }
  }

  scheduler.on('tempo', onTempoChange)

  connection.on('data', function(message){

    if (message.tempo){
      if (message.tempo !== currentTempo){
        clearTimeout(tempoSyncTimeout)
        currentTempo = message.tempo
        scheduler.setTempo(currentTempo)
        tempoSyncTimeout = setTimeout(self.sync, 500)
      }
    }

    if (message.to && message.position){ // a reply
      if (message.syncId == syncId && syncStart){
        var now = performance.now()
        var difference = getBeatLength(now - syncStart, currentTempo) / 2
        console.log('resolve sync', syncId, message.position, difference)
        self.emit('sync', message.position + difference, currentTempo)
        scheduler.setPosition(message.position + difference)
        syncStart = null
      }
    } else if (message.requestSync){ // a request
      connection.write({
        to: message.from,
        syncId: message.requestSync,
        tempo: currentTempo,
        position: scheduler.getCurrentPosition()
      })
    } 

  })

  connection.on('end', function(){
    closed = true
    connection.removeAllListeners()
    scheduler.removeListener('tempo', onTempoChange)
  })

  self.sync = function(){
    if (!closed){
      syncId += 1
      connection.write({
        requestSync: syncId,
      })
      syncStart = performance.now()
      console.log('begin sync', syncId, syncStart)
    }
  }

  return self
}

function getBeatLength(ms, tempo){
  return ms / 1000 / (tempo / 60)
}