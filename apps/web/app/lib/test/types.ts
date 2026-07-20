export type Module = 'reading'|'listening'|'speaking'|'writing';
export type TestMode = 'full'|'half'|'one';
export type BuildConfig = {
  reading?: { passages:number; questionsPerPassage:number; requireSkimScroll:boolean };
  listening?: { questionsPerPassage:number };
};
export type TestRouteParams = { sessionId:string; passageId:string };




