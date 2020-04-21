'use babel'
import CallbacksProvider from './providers/callbacks'
import ClsProvider from './providers/classes'
import ConstProvider from './providers/constants'
import GlobalsProvider from './providers/globals'
import MethodsProvider from './providers/methods'
import Updater from './updater'
import { CompositeDisposable } from 'atom'


export default {
  subscriptions: null,

  activate() {
    Updater.update()
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'autocomplete-ygoproapi:update': () => Updater.update(true)
    }))
    console.log('YGOPro API provider activated, time to duel!')
  },

  deactivate () {
    if (this.subscriptions != null)
      this.subscriptions.dispose()
    this.subscriptions = null
  },

  getProvider() {
    return [
      new CallbacksProvider(),
      new ClsProvider(),
      new ConstProvider(),
      new GlobalsProvider(),
      new MethodsProvider()
    ]
  }
}
