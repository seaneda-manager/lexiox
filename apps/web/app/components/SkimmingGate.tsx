'use client';
import {useEffect, useRef, useState} from 'react';

export default function SkimmingGate({html, onUnlock}:{html:string; onUnlock:()=>void}){
  const ref = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(false);
  useEffect(()=>{
    const el = ref.current!;
    const onScroll = ()=>{
      setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 4);
    };
    el.addEventListener('scroll', onScroll);
    return ()=> el.removeEventListener('scroll', onScroll);
  },[]);
  return (
    <div className="h-[70vh] border rounded-xl overflow-y-auto p-4" ref={ref}>
      <div dangerouslySetInnerHTML={{__html: html}} />
      <div className="sticky bottom-0 bg-white py-3">
        <button className="btn-primary" disabled={!atBottom} onClick={onUnlock}>Start Questions</button>
        {!atBottom && <p className="text-xs text-gray-500 mt-1">???섎떒源뚯? ?ㅽ겕濡ㅽ빐???쒖꽦?붾맗?덈떎.</p>}
      </div>
    </div>
  );
}




