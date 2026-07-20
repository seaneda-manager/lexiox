'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Page(){
  const [out,setOut]=useState<any>({status:'checking...'});
  useEffect(()=>{(async()=>{
    const { data, error } = await supabase.storage.from('audio').list('', { limit: 5 });
    setOut({ ok: !error, error: error?.message ?? null, items: data?.map(d=>d.name) ?? [] });
  })();},[]);
  return <pre style={{padding:20,whiteSpace:'pre-wrap'}}>{JSON.stringify(out,null,2)}</pre>;
}





