_ = require 'underscore'
{AccountStore, Actions, MenuHelpers} = require 'nylas-exports'


class SidebarCommands

  @_focusAccounts: (accounts) ->
    Actions.focusDefaultMailboxPerspectiveForAccounts(accounts)
    Actions.focusSidebarAccounts(accounts)
    NylasEnv.show() unless NylasEnv.isVisible()

  @_registerCommands: ->
    commands = {}

    allKey = "application:select-account-0"
    commands[allKey] = @_focusAccounts.bind(@, AccountStore.accounts())

    [1..8].forEach (index) =>
      account = AccountStore.accounts()[index - 1]
      return unless account
      key = "application:select-account-#{index}"
      commands[key] = @_focusAccounts.bind(@, [account])

    NylasEnv.commands.add('body', commands)

  @_registerMenuItems: ->
    windowMenu = _.find NylasEnv.menu.template, ({label}) ->
      MenuHelpers.normalizeLabel(label) is 'Window'
    return unless windowMenu

    submenu = _.reject windowMenu.submenu, (item) -> item.account
    return unless submenu

    idx = _.findIndex submenu, ({type}) -> type is 'separator'
    return unless idx > 0

    menuItems = [{
      label: 'All Accounts'
      command: "application:select-account-0"
      account: true
    }]
    menuItems = menuItems.concat AccountStore.accounts().map((item, idx) =>
      label: item.emailAddress,
      command: "application:select-account-#{idx + 1}",
      account: true
    )

    submenu.splice(idx + 1, 0, menuItems...)
    windowMenu.submenu = submenu
    NylasEnv.menu.update()

  @register: ->
    @_registerCommands()
    @_registerMenuItems()


module.exports = SidebarCommands
