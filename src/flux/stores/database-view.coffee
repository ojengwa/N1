_ = require 'underscore'
Rx = require 'rx-lite'
DatabaseStore = require './database-store'
Message = require '../models/message'
QuerySubscriptionPool = require '../models/query-subscription-pool'
MutableQuerySubscription = require '../models/mutable-query-subscription'
ModelView = require './model-view'

verbose = false

class DatabaseView extends ModelView

  constructor: (query, config = {}, @_metadataProvider) ->
    super
    @_count = -1
    @_itemsWithMetadata = null
    @_resultSet = null
    @_threadQuerySubscription = new MutableQuerySubscription(query.limit(0), {asResultSet: true})

    @_observer = @_build().subscribe (data) =>
      [resultSet, messagesForThreads...] = data

      items = resultSet.models()
      for thread, idx in items
        items[idx] = new thread.constructor(thread)
        items[idx].metadata = messagesForThreads[idx]

      @_resultSet = resultSet
      @_itemsWithMetadata = items
      @_count = 1000 # HACK
      console.log("TRIGGERING")
      @trigger()

    @

  _build: ->
    Rx.Observable.create (observer) =>
      unsubscribe = QuerySubscriptionPool.addPrivateSubscription 'thread-list', @_threadQuerySubscription, (resultSet) ->
        observer.onNext(resultSet)
      return Rx.Disposable.create(unsubscribe)

    .flatMapLatest (resultSet) =>
      messagesObservables = resultSet.ids().map (id) ->
        Rx.Observable.fromQuery(DatabaseStore.findAll(Message, {threadId: id}))
      messagesObservables.unshift(Rx.Observable.from([resultSet]))
      Rx.Observable.combineLatest(messagesObservables)

    .debounce(1)

  log: ->
    return unless verbose and not NylasEnv.inSpecMode()
    if _.isString(arguments[0])
      arguments[0] = "DatabaseView (#{@klass.name}): "+arguments[0]
    console.log(arguments...)

  # Accessing Data

  count: ->
    @_count

  loaded: ->
    @_resultSet isnt null

  get: (offset) =>
    unless _.isNumber(offset)
      throw new Error("ModelView.get() takes a numeric index. Maybe you meant getById()?")
    return null unless @_resultSet
    @_itemsWithMetadata[offset - @_resultSet.range().offset]

  getById: (id) ->
    return null unless id
    return @_resultSet.modelCache.get(id)

  indexOfId: (id) ->
    return -1 unless @_resultSet and id
    return @_resultSet.offsetOfId(id)

  itemsCurrentlyInViewMatching: (matchFn) ->
    return [] unless @_resultSet
    @_itemsWithMetadata.filter(matchFn)

  setRetainedRange: ({start, end}) ->
    pageSize = 10
    pagePadding = 50

    nextQuery = @_threadQuerySubscription.query().clone()
    nextQuery.offset(Math.max(0, Math.round((start - pagePadding) / pageSize) * pageSize))
    nextQuery.limit((end - start) + pagePadding * 2)

    @_threadQuerySubscription.replaceQuery(nextQuery)

  matchers: ->
    @_threadQuerySubscription.query().matchers()

  invalidate: ({changed, shallow} = {}) ->

  invalidateMetadataFor: ->

  invalidateRetainedRange: ->


module.exports = DatabaseView
