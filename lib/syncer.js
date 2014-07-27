var EventEmitter = require('events').EventEmitter

module.exports = function(scheduler, connection){
  var self = new EventEmitter()

  var currentOffset = 0

  var syncResults = null

  function getPosition(){
    return scheduler.getCurrentPosition()
  }

  connection.on('data', function(message){
    if (message.to && message.position){ // a reply
      if (syncResults){
        var currentPosition = getPosition()
        var offset = getOffset(syncResults.startAt, currentPosition, message.position) || 0
        addValue(offset)
      }
    } else if (message.requestSync){ // a request
      connection.write({
        to: message.from,
        position: getPosition() + currentOffset
      })
    }
  })

  self.sync = function(){
    connection.write({
      requestSync: true
    })
    syncResults = {
      values: [],
      count: 0,
      startAt: getPosition(),
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