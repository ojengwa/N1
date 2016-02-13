/** @babel */
import _ from 'underscore';
import {
  Actions,
  Thread,
  Category,
  CategoryStore,
  DatabaseStore,
  AccountStore,
  SyncbackCategoryTask,
  TaskQueueStatusStore,
  TaskFactory,
} from 'nylas-exports';


export const SNOOZE_CATEGORY_NAME = 'Snoozed'

export function createSnoozeCategory(accountId, name = SNOOZE_CATEGORY_NAME) {
  const category = new Category({
    displayName: name,
    accountId: accountId,
  })
  const task = new SyncbackCategoryTask({category})

  Actions.queueTask(task)
  return TaskQueueStatusStore.waitForPerformRemote(task).then(()=>{
    return category;
  })
}

export function whenCategoriesReady() {
  const categoriesReady = ()=> CategoryStore.categories().length > 0
  if (!categoriesReady()) {
    return new Promise((resolve)=> {
      const unsubscribe = CategoryStore.listen(()=> {
        if (categoriesReady()) {
          unsubscribe()
          resolve()
        }
      })
    })
  }
  return Promise.resolve()
}

export function getSnoozeCategory(accountId, categoryName = SNOOZE_CATEGORY_NAME) {
  return whenCategoriesReady()
  .then(()=> {
    const userCategories = CategoryStore.userCategories(accountId)
    const category = _.findWhere(userCategories, {displayName: categoryName})
    if (category) {
      return Promise.resolve(category);
    }
    return createSnoozeCategory(accountId, categoryName)
  })
}

export function getSnoozeCategoriesByAccount(accounts = AccountStore.accounts()) {
  const categoriesByAccountId = {}
  accounts.forEach(({id})=> {
    if (categoriesByAccountId[id] != null) return;
    categoriesByAccountId[id] = getSnoozeCategory(id)
  })
  return Promise.props(categoriesByAccountId)
}

// TODO do not allow threads to be moved when moving is in process
export function moveThreads(threads, categoriesByAccountId, {snooze} = {}) {
  const inbox = CategoryStore.getInboxCategory
  const snoozeCat = (accId)=> categoriesByAccountId[accId]
  const tasks = TaskFactory.tasksForApplyingCategories({
    threads,
    categoriesToRemove: snooze ? inbox : snoozeCat,
    categoryToAdd: snooze ? snoozeCat : inbox,
  })

  Actions.queueTasks(tasks)
  const promises = tasks.map(task => TaskQueueStatusStore.waitForPerformRemote(task))
  // Resolve the updated threads
  return (
    Promise.all(promises)
    .then(()=> DatabaseStore.modelify(Thread, _.pluck(threads, 'id')))
  )
}

export function moveThreadsToSnooze(threads) {
  return getSnoozeCategoriesByAccount()
  .then((categoriesByAccountId)=> {
    return moveThreads(threads, categoriesByAccountId, {snooze: true})
  })
}

export function moveThreadsFromSnooze(threads) {
  return getSnoozeCategoriesByAccount()
  .then((categoriesByAccountId)=> {
    return moveThreads(threads, categoriesByAccountId, {snooze: false})
  })
}
