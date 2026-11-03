let ready;
self.onmessage = async ({ data }) => {
  let db;
  try {
    if (!ready) {
      importScripts('/vendor/sql-wasm-browser.js');
      ready = initSqlJs({ locateFile: file => '/vendor/' + file });
    }
    const SQL = await ready;
    db = new SQL.Database();
    db.run(`CREATE TABLE games (id INTEGER PRIMARY KEY, title TEXT, genre TEXT);
      INSERT INTO games VALUES (1,'Skógarhlaup','Platform'),(2,'Geimstöð','Puzzle'),(3,'Kubbaveröld','Sandbox');
      CREATE TABLE scores (id INTEGER PRIMARY KEY, game_id INTEGER, player TEXT, points INTEGER);
      INSERT INTO scores VALUES (1,1,'Ada',420),(2,2,'Grace',760),(3,1,'Linus',180),(4,3,'Alan',310),(5,2,'Ada',640),(6,3,'Grace',520);`);
    const results = db.exec(data.code).map(result => ({ columns: result.columns, values: result.values.slice(0, 100) }));
    self.postMessage({ type: 'result', tables: results, text: results.length ? '' : 'Fyrirspurn keyrð. Engar niðurstöðulínur.' });
  } catch (error) { self.postMessage({ type: 'error', text: error.message }); }
  finally { db?.close(); }
};
