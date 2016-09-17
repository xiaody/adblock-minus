class CrTabs {
  constructor () {
    this.map = new Map()
    this.fmapPool = []
  }
  set (tabid, frameid, url) {
    let map = this.map
    let pool = this.fmapPool
    if (!map.has(tabid)) {
      map.set(tabid, pool.length ? pool.pop() : new Map())
    }
    map.get(tabid).set(frameid, url)
  }
  get (tabid, frameid) {
    let fmap = this.map.get(tabid)
    if (fmap) {
      return fmap.get(frameid || 0)
    }
  }
  delete (tabid) {
    let map = this.map
    let fmap = map.get(tabid)
    if (fmap) {
      fmap.clear()
      this.fmapPool.push(fmap)
      map.delete(tabid)
    }
  }
}

export { CrTabs }
