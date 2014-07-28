var getContext = require('./get-context')

module.exports = function vu(element){

    var currentInstance = null
    var currentValue = null

    function remove(){
      if (currentInstance){
        currentInstance.rms.removeListener('data', onData)
      }
    }

    function refresh(action){
      if (action !== 'remove'){

        var context = getContext(element)
        var id = parseInt(element.dataset.id)
        var remote = context.remoteLookup[id]
        if (remote){
          update()
          if (remote.instance !== currentInstance){
            currentInstance = remote.instance
            if (currentInstance){
              currentInstance.rms.on('data', onData)
            }
          }
        } else {
          remove()
        }
      } else {
        remove()
      }
    }

    function update(){
      if (currentValue){
        element.value = Math.max(-40, getDecibels((currentValue[0] + currentValue[1]) / 2))
      }
      updating = false
    }

    function onData(data){
      currentValue = data
      if (!updating){
        updating = true
        window.requestAnimationFrame(update)
      }
    }

    refresh()
    return refresh
  }

  function getDecibels(value) {
    if (value == null) return 0
    return Math.round(Math.round(20 * (0.43429 * Math.log(value)) * 100) / 100 * 100) / 100
  }