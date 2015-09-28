NylasStore = require 'nylas-store'
{Actions} = require 'nylas-exports'
qs = require 'querystring'
_ = require 'underscore'
moment = require 'moment'

class DeveloperBarCurlRequest
  constructor: ({@id, request, statusCode, error}) ->
    url = request.url
    if request.auth
      url = url.replace('://', "://#{request.auth.user}:#{request.auth.pass}@")
    if request.qs
      url += "?#{qs.stringify(request.qs)}"

    postBody = ""
    postBody = JSON.stringify(request.body).replace(/'/g, '\\u0027') if request.body

    data = ""
    data = "-d '#{postBody}'" unless request.method == 'GET'

    headers = ""
    if request.headers
      for k,v of request.headers
        headers += "-H \"#{k}: #{v}\" "

    @command = "curl -X #{request.method} #{headers}#{data} \"#{url}\""
    @statusCode = statusCode ? error?.code ? "pending"
    @startMoment = moment(request.startTime)
    @

class DeveloperBarStore extends NylasStore
  constructor: ->
    @_setStoreDefaults()
    @_registerListeners()

  ########### PUBLIC #####################################################

  curlHistory: -> @_curlHistory

  longPollState: -> @_longPollState

  longPollHistory: ->
    # We can't use Utils.deepClone because the deltas contain circular references
    # See delta.attributes._delta = delta
    JSON.parse(JSON.stringify(@_longPollHistory))

  visible: -> @_visible

  ########### PRIVATE ####################################################

  triggerThrottled: ->
    @_triggerThrottled ?= _.throttle(@trigger, 100)
    if atom.getCurrentWindow().isVisible()
      @_triggerThrottled()

  _setStoreDefaults: ->
    @_curlHistoryIds = []
    @_curlHistory = []
    @_longPollHistory = []
    @_longPollState = {}
    @_visible = atom.inDevMode()

  _registerListeners: ->
    @listenTo Actions.willMakeAPIRequest, @_onWillMakeAPIRequest
    @listenTo Actions.didMakeAPIRequest, @_onDidMakeAPIRequest
    @listenTo Actions.longPollReceivedRawDeltas, @_onLongPollDeltas
    @listenTo Actions.longPollProcessedDeltas, @_onLongPollProcessedDeltas
    @listenTo Actions.longPollStateChanged, @_onLongPollStateChange
    @listenTo Actions.clearDeveloperConsole, @_onClear
    @listenTo Actions.showDeveloperConsole, @_onShow
    @listenTo Actions.sendFeedback, @_onSendFeedback

  _onShow: ->
    @_visible = true
    @trigger(@)

  _onClear: ->
    @_curlHistoryIds = []
    @_curlHistory = []
    @_longPollHistory = []
    @trigger(@)

  _onLongPollDeltas: (deltas) ->
    # Add a local timestamp to deltas so we can display it
    now = new Date()
    delta.timestamp = now for delta in deltas

    # Incoming deltas are [oldest...newest]. Append them to the beginning
    # of our internal history which is [newest...oldest]
    @_longPollHistory.unshift(deltas.reverse()...)
    if @_longPollHistory.length > 200
      @_longPollHistory.length = 200
    @triggerThrottled(@)

  _onLongPollProcessedDeltas: ->
    @triggerThrottled(@)

  _onLongPollStateChange: ({accountId, state}) ->
    @_longPollState[accountId] = state
    @triggerThrottled(@)

  _onWillMakeAPIRequest: ({requestId, request}) =>
    item = new DeveloperBarCurlRequest({id: requestId, request})

    @_curlHistory.unshift(item)
    @_curlHistoryIds.unshift(requestId)
    if @_curlHistory.length > 200
      @_curlHistory.pop()
      @_curlHistoryIds.pop()

    @triggerThrottled(@)

  _onDidMakeAPIRequest: ({requestId, request, statusCode, error}) =>
    idx = @_curlHistoryIds.indexOf(requestId)
    return if idx is -1 # Could be more than 200 requests ago

    item = new DeveloperBarCurlRequest({id: requestId, request, statusCode, error})
    @_curlHistory[idx] = item
    @triggerThrottled(@)

  _onSendFeedback: ->
    {AccountStore,
     Contact,
     Message,
     DatabaseStore} = require 'nylas-exports'

    user = AccountStore.current().name

    draft = new Message
      from: [AccountStore.current().me()]
      to: [
        new Contact
          name: "Nylas Team"
          email: "feedback@nylas.com"
      ]
      date: (new Date)
      draft: true
      subject: "Feedback"
      accountId: AccountStore.current().id
      body: """
        Hi, Nylas team! I have some feedback for you.<br/>
        <br/>
        <b>What happened:</b><br/>
        <br/>
        <br/>
        <b>Impact:</b><br/>
        <br/>
        <br/>
        <b>Feedback:</b><br/>
        <br/>
        <br/>
        <b>Environment:</b><br/>
        I'm using Nylas Mail #{atom.getVersion()} and my platform is #{process.platform}-#{process.arch}.<br/>
        --<br/>
        #{user}<br/>
      """
    DatabaseStore.persistModel(draft).then ->
      Actions.composePopoutDraft(draft.clientId)

module.exports = new DeveloperBarStore()