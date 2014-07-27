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

  instance.on("change", onSlotChange)
  instance.loop.on("change", onLoopChange)

  return function disconnect(){
    instance.removeListener("change", onSlotChange)
    instance.loop.removeListener("change", onLoopChange)
  }
}