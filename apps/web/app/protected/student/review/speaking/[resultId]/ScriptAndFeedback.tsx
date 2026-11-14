"use client";

import { useState } from "react";
import ScriptEditor from "./ScriptEditor";
import ReviewDetail from "./ReviewDetail";
import ReRecordPanel from "./ReRecordPanel";

export default function ScriptAndFeedback({
  resultId,
  initialScript,
  initialPrompt,
  approxWords,
  approxSentences,
  initialFeedback,
}: {
  resultId: string;
  initialScript: string | null;
  initialPrompt?: string | null;
  approxWords?: number | null;
  approxSentences?: number | null;
  initialFeedback?: string | null;
}) {
  const [scriptVersion, setScriptVersion] = useState(0);
  const [script, setScript] = useState(initialScript);

  function onChanged(newScript?: string) {
    if (typeof newScript === "string") setScript(newScript);
    setScriptVersion((v) => v + 1);
  }

  return (
    <>
      <ScriptEditor
        resultId={resultId}
        initialScript={initialScript}
        approxWords={approxWords}
        approxSentences={approxSentences}
        onScriptChanged={onChanged}
        reRecordSlot={
          <ReRecordPanel
            resultId={resultId}
            prompt={initialPrompt}
            onScriptUpdated={onChanged}
          />
        }
      />
      <ReviewDetail resultId={resultId} script={script} scriptVersion={scriptVersion} />
    </>
  );
}
