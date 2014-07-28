var behave = require('dom-behavior')
var getContext = require('./get-context')

var behaviors = {
  vu: require('./vu'),
  mute: function(element){
    element.onclick = muteHandler
  },
  connect: function(element){
    element.onclick = function(){
      var context = getContext(element)
      if (element.dataset.server){
        context.self.connect(element.dataset.server)
      }
    }
  },
  disconnect: function(element){
    element.onclick = function(){
      var context = getContext(element)
      context.self.disconnect()
    }
  },
  connectForm: function(element){
    var serverName = element.querySelector('input.\\.server')
    var connect = element.querySelector('button.\\.connect')

    connect.onclick = function(){
      var context = getContext(element)
      context.self.connect(serverName.value || serverName.placeholder)
    }

  },
  changeNickname: function(element){
    element.onchange = function(){
      var context = getContext(element)
      if (element.value){
        context.self.setNickname(element.value)
      }
    }
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