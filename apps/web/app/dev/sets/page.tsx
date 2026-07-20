'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ORG_ID } from '@/lib/constants';

export default function Page(){
  const [rows,setRows]=useState<any[]>([]);
  const [msg,setMsg]=useState('loading...');
  useEffect(()=>{(async()=>{
    const { data, error } = await supabase
      .from('sets')
      .select('section,set_id,title,version')
      .eq('org_id', ORG_ID)
      .order('section').order('set_id');
    if(error) setMsg(error.message); else { setRows(data||[]); setMsg(''); }
  })();},[]);
  return (
    <div style={{padding:20}}>
      <h2>Sets</h2>
      {msg && <div>{msg}</div>}
      <ul>{rows.map((r,i)=> <li key={i}>{r.section} / {r.set_id} ??{r.title} v{r.version}</li>)}</ul>
    </div>
  );
}





