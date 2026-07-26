import VolumeAdjustmentScreen from "../listening/_components/VolumeAdjustmentScreen";

export default function ListeningTestPage() {
  const handleNext = () => {
    console.log("Moving to next screen...");
  };

  return (
    <div>
      <VolumeAdjustmentScreen onNext={handleNext} />
    </div>
  );
}
