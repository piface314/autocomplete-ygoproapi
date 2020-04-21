'use babel'
import CallbacksProvider from './providers/callbacks'
import ClsProvider from './providers/classes'
import ConstProvider from './providers/constants'
import GlobalsProvider from './providers/globals'
import MethodsProvider from './providers/methods'
import Updater from './updater'


export default {
  activate() {
    try {
      Updater.update()
      console.log("YGOPro API provider activated, time to duel!")
    } catch(e) {}
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
