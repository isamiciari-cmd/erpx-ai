import { mkdtemp, mkdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';

export async function waitForReceiptSessions(database) {
  for (let attempt=0; attempt<80; attempt++) {
    const { rows } = await database.query(`SELECT pid FROM pg_stat_activity
      WHERE datname=current_database() AND state='active' AND wait_event_type='Lock'
        AND query LIKE 'SELECT public.confirm_preview_invoice_receipt(%' ORDER BY pid`);
    if (rows.length === 2) return rows.map(row=>row.pid);
    await setTimeout(50);
  }
  throw new Error('Two independent receipt confirmations did not reach the PostgreSQL lock.');
}

export async function openLocalReceiptPostgres() {
  if (process.env.AI_LOCAL_PREVIEW !== 'true') throw new Error('AI_LOCAL_PREVIEW=true required.');
  const dependencyRoot = new URL('../../.tmp/receipt-postgres/node_modules/', import.meta.url);
  const { default: EmbeddedPostgres } = await import(new URL('embedded-postgres/dist/index.js',dependencyRoot));
  const { default: pg } = await import(new URL('pg/lib/index.js',dependencyRoot));
  const reservation = createServer();
  reservation.listen(0,'127.0.0.1');
  await once(reservation,'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const root = resolve('.tmp/receipt-postgres');
  await mkdir(root,{recursive:true});
  const databaseDir = await mkdtemp(resolve(root,'cluster-'));
  const user = 'erpx_receipt_qa', password = randomUUID() + randomUUID();
  const cluster = new EmbeddedPostgres({ databaseDir, port, user, password, persistent:true,
    initdbFlags:['--no-locale','--encoding=UTF8'], postgresFlags:['-h','127.0.0.1'],
    onLog:()=>{}, onError:()=>{} });
  await cluster.initialise();
  await cluster.start();
  const pool = new pg.Pool({ host:'127.0.0.1',port,user,password,database:'postgres',
    max:8, connectionTimeoutMillis:5000, options:'-c statement_timeout=20000' });
  return {
    pool, exec: sql => pool.query(sql), query: (sql,params) => pool.query(sql,params),
    transaction: async run => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await run({ exec: sql=>client.query(sql), query:(sql,params)=>client.query(sql,params) });
        await client.query('COMMIT');
        return result;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    },
    close: async () => { try { await pool.end(); } finally { await cluster.stop(); } },
  };
}
