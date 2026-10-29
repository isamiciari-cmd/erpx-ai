import { beforeEach, describe, expect, it, vi } from 'vitest';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../lib/supabase',() => ({ supabase:{ rpc },isDemoMode:false }));
import { completePOSSale,closeShift,type CompletePOSSaleInput } from './salesService';

const input = (notes:string):CompletePOSSaleInput => ({ company_id:'company',branch_id:'branch',cashier_id:'cashier',shift_id:'shift',payment_method:'cash',notes,
  items:[{ product_id:'product',product_name:'Untrusted name',quantity:1,unit_price:0.01,discount_percentage:0,subtotal:0.01,total:0.01,vat_rate:0 }] });
const result = { success:true,sale_id:'sale',sale_number:'POS-1',invoice_id:'invoice',invoice_number:'INV-1',total_amount:115 };
beforeEach(() => { rpc.mockReset(); });
describe('transactional checkout boundary',() => {
  it('sends only product intent and an idempotency key',async () => {
    rpc.mockResolvedValue({ data:result,error:null });
    expect(await completePOSSale(input('intent'))).toEqual(result);
    const [name,payload] = rpc.mock.calls[0];
    expect(name).toBe('complete_pos_sale');
    expect(payload.p_items).toEqual([{ product_id:'product',quantity:1,discount_percentage:0 }]);
    expect(payload.p_idempotency_key).toMatch(/^[0-9a-f-]{36}$/);
    expect(payload.p_discount_amount).toBe(0);
  });
  it('reuses the request key after an uncertain network failure',async () => {
    rpc.mockResolvedValueOnce({ data:null,error:{ message:'Network connection lost' } }).mockResolvedValueOnce({ data:result,error:null });
    const sale = input('retry');
    await expect(completePOSSale(sale)).rejects.toMatchObject({ message:'Network connection lost' });
    await completePOSSale(sale);
    expect(rpc.mock.calls[0][1].p_idempotency_key).toBe(rpc.mock.calls[1][1].p_idempotency_key);
  });
  it('merges simultaneous submission of the same cart',async () => {
    let resolve!:(value:unknown) => void;
    rpc.mockReturnValue(new Promise(done => { resolve=done; }));
    const first = completePOSSale(input('double click')); const second = completePOSSale(input('double click'));
    expect(rpc).toHaveBeenCalledTimes(1);
    resolve({ data:result,error:null });
    expect(await first).toEqual(await second);
  });
  it('honors a caller supplied key and explains a missing migration',async () => {
    rpc.mockResolvedValue({ data:null,error:{ code:'PGRST202' } });
    await expect(completePOSSale({ ...input('missing'),idempotency_key:'stable-key' })).rejects.toThrow('migration has not been deployed');
    expect(rpc.mock.calls[0][1].p_idempotency_key).toBe('stable-key');
  });
  it('rejects invalid quantities and missing shifts before calling the database',async () => {
    const sale=input('invalid');
    await expect(completePOSSale({ ...sale,shift_id:null })).rejects.toThrow('open shift');
    await expect(completePOSSale({ ...sale,items:[{ ...sale.items[0],quantity:0.5 }] })).rejects.toThrow('whole number');
    await expect(completePOSSale({ ...sale,discount_amount:NaN })).rejects.toThrow('monetary');
    expect(rpc).not.toHaveBeenCalled();
  });
  it('closes shifts through the atomic RPC',async () => {
    rpc.mockResolvedValue({ data:{ id:'shift',status:'closed' },error:null });
    expect(await closeShift('shift',100)).toMatchObject({ status:'closed' });
    expect(rpc).toHaveBeenCalledWith('close_pos_shift',{ p_shift_id:'shift',p_closing_cash:100 });
    await expect(closeShift('shift',-1)).rejects.toThrow('nonnegative');
  });
});
