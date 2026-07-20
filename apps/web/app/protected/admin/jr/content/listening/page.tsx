import JrContentList from '../_components/JrContentList';

export default async function JrListeningPage(props: any) {
  return (
    <JrContentList
      type="listening"
      title="청취"
      icon="🎧"
      tableName="jr_listening_sessions"
      searchParams={props.searchParams}
    />
  );
}
