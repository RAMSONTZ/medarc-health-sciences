import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../data/bank.parts/',import.meta.url);
const data=Buffer.from(fs.readdirSync(root).filter(x=>x.endsWith('.part')).sort().map(x=>fs.readFileSync(new URL(x,root),'utf8')).join('')); 
if(createHash('sha256').update(data).digest('hex')!=='eabe9041576475021ea2ef8ba747bab515ac4d023458d6fd55729e1fe19b038c') throw new Error('Question bank integrity mismatch');
fs.writeFileSync(new URL('../data/bank.json',import.meta.url),data);
console.log('Restored verified MedArc question bank');
