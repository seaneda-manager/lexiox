import { redirect } from "next/navigation";

// 예전 데모 주소: 게임 목록으로 보낸다
export default function ArcheryDemoRedirect() {
  redirect("/workout/games");
}
