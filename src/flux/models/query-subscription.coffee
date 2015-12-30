_ = require 'underscore'
PromiseQueue = require 'promise-queue'
DatabaseChangeRecord = require '../stores/database-change-record'

QueryRange = require './query-range'
QueryRangedResultSet = require './query-ranged-result-set'

class QuerySubscription
  constructor: (@_query, @_options = {}) ->
    ModelQuery = require './query'

    if not @_query or not (@_query instanceof ModelQuery)
      throw new Error("QuerySubscription: Must be constructed with a ModelQuery. Got #{@_query}")

    if @_query._count
      throw new Error("QuerySubscriptionPool::add - You cannot listen to count queries.")

    @_query.finalize()

    @_set = null
    @_version = 0
    @_callbacks = []

    @_fetchQueue ?= new PromiseQueue(1, Infinity)
    @_fetchRange(@_query.range(), entireModels: true).then =>
      @_invokeCallbacks()

  query: =>
    @_query

  addCallback: (callback) =>
    unless callback instanceof Function
      throw new Error("QuerySubscription:addCallback - expects a function, received #{callback}")
    @_callbacks.push(callback)

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

    if not @_set
      @_fetchRange(@_query.range(), entireModels: true)
      return

    mustRefetchAllIds = false

    if record.type is 'unpersist'
      for item in record.objects
        @_set.modelCache.remove(item.id)
        offset = @_set.offsetOfId(item.id)
        if offset isnt -1
          @_set.removeAtOffset(offset)

    else if record.type is 'persist'
      for item in record.objects
        offset = @_set.offsetOfId(item.id)
        itemIsInSet = offset isnt -1
        itemShouldBeInSet = item.matches(@_query.matchers())

        if itemIsInSet and not itemShouldBeInSet
          @_set.removeAtOffset(offset)

        else if itemShouldBeInSet and not itemIsInSet
          @_set.modelCache.put(item.id, item)
          mustRefetchAllIds = true

        else if itemIsInSet
          oldItem = @_set.itemWithId(item.id)
          @_set.modelCache.put(item.id, item)

          if @_itemSortOrderHasChanged(oldItem, item)
            mustRefetchAllIds = true
            @_version += 1

    if mustRefetchAllIds
      refetchPromise = @_fetchRange(@_query.range())
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
    if @_options.asResultSet
      return @_set
    else
      return @_query.formatResultObjects(@_set.models())

  _invokeCallbacks: =>
    return unless @_set
    result = @_result()
    @_callbacks.forEach (callback) =>
      callback(result)

  _invokeCallback: (callback) =>
    return unless @_set
    callback(@_result())

  _fetchRange: (range, {entireModels} = {}) =>
    DatabaseStore = require '../stores/database-store'

    version = @_version += 1
    cancelled = => version isnt @_version

    rangeQuery = undefined

    unless range.isInfinite()
      rangeQuery ?= @_query.clone()
      rangeQuery.offset(range.offset).limit(range.limit)

    unless entireModels
      rangeQuery ?= @_query.clone()
      rangeQuery.idsOnly()

    rangeQuery ?= @_query

    @_fetchQueue.add =>
      return if cancelled()

      DatabaseStore.run(rangeQuery, {format: false}).then (results) =>
        return if cancelled()

        @_set ?= new QueryRangedResultSet()
        if entireModels
          @_set.addModelsInRange(range, results)
        else
          @_set.addIdsInRange(range, results)

  _fetchMissingRanges: (options) =>
    missingRanges = @_query.range().rangesBySubtracting(@_set.range())
    Promise.each missingRanges, (range) =>
      @_fetchRange(range, options)

  _fetchMissingModels: ->
    ids = @_set.idsOfMissingModels()
    return Promise.resolve() if ids.length is 0

    console.log("Fetching Models #{JSON.stringify(ids)}")

    DatabaseStore = require '../stores/database-store'
    DatabaseStore.findAll(@_query._klass, {id: ids}).then (models) =>
      @_set.modelCache.put(m.id, m) for m in models


module.exports = QuerySubscription
