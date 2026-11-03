const KEY = 'stjornuhlaup-player-v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function browserPlayerId(storage = window.localStorage, randomId = () => crypto.randomUUID()) {
  let id = storage.getItem(KEY);
  if (!UUID.test(id || '')) {
    id = randomId();
    storage.setItem(KEY, id);
    if (storage.getItem(KEY) !== id) throw Error('Ekki tókst að vista leikmannsauðkenni.');
  }
  return id;
}
