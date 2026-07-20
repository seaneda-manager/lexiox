import JrContentList from '../_components/JrContentList';

export default async function JrReadingPage(props: any) {
  return (
    <JrContentList
      type="reading"
      title="읽기 지문"
      icon="📖"
      tableName="jr_reading_passages"
      searchParams={props.searchParams}
    />
  );
}
