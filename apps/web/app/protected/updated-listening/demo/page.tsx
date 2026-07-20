"use client";
import ListenConversation from "@/components/listening/ListenConversation";

export default function ListeningDemoPage() {
  return (
    <ListenConversation
      title="Conversation Practice"
      imageSrc="/sample/conversation.png"
      audioSrc="/sample/audio1.mp3"
      choices={[
        "He needs directions.",
        "She is asking for help.",
        "They are talking about homework.",
        "He wants to borrow something."
      ]}
      onNext={(ans) => console.log("selected:", ans)}
    />
  );
}
