module.exports = loadSample

function loadSample(src, cb){
  var audioContext = this
  var sampleCache = audioContext.sampleCache
  var current = sampleCache[src]

  var url = (audioContext.sampleRoot || '') + src

  if (!current){
    current = sampleCache[src] = []
    requestSample(audioContext, url, function(err, buffer){
      sampleCache[src] = buffer
      current.forEach(function(callback){
        callback(buffer)
      })
    })
  }

  if (cb){
    if (Array.isArray(current)){
      current.push(cb)
    } else {
      cb(current)
    }
  }
}

function requestSample(audioContext, url, cb){
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  request.onload = function() {
    // Decode asynchronously
    audioContext.decodeAudioData(
      request.response,
      function(buffer) {
        cb&&cb(null, buffer)
      }, function(err){
        cb&&cb(err)
      } 
    );
  }

  request.onerror = function(err){
    cb&&cb(err)
  }

  request.send();
}