var View = require('rincewind')
var become = require('become')
var jsonQuery = require('json-query')
var EventEmitter = require('events').EventEmitter
var behave = require('./behaviors')

/// the main view
var render = View(__dirname + '/remotelist.html')

module.exports = function(element, audioContext){
  // var audioContext = Object.create(parentAudioContext)
  var self = audioContext.createGain()
  // audioContext.loadSample = function(src, cb){

  // }
  var updateBehaviors = behave(element)

  var context = {
    audioContext: audioContext,
    get: getValue,
    refresh: refresh,
    data: {
      remote: null
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