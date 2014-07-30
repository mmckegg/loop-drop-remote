module.exports = {
  is: function(input, arg){
    return input == value
  },
  isEmpty: function(input){
    return !input || (Array.isArray(input) && !input.length)
  },
  isNot: function(input, arg){
    return input != value
  }
}