'use babel'


export default class Config {
  static DAY = 86400000

  static get(cfg) {
    return atom.config.get(`autocomplete-ygoproapi.${cfg}`)
  }

  static getFromEditor(cfg) {
    return atom.config.get(`editor.${cfg}`)
  }

  static getUpdateInterval() {
    const upCfg = Config.get('updateFrequency')
    const DAY = Config.DAY
    switch (upCfg) {
      case 'Daily': return DAY
      case 'Weekly': return DAY * 7
      case 'Monthly': return DAY * 30
      case 'Never': return Infinity
    }
  }
}
