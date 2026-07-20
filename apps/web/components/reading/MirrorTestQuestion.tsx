// apps/web/components/reading/MirrorTestQuestion.tsx
"use client";

import TestSectionLayout from "@/components/test/TestSectionLayout";

const passageHtml = `
<p>Very young children cannot recognize themselves in a mirror; they usually
achieve this milestone around 18 months of age. The ability to recognize
oneself in the mirror is considered to be a key component of self-awareness
and consciousness for humans. But what about animals?</p>

<p>For many years, scientists have known that members of the great ape family
could recognize themselves in mirrors. They measured this by the "mirror test,"
which involved putting a colored mark on an ape’s body, and then showing the
ape its reflection in a mirror. If the ape tried to remove the mark on its own
body, the scientists knew that the ape was recognizing its reflection.</p>

<p>Apes are close relatives of humans, but in recent years, scientists have
discovered that other animals also pass the "mirror test." Elephants and
dolphins have shown signs of self-recognition. These, like apes, are highly
intelligent animals. But in a more recent experiment, a type of fish called the
cleaner fish tried to scrape a mark off its body when it saw itself in the
mirror. This suggests that even less intelligent animals may possess more
self-awareness than previously suspected.</p>
`;

const choices = [
  "Stages of early childhood development",
  "Research on animal cognition",
  "Differences between apes, elephants, and dolphins",
  "Recent experiments on fish",
];

export default function MirrorTestQuestion() {
  return (
    <TestSectionLayout
      sectionLabel="Reading"
      title="The Mirror Test"
      showVolumeButton={false}
      showBackButton={true}
      onBack={() => console.log("BACK")}
      onNext={() => console.log("NEXT")}
      left={
        <article className="prose max-w-none text-sm leading-relaxed">
          <h2 className="mb-3 text-base font-semibold">
            The Mirror Test
          </h2>
          <div
            className="space-y-3"
            dangerouslySetInnerHTML={{ __html: passageHtml }}
          />
        </article>
      }
      right={
        <div className="flex h-full flex-col gap-4 text-sm">
          <p className="font-semibold">
            What is the passage mainly about?
          </p>
          <form className="space-y-3">
            {choices.map((choice, idx) => (
              <label
                key={idx}
                className="flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 hover:bg-slate-50"
              >
                <input
                  type="radio"
                  name="q13"
                  className="mt-1"
                />
                <span>{choice}</span>
              </label>
            ))}
          </form>
        </div>
      }
    />
  );
}
