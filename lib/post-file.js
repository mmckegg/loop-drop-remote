module.exports = function postSample(url, blob, cb){
  var request = new XMLHttpRequest();
  request.open("POST", url, true);

  request.onload = function() {
    cb&&cb(null)
  }

  request.onerror = function(err){
    cb&&cb(err)
  }

  request.send(blob);
}