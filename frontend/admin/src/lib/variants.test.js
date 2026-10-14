import {describe,it,expect} from 'vitest';
import {groupVariants,variantProblem} from './variants';
describe('variantes agrupadas sin perder su identidad',()=>{
 it('agrupa por color, ordena talles y conserva índices e identificadores',()=>{
  const original=[{id:'large',color:'Negro',size:'L',stock:3,status:'active'},{id:'small',color:' negro ',size:'S',stock:2,status:'active'},{id:'pink',color:'Rosa',size:'2',stock:4,status:'inactive'}];
  const groups=groupVariants(original);
  expect(groups).toHaveLength(2);expect(groups[0].stock).toBe(5);
  expect(groups[0].rows.map(r=>[r.variant.id,r.index])).toEqual([['small',1],['large',0]]);
  expect(groups[1].stock).toBe(0);expect(original[0].size).toBe('L');
 });
 it('detecta colores y talles duplicados antes de guardar',()=>{
  expect(variantProblem([{color:'Negro',size:' M '},{color:' negro ',size:'m'}])).toContain('repetido');
  expect(variantProblem([{color:'Negro',size:'M'},{color:'Rosa',size:'M'}])).toBe('');
  expect(variantProblem([{color:'',size:'M'}])).toContain('Completá');
 });
});
