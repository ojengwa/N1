_ = require 'underscore'
PromiseQueue = require 'promise-queue'
DatabaseStore = require '../stores/database-store'
DatabaseChangeRecord = require '../stores/database-change-record'
LRUCache = require '../../lru-cache'
QueryRange = require './query-range'
MutableQueryResultSet = require './mutable-query-result-set'
ModelQuery = require './query'

class QuerySubscription
  constructor: (@_query, @_options = {}) ->

    if not @_query or not (@_query instanceof ModelQuery)
      throw new Error("QuerySubscription: Must be constructed with a ModelQuery. Got #{@_query}")

    if @_query._count
      throw new Error("QuerySubscriptionPool::add - You cannot listen to count queries.")

    @_query.finalize()

    @_set = null
    @_lastResult = null

    @_version = 0
    @_callbacks = []
    @_modelCache = new LRUCache(100)

    @_fetchRange(@_query.range(), entireModels: true).then(@_fillMissingAndInvoke)

  query: =>
    @_query

  addCallback: (callback) =>
    unless callback instanceof Function
      throw new Error("QuerySubscription:addCallback - expects a function, received #{callback}")
    @_callbacks.push(callback)

    if @_lastResult
      _.defer =>
        return unless @_lastResult
        callback(@_lastResult)

  hasCallback: (callback) =>
    @_callbacks.indexOf(callback) isnt -1

  removeCallback: (callback) =>
    unless callback instanceof Function
      throw new Error("QuerySubscription:removeCallback - expects a function, received #{callback}")
    @_callbacks = _.without(@_callbacks, callback)

  callbackCount: =>
    @_callbacks.length

  applyChangeRecord: (record) =>
    return unless record.objectClass is @_query.objectClass()
    return unless record.objects.length > 0

    if not @_set
      @_fetchRange(@_query.range(), entireModels: true)
      return

    mustCancelRunningQueries = false
    mustRefetchAllIds = false

    if record.type is 'unpersist'
      for item in record.objects
        @_modelCache.remove(item.id)
        offset = @_set.offsetOfId(item.id)
        if offset isnt -1
          @_set.removeAtOffset(offset)
          mustCancelRunningQueries = true

    else if record.type is 'persist'
      for item in record.objects
        offset = @_set.offsetOfId(item.id)
        itemIsInSet = offset isnt -1
        itemShouldBeInSet = item.matches(@_query.matchers())

        if itemIsInSet and not itemShouldBeInSet
          @_modelCache.remove(item.id)
          @_set.removeAtOffset(offset)
          mustCancelRunningQueries = true

        else if itemShouldBeInSet and not itemIsInSet
          @_modelCache.put(item.id, item)
          mustRefetchAllIds = true
          mustCancelRunningQueries = true

        else if itemIsInSet
          oldItem = @_modelCache.get(item.id)
          @_modelCache.put(item.id, item)
          mustCancelRunningQueries = true
          mustRefetchAllIds = true if @_itemSortOrderHasChanged(oldItem, item)

    if mustCancelRunningQueries
        @_version += 1

    if mustRefetchAllIds
      refetchPromise = @_fetchRange(@_query.range())
    else
      refetchPromise = @_fetchMissingRanges()

    refetchPromise.then(@_fillMissingAndInvoke)

  _itemSortOrderHasChanged: (old, updated) ->
    for descriptor in @_query.orderSortDescriptors()
      oldSortValue = old[descriptor.attr.modelKey]
      updatedSortValue = updated[descriptor.attr.modelKey]

      # http://stackoverflow.com/questions/4587060/determining-date-equality-in-javascript
      if not (oldSortValue >= updatedSortValue && oldSortValue <= updatedSortValue)
        return true

    return false

  _fetchRange: (range, {entireModels} = {}) =>
    version = @_version
    rangeQuery = undefined

    unless range.isInfinite()
      rangeQuery ?= @_query.clone()
      rangeQuery.offset(range.offset).limit(range.limit)

    unless entireModels
      rangeQuery ?= @_query.clone()
      rangeQuery.idsOnly()

    rangeQuery ?= @_query

    # console.log("Fetching #{range.start} - #{range.end}")
    DatabaseStore.run(rangeQuery, {format: false}).then (results) =>
      return console.log("Cancelled") unless version is @_version

      ids = if entireModels then _.pluck(results, 'id') else results

      @_set = null unless @_set?.range().intersects(range)
      @_set ?= new MutableQueryResultSet()
      @_set.addIdsInRange(ids, range)
      @_set.clipToRange(@_query.range())

      @_modelCache.limit = Math.max(@_modelCache.limit, @_set.count() + 20)
      if entireModels
        @_modelCache.put(model.id, model) for model in results

  _fetchMissingRanges: =>
    desiredRange = @_query.range()
    currentRange = @_set?.range()

    if currentRange and not currentRange.isInfinite() and not desiredRange.isInfinite()
      ranges = desiredRange.rangesBySubtracting(currentRange)
    else
      ranges = [desiredRange]

    Promise.each ranges, (range) =>
      @_fetchRange(range, {entireModels: true})

  _fillMissingAndInvoke: =>
    set = @_set.clone()
    ids = set.ids().filter (id) => not @_modelCache.get(id)

    if ids.length is 0
      query = Promise.resolve([])
    else
      DatabaseStore = require '../stores/database-store'
      query = DatabaseStore.findAll(@_query._klass, {id: ids})

    query.then (models) =>
      @_modelCache.put(m.id, m) for m in models

      set.attachModelsFrom(@_modelCache.toHash())
      if @_options.asResultSet
        @_lastResult = set.immutableClone()
      else
        @_lastResult = @_query.formatResultObjects(set.models())

      @_callbacks.forEach (callback) =>
        callback(@_lastResult)

module.exports = QuerySubscription
