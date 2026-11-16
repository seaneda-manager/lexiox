/** 빈칸 문장 이벤트용 문장. 단어장과 별개로, 전치사·명사·형용사·동사 등 품사별로 섞어 둔 기본 세트.
 *  교재 범위에 맞춰 나중에 교체할 수 있게 데이터만 분리했다(모든 문장은 빈칸 1개, 정답 1개). */
export type ClozeItem = { s: string; a: string; wrong: string[]; pos: string };

export const CLOZE_SENTENCES: ClozeItem[] = [
  // 전치사
  { s: "She is very good ___ math.", a: "at", wrong: ["in", "on", "for"], pos: "전치사" },
  { s: "I am interested ___ learning English.", a: "in", wrong: ["at", "of", "to"], pos: "전치사" },
  { s: "He is afraid ___ dogs.", a: "of", wrong: ["to", "with", "in"], pos: "전치사" },
  { s: "We arrived ___ the airport at noon.", a: "at", wrong: ["in", "on", "to"], pos: "전치사" },
  { s: "The meeting starts ___ 3 o'clock.", a: "at", wrong: ["in", "on", "by"], pos: "전치사" },
  { s: "My birthday is ___ October.", a: "in", wrong: ["on", "at", "of"], pos: "전치사" },
  { s: "See you ___ Monday!", a: "on", wrong: ["in", "at", "by"], pos: "전치사" },
  { s: "She has been waiting ___ an hour.", a: "for", wrong: ["since", "during", "from"], pos: "전치사" },
  { s: "He has lived here ___ 2019.", a: "since", wrong: ["for", "from", "during"], pos: "전치사" },
  { s: "The book is ___ the table.", a: "on", wrong: ["in", "at", "to"], pos: "전치사" },
  { s: "I will finish the report ___ Friday.", a: "by", wrong: ["until", "at", "on"], pos: "전치사" },
  { s: "She depends ___ her parents.", a: "on", wrong: ["in", "at", "of"], pos: "전치사" },
  // 명사
  { s: "Please give me some ___ about the trip.", a: "information", wrong: ["informations", "informs", "informed"], pos: "명사" },
  { s: "He made a great ___ to the team.", a: "contribution", wrong: ["contribute", "contributive", "contributed"], pos: "명사" },
  { s: "Exercise is good for your ___.", a: "health", wrong: ["healthy", "heal", "healthily"], pos: "명사" },
  { s: "The ___ of the new library surprised everyone.", a: "size", wrong: ["sized", "sizing", "sizes of"], pos: "명사" },
  { s: "We need a ___ to this problem.", a: "solution", wrong: ["solve", "solved", "solving"], pos: "명사" },
  // 형용사
  { s: "The test was extremely ___, so many students failed.", a: "difficult", wrong: ["difficulty", "difficultly", "difficulties"], pos: "형용사" },
  { s: "It is ___ to stay hydrated during exercise.", a: "important", wrong: ["importance", "importantly", "import"], pos: "형용사" },
  { s: "She felt ___ after hearing the good news.", a: "relieved", wrong: ["relief", "relieving", "relievedly"], pos: "형용사" },
  { s: "He gave a very ___ answer to the question.", a: "clear", wrong: ["clearly", "clarity", "clearing"], pos: "형용사" },
  { s: "The movie was so ___ that I fell asleep.", a: "boring", wrong: ["bored", "bore", "boringly"], pos: "형용사" },
  { s: "I was ___ by the beautiful view.", a: "amazed", wrong: ["amazing", "amaze", "amazement"], pos: "형용사" },
  // 동사
  { s: "She decided to ___ for the position.", a: "apply", wrong: ["application", "applied", "applying"], pos: "동사" },
  { s: "Please ___ the door when you leave.", a: "close", wrong: ["closely", "closing", "closer"], pos: "동사" },
  { s: "He promised to ___ me tomorrow.", a: "call", wrong: ["calling", "called", "calls"], pos: "동사" },
  { s: "They plan to ___ a new school next year.", a: "build", wrong: ["built", "building", "builds"], pos: "동사" },
  { s: "I look forward to ___ you again.", a: "seeing", wrong: ["see", "saw", "seen"], pos: "동사" },
  { s: "The teacher asked us to ___ quietly.", a: "work", wrong: ["worked", "working", "works"], pos: "동사" },
  // 부사·접속사·기타
  { s: "He speaks English very ___.", a: "fluently", wrong: ["fluent", "fluency", "fluence"], pos: "부사" },
  { s: "She studied hard, ___ she passed the exam.", a: "so", wrong: ["but", "or", "because"], pos: "접속사" },
  { s: "I stayed home ___ it was raining.", a: "because", wrong: ["so", "but", "although"], pos: "접속사" },
  { s: "___ it was late, we kept working.", a: "Although", wrong: ["Because", "So", "Since"], pos: "접속사" },
  { s: "I don't know ___ he will come or not.", a: "whether", wrong: ["that", "what", "which"], pos: "접속사" },
  { s: "This is the girl ___ won the prize.", a: "who", wrong: ["which", "whose", "whom"], pos: "관계사" },
  { s: "I have ___ finished my homework.", a: "already", wrong: ["yet", "ever", "still"], pos: "부사" },
  { s: "There are ___ students in the room than yesterday.", a: "fewer", wrong: ["less", "little", "much"], pos: "수량" },
];
