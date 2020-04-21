'use babel'
import fs from 'fs'
import path from 'path'
import endpoints from '../data/endpoints'
import Papa from 'papaparse'
import Config from './config'


export default class Updater {
  static LAST_UPDATE_KEY = 'autocomplete-ygoproapi.lastUpdate'

  static update(forced) {
    if (forced || Updater.shoudlUpdate()) {
      Updater.updating = 2
      Updater.readConstants()
      Updater.readFunctions()
    }
  }

  static finish() {
    Updater.saveLastUpdate()
    const msg = 'Autocomplete YGOPro API database has been succesfully updated!'
    const notif = atom.notifications.addSuccess(msg, {
      dismissable: true,
      detail: 'Reload Atom to use fresh data ;)',
      buttons: [{
        onDidClick: () => atom.reload(),
        text: 'Reload'
      }]
    })
  }

  static shoudlUpdate() {
    const lastUpdate = atom.window.localStorage.getItem(Updater.LAST_UPDATE_KEY)
    if (!lastUpdate)
      return true
    return Date.now() - lastUpdate >= Config.getUpdateInterval()
  }

  static saveLastUpdate() {
    atom.window.localStorage.setItem(Updater.LAST_UPDATE_KEY, Date.now())
  }

  static read(url, step, complete) {
    Papa.parse(url, {
      download: true, header: true,
      step: (row) => {
        try { step(row.data) } catch(e) {}
      },
      complete: () => {
        complete()
        if (--Updater.updating == 0)
          Updater.finish()
      }
    })
  }

  static readConstants() {
    const { constants } = endpoints
    const list = []
    Updater.read(constants, (row) => {
      const { name, desc, val } = row
      list.push({ id: name, value: val, desc: desc })
    }, () => {
      Updater.save('constants', list)
    })
  }

  static readFunctions() {
    const { functions } = endpoints
    const globals = []
    const mgroups = {
      Card: Updater.newMethodGroup('Card', 'c'),
      Effect: Updater.newMethodGroup('Effect', 'e'),
      Group: Updater.newMethodGroup('Group', 'g')
    }
    Updater.read(functions, (row) => {
      const [ sig, name, desc ] = Updater.convertTypes(row)
      const [ cls, id, rawargs ] = Updater.splitFunctionName(name)
      if (!id || cls == 'bit' || id == 'initial_effect')
        return
      const [ argstr, args ] = Updater.fmtArgs(rawargs)
      const ret = Updater.fmtRet(sig)
      const entry = { id, argstr, args, desc, ret }
      if (cls) {
        let group = mgroups[cls]
        if (!group)
          group = mgroups[cls] = Updater.newMethodGroup(cls)
        group.methods.push(entry)
      } else
        globals.push(entry)
    }, () => {
      const methods = []
      for (const k in mgroups)
        methods.push(mgroups[k])
      Updater.save('methods', methods)
      Updater.save('globals', globals)
    })
  }

  static convertTypes({ sig, name, desc }) {
    const convert = s => s.replace(/\bbool\b/g, 'boolean')
      .replace(/\bint\b|\binteger\b/g, 'number')
      .replace(/\bvar\b/g, 'any')
    return [ convert(sig), convert(name), desc ]
  }

  static newMethodGroup(cls, infer) {
    return { cls, infer, methods: [] }
  }

  static splitFunctionName(name) {
    const m = name.match(/^([^\.(]*?)\.?([^\.(]*)(?:\((.*)\))?$/)
    return m.slice(1)
  }

  static fmtArgs(rawargs) {
    if (!rawargs)
      return [ undefined, undefined ]
    const args = [], splitter = /([\w\|]+)\s+(\.\.\.|[\w\|]+)/g
    const argstr = rawargs.replace(splitter, (_, argType, argIDT) => {
      const [ __, argID, altType ] = argIDT.match(/^([^|]+)(\|.+)?$/)
      argType += altType || ''
      args.push({ id: argID, type: argType })
      return `${argID}: ${argType}`
    })
    let last, opt
    for (const [ i, c ] of Updater.splitTraverse(argstr, ',')) {
      if (c == '[')
        opt = true
      if (i != last && args[i])
        args[i].opt = opt
      last = i
    }
    return [ argstr, args ]
  }

  static splitTraverse = function* (s, splitter) {
    const ss = s.split(splitter)
    for (let i = 0; i < ss.length; ++i)
      for (const c of ss[i])
        yield [ i, c ]
  }

  static fmtRet(sig) {
    return sig != 'void' && sig.split(',').map(s =>
      s.match(/^\s*[\[\]]?([^\[\]]*)[\[\]]?\s*$/)[1]) || undefined
  }

  static save(file, data) {
    const fp = path.resolve(__dirname, '..', 'data', file + '.json')
    fs.writeFile(fp, JSON.stringify(data, null, 2), (e) => null)
  }
}
