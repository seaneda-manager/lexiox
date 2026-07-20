"use client";

import { useState } from "react";
import ScriptEditor from "./ScriptEditor";
import AiFeedbackPanel from "./AiFeedbackPanel";
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
  const [scriptChanged, setScriptChanged] = useState(false);

  function onChanged() {
    setScriptChanged(true);
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
      {initialScript && (
        <AiFeedbackPanel
          resultId={resultId}
          initialFeedback={initialFeedback}
          scriptChanged={scriptChanged}
        />
      )}
    </>
  );
}
