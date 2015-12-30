QuerySubscription = require './query-subscription'
Range = require './range'

class MutableQuerySubscription extends QuerySubscription
  constructor: ->
    @_range = new Range(start: 0, end: 0)
    super
    if @_query.range().limit or @_query.range().offset
      throw new Error("MutableQuerySubscription::Query mut not have an existing limit or offset.")

  range: =>
    @_range

  setRange: (range) =>
    return if @_range.equals(range)
    console.log("Changing range to #{range.start} - #{range.end}")

    if not range.intersects(@_range)
      console.log("Emptying ID and model cache")
      @_modelCache.empty()
      @_ids = null

    @_range = range

    if @_ids
      @_ids.clipToRange(range)
      @_fetchMissingRanges(entireModels: true).then =>
        @_invokeCallbacks()
    else
      @_fetchRange(range, entireModels: true).then =>
        @_invokeCallbacks()

module.exports = MutableQuerySubscription
