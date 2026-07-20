import JrContentList from '../_components/JrContentList';

export default async function JrGrammarPage(props: any) {
  return (
    <JrContentList
      type="grammar"
      title="문법"
      icon="📚"
      tableName="jr_grammar_chapters"
      searchParams={props.searchParams}
    />
  );
}
