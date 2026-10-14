import { useEffect, useState } from 'react';
export function useDebouncedValue(value,delay=300){const [result,setResult]=useState(value);useEffect(()=>{const timer=setTimeout(()=>setResult(value),delay);return()=>clearTimeout(timer);},[value,delay]);return result;}
