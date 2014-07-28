var Remote = require('./')
var element = document.createElement('div')
document.body.appendChild(element)

// require audio context from loop drop
var audioContext = require('../loop-drop-app/audio-context')

var remote = Remote(audioContext, element)
remote.output.connect(audioContext.destination)

window.remote = remote