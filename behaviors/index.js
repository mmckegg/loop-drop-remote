var behave = require('dom-behavior')

var behaviors = {
  vu: require('./vu')
}

module.exports = function(element){
  return behave(behaviors, element)
}