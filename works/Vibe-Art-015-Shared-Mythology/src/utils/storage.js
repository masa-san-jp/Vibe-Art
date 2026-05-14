const KEY = 'sss-state-v1'

export function loadAll(){
  try{
    const raw = localStorage.getItem(KEY)
    return raw? JSON.parse(raw) : null
  }catch(e){ return null }
}

export function saveAll(state){
  try{
    localStorage.setItem(KEY, JSON.stringify(state))
  }catch(e){ /* ignore */ }
}
