'use babel'
import fs from 'fs'
import path from 'path'
import endpoints from '../data/endpoints'
import Papa from 'papaparse'

const DELTA_TIME = 604800000 // 1 week
const LAST_UPDATE_KEY = 'autocomplete-ygoproapi.lastUpdate'

export default class Updater {
  static update(forced) {
    if (forced || Updater.shoudlUpdate()) {
      Updater.updating = 2
      Updater.readConstants()
      Updater.readFunctions()
    }
  }

  static shoudlUpdate() {
    const lastUpdate = atom.window.localStorage.getItem(LAST_UPDATE_KEY)
    if (!lastUpdate)
      return true
    const dt = DELTA_TIME
    return Date.now() - lastUpdate >= dt
  }

  static saveLastUpdate() {
    atom.window.localStorage.setItem(LAST_UPDATE_KEY, Date.now())
  }

  static read(url, step, complete) {
    Papa.parse(url, {
      download: true, header: true,
      step: (row) => step(row.data),
      complete: () => {
        complete()
        if (--Updater.updating == 0)
          Updater.saveLastUpdate()
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
    const m = name.match(/([^\.]*?)\.?([^\.]*)\((.*)\)$/)
    return m ? m.slice(1) : []
  }

  static fmtArgs(rawargs) {
    const args = [], splitter = /([\w\|]+)\s+(\.\.\.|[\w\|]+)/g
    const argstr = rawargs.replace(splitter, (_, argType, argIDT) => {
      const [ __, argID, altType ] = argIDT.match(/^([^|]+)(\|.+)?$/)
      argType += altType || ''
      args.push({ id: argID, type: argType })
      return `${argID}: ${argType}`
    })
    let i = 0, opt = undefined
    for (const c of argstr) {
      switch (c) {
        case '[': opt = true; break
        case ':': args[i++].opt = opt; break
      }
    }
    return [ argstr, args ]
  }

  static fmtRet(sig) {
    return sig != 'void' && sig.split(',').map(s => s.trim()) || undefined
  }

  static save(file, data) {
    const fp = path.resolve(__dirname, '..', 'data', file + '.json')
    fs.writeFile(fp, JSON.stringify(data), (e) => null)
  }
}
