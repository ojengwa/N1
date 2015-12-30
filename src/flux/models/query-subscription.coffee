_ = require 'underscore'
PromiseQueue = require 'promise-queue'
DatabaseChangeRecord = require '../stores/database-change-record'
LRUCache = require '../../lru-cache'

QueryRange = require './query-range'
QueryRangedResultSet = require './query-ranged-result-set'

class QuerySubscription
  constructor: (@_query, @_options) ->
    ModelQuery = require './query'

    if not @_query or not (@_query instanceof ModelQuery)
      throw new Error("QuerySubscription: Must be constructed with a ModelQuery. Got #{@_query}")

    if @_query._count
      throw new Error("QuerySubscriptionPool::add - You cannot listen to count queries.")

    @_query.finalize()

    @_ids = null
    @_version = 0
    @_callbacks = []

    @_fetchQueue ?= new PromiseQueue(1, Infinity)
    @_fetchRange(@range(), entireModels: true).then =>
      @_invokeCallbacks()

  query: =>
    @_query

  range: =>
    {limit, offset} = @_query.range()
    start = offset ? 0
    end = start + (limit ? 10000)
    new Range({start, end})

  addCallback: (callback) =>
    unless callback instanceof Function
      throw new Error("QuerySubscription:addCallback - expects a function, received #{callback}")
    @_callbacks.push(callback)

    # If we already have data, send it to our new observer. Users always expect
    # callbacks to be fired asynchronously, so wait a tick.
    if @_ids
      _.defer => @_invokeCallback(callback)

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

    if not @_ids
      @_fetchRange(@range())
      return

    mustRefetchAllIds = false

    if record.type is 'unpersist'
      for item in record.objects
        @_modelCache.remove(item.id)
        idx = @_ids.indexOfValue(item.id)
        if idx isnt -1
          @_ids.removeValueAtIndex(idx)

    else if record.type is 'persist'
      for item in record.objects
        idx = @_ids.indexOfValue(item.id)
        itemIsInSet = idx isnt -1
        itemShouldBeInSet = item.matches(@_query.matchers())

        if itemIsInSet and not itemShouldBeInSet
          @_modelCache.remove(item.id)
          @_ids.removeValueAtIndex(idx)

        else if itemShouldBeInSet and not itemIsInSet
          @_modelCache.put(item.id, item)
          mustRefetchAllIds = true

        else if itemIsInSet
          oldItem = @_modelCache.get(item.id)
          @_modelCache.put(item.id, item)

          if @_itemSortOrderHasChanged(oldItem, item)
            mustRefetchAllIds = true
            @_version += 1

    if mustRefetchAllIds
      refetchPromise = @_fetchRange(@range())
    else
      refetchPromise = @_fetchMissingRanges({entireModels: true})

    refetchPromise.then =>
      @_fetchMissingModels().then =>
        @_invokeCallbacks()

  _itemSortOrderHasChanged: (old, updated) ->
    for descriptor in @_query.orderSortDescriptors()
      oldSortValue = old[descriptor.attr.modelKey]
      updatedSortValue = updated[descriptor.attr.modelKey]

      # http://stackoverflow.com/questions/4587060/determining-date-equality-in-javascript
      if not (oldSortValue >= updatedSortValue && oldSortValue <= updatedSortValue)
        return true

    return false

  _result: =>
    set = @_ids.values().map (id) => @_modelCache.get(id)
    [@_query.formatResultObjects(set), @_ids.range()]

  _invokeCallbacks: =>
    result = @_result()
    return unless result
    @_callbacks.forEach (callback) =>
      callback.apply(@, result)

  _invokeCallback: (callback) =>
    result = @_result()
    return unless result
    callback.apply(@, result)

  _fetchRange: (range, {entireModels} = {}) =>
    DatabaseStore = require '../stores/database-store'

    version = @_version += 1
    cancelled = => version isnt @_version

    @_fetchQueue.add =>
      return if cancelled()
      query = @_query.clone().offset(range.start).limit(range.end - range.start)
      query.idsOnly() unless entireModels

      DatabaseStore.run(query, {format: false}).then (results) =>
        return if cancelled()

        if entireModels
          @_modelCache.put(m.id, m) for m in results
          rangeIds = _.pluck(results, 'id')
        else
          rangeIds = results

        if not @_ids
          @_ids = new RangedArray(range, rangeIds)
        else
          @_ids.addValuesInRange(range, rangeIds)

  _fetchMissingRanges: (options) =>
    missingRanges = @range().rangesBySubtracting(@_ids.range())
    Promise.each missingRanges, (range) =>
      @_fetchRange(range, options)

  _fetchMissingModels: ->
    ids = @_ids.values().filter (id) => @_modelCache.get(id) is null
    return Promise.resolve() if ids.length is 0

    console.log("Fetching Models #{JSON.stringify(ids)}")

    DatabaseStore = require '../stores/database-store'
    DatabaseStore.findAll(@_query._klass, {id: ids}).then (models) =>
      @_modelCache.put(m.id, m) for m in models


module.exports = QuerySubscription
