var Soundbank = require('soundbank')
var Ditty = require('ditty')
var Playback = require('./playback')

module.exports = function(audioContext){
  var scheduler = audioContext.scheduler
  var instance = Soundbank(audioContext)

  instance.playback = Playback(instance)
  instance.loop = Ditty(scheduler)

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