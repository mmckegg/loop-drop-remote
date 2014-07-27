var Through = require('through')
var websocket = require('websocket-stream')

module.exports = function connect(server){
  var socket = websocket(server)
  var connection = Through(function(data){
    socket.write(JSON.stringify(data))
  })
  socket.on('data', function(data){
    var message = JSON.parse(data)
    if (message.from == 'server' && message.clientId){
      connection.clientId = message.clientId
      connection.emit('clientId', connection.clientId)
    }
    connection.queue(message)
  })
  return connection
}