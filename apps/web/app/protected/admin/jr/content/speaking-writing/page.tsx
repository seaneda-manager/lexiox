import JrContentList from '../_components/JrContentList';

export default async function JrSpeakingWritingPage(props: any) {
  return (
    <JrContentList
      type="speaking-writing"
      title="말하기/쓰기"
      icon="🎤"
      tableName="jr_speaking_writing_tasks"
      searchParams={props.searchParams}
    />
  );
}
