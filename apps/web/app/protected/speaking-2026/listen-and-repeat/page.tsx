// apps/web/app/(protected)/speaking-2026/listen-and-repeat/page.tsx
"use client";

import ListenAndRepeatRunner, {
  ListenRepeatItem,
} from "../components/ListenAndRepeatRunner";

const demoItems: ListenRepeatItem[] = [
  {
    id: "s1",
    sentence: "The student center closes earlier on Fridays.",
  },
  {
    id: "s2",
    sentence: "Many international students attend orientation in the first week.",
  },
  {
    id: "s3",
    sentence: "Please remember to submit your assignment before midnight.",
  },
  {
    id: "s4",
    sentence: "The library will be under renovation during the summer term.",
  },
  {
    id: "s5",
    sentence: "Group projects help students develop communication skills.",
  },
  {
    id: "s6",
    sentence: "Some classes are offered both online and in person.",
  },
  {
    id: "s7",
    sentence: "You can book an appointment with your advisor using the portal.",
  },
];

export default function ListenAndRepeatPage() {
  return (
    <ListenAndRepeatRunner
      items={demoItems}
      mode="test"
      totalQuestions={demoItems.length}
      totalQuestionOffset={1}
      onComplete={(result) => {
        console.log("Listen & Repeat 시험 완료:", result);
      }}
    />
  );
}
