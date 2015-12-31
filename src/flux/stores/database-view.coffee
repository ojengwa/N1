_ = require 'underscore'
Rx = require 'rx-lite'
DatabaseStore = require './database-store'
Message = require '../models/message'
QuerySubscriptionPool = require '../models/query-subscription-pool'
QuerySubscription = require '../models/query-subscription'
MutableQuerySubscription = require '../models/mutable-query-subscription'
ModelView = require './model-view'

verbose = false

class DatabaseView extends ModelView

  constructor: (query, config = {}, @_metadataProvider) ->
    super
    @_countEstimate = -1
    @_itemsWithMetadata = null
    @_resultSet = null

    @_threadsQuerySubscription = new MutableQuerySubscription(query.limit(0), {asResultSet: true})

    $threadsResultSet = Rx.Observable.fromPrivateQuerySubscription('thread-list', @_threadsQuerySubscription)
    $messagesResultSets = {}

    Rx.Observable.zip([
      $threadsResultSet,
      $threadsResultSet.flatMapLatest (threadsResultSet) =>
        console.time("Resolving Messages")
        missingIds = threadsResultSet.ids().filter (id) -> not $messagesResultSets[id]
        return Rx.Observable.from([[]]) if missingIds.length is 0
        Rx.Observable.fromPromise(DatabaseStore.findAll(Message, threadId: missingIds))
    ])
    .flatMapLatest ([threadsResultSet, messagesForNewThreads]) =>
      messagesGrouped = {}
      for message in messagesForNewThreads
        messagesGrouped[message.threadId] ?= []
        messagesGrouped[message.threadId].push(message)

      oldSets = $messagesResultSets
      $messagesResultSets = {}

      sets = threadsResultSet.ids().map (id) =>
        $messagesResultSets[id] = oldSets[id] || @_observableForThreadMessages(id, messagesGrouped[id])
        $messagesResultSets[id]
      sets.unshift(Rx.Observable.from([threadsResultSet]))

      Rx.Observable.combineLatest(sets)

    .subscribe ([threadsResultSet, messagesResultSets...]) =>
      console.timeEnd("Resolving Messages")
      @_resultSet = threadsResultSet
      @_itemsWithMetadata = threadsResultSet.models().map (thread, idx) ->
        thread = new thread.constructor(thread)
        thread.metadata = messagesResultSets[idx]?.models()
        thread

      @_countEstimate = @_resultSet.range().end
      if @_resultSet.range().end is @_threadsQuerySubscription.query().range().end
        @_countEstimate += 1

      console.timeEnd("Resolving Messages")
      @trigger()

    @

  _observableForThreadMessages: (id, initialModels) ->
    subscription = new QuerySubscription(DatabaseStore.findAll(Message, threadId: id), {
      asResultSet: true,
      initialModels: initialModels
    })
    Rx.Observable.fromPrivateQuerySubscription('message-'+id, subscription)

  log: ->
    return unless verbose and not NylasEnv.inSpecMode()
    if _.isString(arguments[0])
      arguments[0] = "DatabaseView (#{@klass.name}): "+arguments[0]
    console.log(arguments...)

  # Accessing Data

  count: ->
    @_countEstimate

  loaded: ->
    @_resultSet isnt null

  get: (offset) =>
    unless _.isNumber(offset)
      throw new Error("ModelView.get() takes a numeric index. Maybe you meant getById()?")
    return null unless @_resultSet
    @_itemsWithMetadata[offset - @_resultSet.range().offset]

  getById: (id) ->
    return _.findWhere(@_itemsWithMetadata, {id})

  indexOfId: (id) ->
    return -1 unless @_resultSet and id
    return @_resultSet.offsetOfId(id)

  itemsCurrentlyInViewMatching: (matchFn) ->
    return [] unless @_resultSet
    @_itemsWithMetadata.filter(matchFn)

  setRetainedRange: ({start, end}) ->
    pageSize = 50
    pagePadding = 100

    roundToPage = (n) -> Math.max(0, Math.round(n / pageSize) * pageSize)

    nextQuery = @_threadsQuerySubscription.query().clone()
    nextQuery.offset(roundToPage(start - pagePadding))
    nextQuery.limit(roundToPage((end - start) + pagePadding * 2))

    @_threadsQuerySubscription.replaceQuery(nextQuery)

  matchers: ->
    @_threadsQuerySubscription.query().matchers()

  invalidate: ({changed, shallow} = {}) ->

  invalidateMetadataFor: ->

  invalidateRetainedRange: ->


module.exports = DatabaseView
