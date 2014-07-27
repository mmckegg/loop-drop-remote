module.exports = function connectLocalInstance(connection, instance){
  function onSlotChange(descriptor){
    connection.write({
      updateSlot: descriptor
    })
  }

  function onLoopChange(descriptor){
    connection.write({
      updateLoop: descriptor
    })
  }

  instances.left.on("change", onSlotChange)
  instances.left.loop.on("change", onLoopChange)

  return function disconnect(){
    instances.left.removeListener("change", onSlotChange)
    instances.left.loop.removeListener("change", onLoopChange)
  }
}