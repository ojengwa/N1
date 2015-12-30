QuerySubscription = require './query-subscription'

class MutableQuerySubscription extends QuerySubscription
  constructor: ->
    super

  replaceQuery: (nextQuery) ->
    return if @_query.sql() is nextQuery.sql()

    rangeIsOnlyChange = @_query.clone().offset(0).limit(0).sql() is nextQuery.clone().offset(0).limit(0).sql()
    rangeIntersects = @_query.range().intersects(nextQuery.range())

    nextQuery.finalize()
    @_query = nextQuery

    if @_set and rangeIsOnlyChange and rangeIntersects
      @_set.clipToRange(@_query.range())
      @_fetchMissingRanges(entireModels: true).then =>
        @_invokeCallbacks()

    else
      @_set = null
      @_fetchRange(@_query.range(), entireModels: true).then =>
        @_invokeCallbacks()

  addCallback: (callback) =>
    super

    if @_callbacks.length > 1
      throw new Error("""MutableQuerySubscription:addCallback - A second callback
        was added to a mutable subscription. Mutable subscriptions cannot be shared
        because they are not guarunteed to remain the same.""")

module.exports = MutableQuerySubscription
