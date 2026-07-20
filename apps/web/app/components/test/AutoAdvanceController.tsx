'use client';
import {useEffect, useRef} from 'react';

type Cue = { questionId:string; enableMs:number };
export default function AutoAdvanceController({cues=[], onEnable}:{cues?:Cue[]; onEnable?:(qid:string)=>void}){
  const enabledRef = useRef(new Set<string>());
  useEffect(()=>{
    const audio = document.querySelector('audio');
    if(!audio) return;
    const id = window.setInterval(()=>{
      const tMs = (audio.currentTime||0)*1000;
      cues.forEach(c=>{
        if(tMs>=c.enableMs && !enabledRef.current.has(c.questionId)){
          enabledRef.current.add(c.questionId);
          onEnable?.(c.questionId);
        }
      });
    }, 100);
    return ()=> window.clearInterval(id);
  },[cues,onEnable]);
  return null;
}




