module.exports = function(input){
  return !input || (Array.isArray(input) && !input.length)
}