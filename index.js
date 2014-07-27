var View = require('rincewind')
var become = require('become')
var jsonQuery = require('json-query')
var EventEmitter = require('events').EventEmitter
var behave = require('./behaviors')
var createInstance = require('./lib/create_instance')
var connectLocalInstance = require('./lib/connect_local_instance')
var connect = require('./lib/connect')
var Syncer = require('./lib/syncer')

var IAC = require('inheritable-audio-context')

/// the main view
var render = View(__dirname + '/remotelist.html')

module.exports = function(parentAudioContext, element){

  var audioContext = IAC(parentAudioContext, true)
  var self = new EventEmitter()
  self.output = audioContext.createGain()

  var releaseLocalInstance = null

  //audioContext.loadSample = function(src, cb){
//
  //}

  function broadcastLocalInstance(to){
    context.connection.write({
      nickname: context.data.nickname,
      to: to
    })
    if (context.localInstance && context.connection){
      context.localInstance.getDescriptors().forEach(function(descriptor){
        context.connection.write({
          updateSlot: descriptor, 
          to: to
        })
      })
      context.connection.write({
        updateLoop: context.localInstance.loop.getPlayback(),
        to: to
      })
    }
  }

  function remoteDisconnect(id){
    var shouldRefresh = false
    var remote = context.remoteLookup[id] 
    if (remote){
      context.remoteLookup[id] = null
      if (remote.instance){
        remote.instance.disconnect()
        remote.instance.destroy()
      }
      var index = context.data.remotes.indexOf(remote)
      if (~index){
        context.data.remotes.splice(index, 1)
        shouldRefresh = true
      }
    }
    return shouldRefresh
  }

  function updateRemote(id, message){
    // add new clients
    var shouldRefresh = false
    var shouldBroadcastLocal = false

    var remote = context.remoteLookup[message.from] 
    if (!remote){
      remote = context.remoteLookup[message.from] = {id: message.from, isPlayer: false}
      context.data.remotes.push(remote)
      shouldBroadcastLocal = true
    }

    // update nickname
    if (message.nickname && message.nickname !== remote.nickname){
      remote.nickname = message.nickname
      shouldRefresh = true
    }

    // update playback
    if (message.updateSlot || message.updateLoop){
      if (!remote.instance){
        remote.instance = createInstance(audioContext, context.data.syncOffset)
        remote.instance.connect(self.output)
        remote.isPlayer = true
        shouldRefresh = true
      }

      if (message.updateSlot){
        remote.instance.update(message.updateSlot)
      }

      if (message.updateLoop){
        remote.instance.loop.setPlayback(message.updateLoop.notes, message.updateLoop.length)
      }
    }

    if (shouldBroadcastLocal){
      // this is a new connection, send our local instance to them
      broadcastLocalInstance(message.from)
    }

    return shouldRefresh
  }

  function updateOffset(offset, tempo){
    context.data.syncOffset = offset
    if (context.localInstance){
      context.localInstance.setOffset(offset)
    }
    context.data.remotes.forEach(function(remote){
      if (remote.instance){
        remote.instance.setOffset(offset)
      }
    })
    console.log('sync offset', offset)
  }

  self.connect = function(server, localInstance, nickname){

    if (context.connection){
      self.disconnect()
    }

    context.connection = connect(server)
    context.data.server = server

    // send our local messages to server
    context.localInstance = localInstance
    context.data.nickname = nickname

    // sync with other users
    context.syncer = Syncer(audioContext.scheduler, context.connection)
    context.syncer.on('offset', updateOffset)
    context.syncer.sync()

    // resync after the server noise has died down
    setTimeout(function(){
      context.syncer.sync()
    }, 3000)

    if (context.localInstance){
      releaseLocalInstance = connectLocalInstance(context.connection, localInstance)
    }

    broadcastLocalInstance()
    refresh()

    context.connection.on('data', function(message){
      var shouldRefresh = false
      if (message.from == 'server'){
        if (message.clientId){
          context.data.clientId = message.clientId
          if (!context.data.nickname){
            context.data.nickname = 'remote' + message.clientId
          }
          shouldRefresh = true
        }
        if (message.clientDisconnect){
          if (remoteDisconnect(message.clientDisconnect)){
            shouldRefresh = true
          }
        }
      } else if (typeof message.from == 'number') { // message from remote
        if (updateRemote(message.from, message)){
          shouldRefresh = true
        }
      }
      if (shouldRefresh){
        refresh()
      }
    })
  }

  self.disconnect = function(){
    context.connection.close()

    context.data.remotes.forEach(function(remote){
      if (remote.instance){
        remote.instance.destroy()
      }
    })
    
    if (releaseLocalInstance){
      releaseLocalInstance()
      releaseLocalInstance = null
    }

    context.data.remotes = []
    context.remoteLookup = {}
    context.connection = null
    context.clientId = null
    refresh()
  }

  var updateBehaviors = behave(element)

  var context = {
    audioContext: audioContext,
    connection: null,
    get: getValue,
    syncer: null,
    refresh: refresh,
    remoteLookup: {},
    data: {
      syncOffset: 0,
      clientId: null,
      remotes: []
    },
    source: null
  }

  element.context = context

  function getValue(query, source){
    if (source != null){
      var context = Object.create(this)
      context.parentContext = this
      context.source = source
      return jsonQuery(query, context).value
    } else {
      return jsonQuery(query, this).value
    }
  }

  function refresh(){
    var newContent = render(context)
    become(element, newContent, {inner: true, onChange: updateBehaviors, tolerance: 0})
  }

  refresh()
  
  return self
}

function obtain(obj){
  return JSON.parse(JSON.stringify(obj))
}