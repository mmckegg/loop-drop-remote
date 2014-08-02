var View = require('rincewind')
var become = require('become')
var jsonQuery = require('json-query')
var EventEmitter = require('events').EventEmitter
var behave = require('./behaviors')
var createInstance = require('./lib/create_instance')
var connectLocalInstance = require('./lib/connect_local_instance')
var connect = require('./lib/connect')
var Syncer = require('./lib/syncer')
var loadSample = require('./lib/load-sample')
var postFile = require('./lib/post-file')

var IAC = require('inheritable-audio-context')

/// the main view
var render = View(__dirname + '/remotelist.html')

module.exports = function(parentAudioContext, element){

  var audioContext = IAC(parentAudioContext, true)
  var self = new EventEmitter()
  self.output = audioContext.createGain()

  var releaseLocalInstance = null
  audioContext.loadSample = loadSample

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

      context.localInstance.loop.getDescriptors().forEach(function(descriptor){
        context.connection.write({
          updateLoop: descriptor,
          to: to
        })
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

  function handleSampleRequest(src){
    if (audioContext.getSampleBlob){
      var url = context.data.sampleRoot + context.data.clientId + '/' + src
      audioContext.getSampleBlob(src, function(err, blob){
        if (blob){
          postFile(url, blob)
          console.log('UPLOADING SAMPLE', src)
        }
      })
    }
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
        var sampleRoot = context.data.sampleRoot + remote.id + '/'
        var scopedAudioContext = getScopedContext(audioContext, sampleRoot)
        remote.instance = createInstance(scopedAudioContext, context.data.syncOffset)
        remote.instance.connect(self.output)
        remote.isPlayer = true
        shouldRefresh = true
      }

      if (message.updateSlot){
        remote.instance.update(message.updateSlot)
      }

      if (message.updateLoop){
        remote.instance.loop.update(message.updateLoop)
      }
    }

    if (shouldBroadcastLocal){
      // this is a new connection, send our local instance to them
      broadcastLocalInstance(message.from)
    }

    return shouldRefresh
  }

  self.setLocalInstance = function(instance){
    context.localInstance = instance
    if (context.connection){
      if (releaseLocalInstance){
        releaseLocalInstance()
      }
      releaseLocalInstance = connectLocalInstance(context.connection, context.localInstance)
      broadcastLocalInstance()
    }
  }

  self.setNickname = function(nickname){
    context.data.nickname = nickname
    if (context.connection){
      context.connection.write({
        nickname: context.data.nickname
      })
    }
    self.emit('nickname', nickname)
    refresh()
  }

  self.connect = function(server, nickname){

    self.emit('connnecting', server)

    context.data.state = 'connecting'


    if (context.connection){
      self.disconnect()
    }

    var server = server.replace(/^.+\:\/\//, '')

    context.connection = connect('ws://' + server)
    context.connection.on('error', function(err){
      self.disconnect()
    })

    context.data.server = server
    context.data.sampleRoot = 'http://' + server + '/files/'

    // send our local messages to server
    if (nickname){
      context.data.nickname = nickname
    }

    // sync with other users
    context.syncer = Syncer(audioContext.scheduler, context.connection)
    context.syncer.sync()

    // resync after the server noise has died down
    setTimeout(function(){
      context.syncer&&context.syncer.sync()
    }, 3000)

    if (context.localInstance){
      releaseLocalInstance = connectLocalInstance(context.connection, context.localInstance)
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
          self.emit('connected', server, message.clientId)
          context.data.state = 'connected'
          shouldRefresh = true
        }
        if (message.clientDisconnect){
          if (remoteDisconnect(message.clientDisconnect)){
            shouldRefresh = true
          }
        }
        if (message.requestFile){
          handleSampleRequest(message.requestFile)
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
    if (context.connection){
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
      context.data.clientId = null

      context.syncer = null

      context.data.state = 'disconnected'
      self.emit('disconnect')
      refresh()
      return true
    } else {
      return false
    }
  }

  var updateBehaviors = behave(element)

  var context = {
    audioContext: audioContext,
    connection: null,
    get: getValue,
    syncer: null,
    refresh: refresh,
    self: self,
    remoteLookup: {},
    globals: require('./providers'),
    data: {
      state: 'disconnected',
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

function getScopedContext(parent, rootUrl){
  var context = Object.create(parent)
  context.sampleCache = {}
  context.sampleRoot = rootUrl
  return context
}