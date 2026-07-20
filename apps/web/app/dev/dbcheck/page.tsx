'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
export default function Page(){
  const [out,setOut]=useState<any>(null);
  useEffect(()=>{(async()=>{
    const { data, error } = await supabase.from('organizations').select('id,name').limit(5);
    setOut({ data, error: error?.message ?? null });
  })();},[]);
  return <pre style={{padding:20,whiteSpace:'pre-wrap'}}>{JSON.stringify(out,null,2)}</pre>;
}





