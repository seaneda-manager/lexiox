"use client";

import ListenAndRepeatGame, {
  ListenRepeatGameItem,
} from "../components/ListenAndRepeatGame";

const demoItems: ListenRepeatGameItem[] = [
  {
    id: "g1",
    sentence: "The campus library is open until midnight.",
  },
  {
    id: "g2",
    sentence: "You can register for classes online.",
  },
  {
    id: "g3",
    sentence: "The dining hall serves breakfast from seven to nine.",
  },
  {
    id: "g4",
    sentence: "Student parking permits cost fifty dollars per semester.",
  },
  {
    id: "g5",
    sentence: "The music festival will be held next month.",
  },
];

export default function ListenAndRepeatGamePage() {
  return (
    <ListenAndRepeatGame
      items={demoItems}
      onComplete={(result) => {
        console.log("Game completed:", result);
        alert("🎉 You completed the game! Score: " + (result.length * 10));
      }}
    />
  );
}
