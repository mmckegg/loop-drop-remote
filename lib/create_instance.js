var Soundbank = require('soundbank')
var Ditty = require('ditty')
var Playback = require('./playback')
var AudioRMS = require('audio-rms')

module.exports = function(audioContext, offset){

  var scheduler = audioContext.scheduler
  var instance = Soundbank(audioContext)

  instance.playback = Playback(instance)
  instance.loop = Ditty()
  instance.rms = AudioRMS(audioContext)
  instance.connect(instance.rms.input)

  if (offset){
    instance.loop.setOffset(offset)
  }

  var originalDestroy = instance.destroy
  instance.destroy = function(){
    instance.loop.removeAllListeners()
    audioContext.sampleCache = null
    if (originalDestroy){
      originalDestroy.call(this)
    }
  }

  scheduler
    .pipe(instance.loop)
    .pipe(instance.playback)

  return instance
}