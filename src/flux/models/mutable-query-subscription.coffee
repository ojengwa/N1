QuerySubscription = require './query-subscription'

class MutableQuerySubscription extends QuerySubscription
  constructor: ->
    super

  replaceQuery: (nextQuery) ->
    return if @_query.sql() is nextQuery.sql()

    rangeIsOnlyChange = @_query.clone().offset(0).limit(0).sql() is nextQuery.clone().offset(0).limit(0).sql()

    nextQuery.finalize()
    @_query = nextQuery

    unless @_set and rangeIsOnlyChange
      @_set = null

    @update()
    
module.exports = MutableQuerySubscription
