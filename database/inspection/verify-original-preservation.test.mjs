import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

let entry;
try { entry = import.meta.resolve('@electric-sql/pglite'); }
catch { entry = new URL('../../.tmp/db-validation/node_modules/@electric-sql/pglite/dist/index.js',import.meta.url).href; }
const { PGlite } = await import(entry);
const original = { warehouses:[{id:1,branch_id:null,name:"Original ' warehouse",updated_at:'2026-01-01T00:00:00+00:00'}], products:[{id:10,name:'Original product',price:12.34}], empty_rows:[] };
const catalog = { tables:Object.entries(original).map(([name,rows])=>({ name, columns:(name==='warehouses' ? ['id','branch_id','name','updated_at'] : name==='products' ? ['id','name','price'] : ['id']).map(name=>({name})), constraints:[{type:'p',columns:['id']}] })) };
const program = "import importlib.util,json,sys; s=importlib.util.spec_from_file_location('verify','database/inspection/verify-original-preservation.py'); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); p=json.load(sys.stdin); print(m.build_query(p['catalog'],p['data']))";
const query = execFileSync('python',['-c',program],{input:JSON.stringify({catalog,data:original}),encoding:'utf8'}).trim();

test('PostgreSQL original-only projection ignores added rows and detects value/key changes',async()=>{
  const db = new PGlite();
  try {
    await db.exec("CREATE TABLE warehouses(id integer PRIMARY KEY,branch_id integer,name text,updated_at timestamptz); CREATE TABLE products(id integer PRIMARY KEY,name text,price numeric(10,2)); CREATE TABLE empty_rows(id integer PRIMARY KEY); INSERT INTO warehouses VALUES(1,NULL,'Original '' warehouse','2026-01-01Z'); INSERT INTO products VALUES(10,'Original product',12.34);");
    const inspect=async()=> (await db.exec(query)).find(result=>result.rows[0]?.preservation)?.rows[0].preservation;
    const before=await inspect();
    assert.equal(before.fingerprints.find(row=>row.table_name==='products').row_count,1);
    assert.ok(before.warehouse_columns.every(column=>column.unchanged));
    await db.exec("INSERT INTO products VALUES(20,'New fixture product',999); INSERT INTO warehouses VALUES(2,2,'New fixture warehouse',now()); INSERT INTO empty_rows VALUES(123);");
    assert.deepEqual((await inspect()).fingerprints,before.fingerprints);
    await db.exec('UPDATE warehouses SET branch_id=42,updated_at=now() WHERE id=1');
    const routed=await inspect();
    assert.deepEqual(routed.warehouse_columns.filter(column=>!column.unchanged).map(column=>column.column_name),['branch_id','updated_at']);
    await db.exec("UPDATE products SET price=99 WHERE id=10");
    assert.notEqual((await inspect()).fingerprints.find(row=>row.table_name==='products').row_hash,before.fingerprints.find(row=>row.table_name==='products').row_hash);
    await db.exec('DELETE FROM products WHERE id=10');
    assert.equal((await inspect()).fingerprints.find(row=>row.table_name==='products').row_count,0);
  } finally { await db.close(); }
});
