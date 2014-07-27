var Soundbank = require('soundbank')
var Ditty = require('ditty')
var Playback = require('./playback')
var AudioRMS = require('audio-rms')

module.exports = function(audioContext, offset){
  var scheduler = audioContext.scheduler
  var instance = Soundbank(audioContext)

  instance.playback = Playback(instance)
  instance.loop = Ditty(scheduler)
  instance.rms = AudioRMS(audioContext)
  instance.connect(instance.rms.input)

  if (offset){
    instance.loop.setOffset(offset)
  }

  var originalDestroy = instance.destroy
  instance.destroy = function(){
    instance.loop.removeAllListeners()
    if (originalDestroy){
      originalDestroy.call(this)
    }
  }

  // proxy loop offset
  instance.setOffset = instance.loop.setOffset.bind(instance.loop)
  instance.getOffset = instance.loop.getOffset.bind(instance.loop)

  instance.loop.pipe(instance.playback)
  return instance
}