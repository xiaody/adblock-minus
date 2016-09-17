// not sure what to export...
module.exports = Object.assign(
  {
    Matcher: require('./lib/Matcher')
  },
  require('./lib/FilterClasses'),
  require('./lib/utils')
)
