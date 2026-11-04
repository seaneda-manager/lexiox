// 선생님도 단어 시험 설정(출제 단어 수 등)을 바꿀 수 있게 admin 화면을 그대로 노출한다.
// (/admin/* 은 admin 만 들어올 수 있어서 별도 경로가 필요하다. API 쪽에서 admin/teacher 권한을 검사한다.)
export { default } from "../../admin/vocab/test-config/page";
