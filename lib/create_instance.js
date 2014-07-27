var Soundbank = require('soundbank')
var Ditty = require('ditty')
var Playback = require('./playback')
var AudioRMS = require('audio-rms')

module.exports = function(audioContext){
  var scheduler = audioContext.scheduler
  var instance = Soundbank(audioContext)

  instance.playback = Playback(instance)
  instance.loop = Ditty(scheduler)
  instance.rms = AudioRMS(audioContext)
  instance.connect(instance.rms.input)

  var originalDestroy = instance.destroy
  instance.destroy = function(){
    instance.loop.unpipe()
    if (originalDestroy){
      originalDestroy.call(this)
    }
  }

  instance.loop.pipe(instance.playback)
  return instance
}