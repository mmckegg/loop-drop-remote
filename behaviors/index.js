var behave = require('dom-behavior')
var getContext = require('./get-context')

var behaviors = {
  vu: require('./vu'),
  mute: function(element){
    element.onclick = muteHandler
  }
}

module.exports = function(element){
  return behave(behaviors, element)
}

function muteHandler(e){
  var context = getContext(this)
  var remote = context.remoteLookup[this.dataset.id]
  if (remote && remote.instance){
    var instance = remote.instance
    if (instance.gain.value){
      instance.gain.value = 0
      this.classList.add('-active')
    } else {
      instance.gain.value = 1
      this.classList.remove('-active')
    }
  }
}