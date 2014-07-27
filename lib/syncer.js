var EventEmitter = require('events').EventEmitter

module.exports = function(scheduler, connection){
  var self = new EventEmitter()

  var currentOffset = 0
  var currentTempo = 120

  var syncResults = null
  var tempoSyncTimeout = null

  scheduler.on('tempo', function(tempo){
    if (tempo !== currentTempo){
      currentTempo = tempo
      connection.write({
        tempo: currentTempo
      })
    }
  })

  connection.on('data', function(message){
    if (message.to && message.position){ // a reply
      if (syncResults){
        var currentPosition = scheduler.getCurrentPosition()
        var offset = getOffset(syncResults.startAt, currentPosition, message.position) || 0
        addValue(offset)
      }
    } else if (message.requestSync){ // a request
      connection.write({
        to: message.from,
        tempo: currentTempo,
        position: scheduler.getCurrentPosition() + currentOffset
      })
    } else 

    if (message.tempo){
      if (message.tempo !== currentTempo){
        clearTimeout(tempoSyncTimeout)

        currentTempo = message.tempo
        scheduler.setTempo(currentTempo)

        tempoSyncTimeout = setTimeout(self.sync, 500)
      }
    }

  })

  self.sync = function(){
    connection.write({
      requestSync: true
    })
    syncResults = {
      values: [],
      count: 0,
      startAt: scheduler.getCurrentPosition(),
      timeout: setTimeout(resolve, 500)
    }
  }

  self.getOffset = function(){
    return currentOffset
  }

  return self

  ///// scope functions

  function addValue(value){
    if (syncResults){
      syncResults.values.push(value)
      if (syncResults.count > 3){
        resolve()
      }
    }
  }

  function resolve(){
    if (syncResults){
      var average = getAverage(syncResults.values)
      clearTimeout(syncResults.timeout)
      syncResults = null
      currentOffset = average
      self.emit('offset', average)
    }
  }

  function getAverage(array){
    var sum = 0
    var count = 0
    for (var i=0;i<array.length;i++){
      if (typeof array[i] == 'number' && isFinite(array[i])){
        sum += array[i]
        count += 1
      }
    }
    if (count){
      return sum / count
    } else {
      return 0
    }
  }
}

function getOffset(start, current, remotePosition){
  var delay = current - start
  var positionAtRemoteTime = current - (delay / 2) + 0.03
  return remotePosition - positionAtRemoteTime
}