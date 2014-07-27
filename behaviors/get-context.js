module.exports = function getContext(element){
  while (element && !element.context){
    element = element.parentNode
  }
  if (element){
    return element.context
  }
}