NylasStore = require 'nylas-store'
Reflux = require 'reflux'
Rx = require 'rx-lite'
_ = require 'underscore'
{Message,
 Actions,
 AccountStore,
 MutableQuerySubscription,
 QueryResultSetView,
 DatabaseStore} = require 'nylas-exports'

class DraftListStore extends NylasStore
  constructor: ->
    @listenTo AccountStore, @_onAccountChanged

    @subscription = new MutableQuerySubscription(@_queryForCurrentAccount(), {asResultSet: true})
    $resultSet = Rx.Observable.fromPrivateQuerySubscription('draft-list', @subscription)

    @_view = new QueryResultSetView $resultSet, ({start, end}) =>
      @subscription.replaceQuery(@_queryForCurrentAccount().page(start, end))

  view: =>
    @_view

  _queryForCurrentAccount: =>
    account = AccountStore.current()
    return null unless account

    query = DatabaseStore.findAll(Message)
      .include(Message.attributes.body)
      .order(Message.attributes.date.descending())
      .where([
        Message.attributes.accountId.equal(account.id)
        Message.attributes.draft.equal(true)
      ])
      .page(0, 1)

  _onAccountChanged: =>
    @subscription.replaceQuery(@_queryForCurrentAccount())

module.exports = new DraftListStore()
