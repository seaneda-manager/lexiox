import { describe, expect, it } from 'vitest';
import { blankOut, buildMarkedPassage, placeCorrect, stripMarks, targetPositions, validateMarkSequence } from './variantMarks';

const P = 'The old man walked slowly. He was tired, and the road was long. Then he sat down.';

describe('buildMarkedPassage', () => {
  it('순서대로 표시하고 replace 를 반영한다', () => {
    const r = buildMarkedPassage(P, [{ target: 'slowly' }, { target: 'tired', replace: 'energetic' }, { target: 'long' }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.text).toContain('⟦1|slowly⟧');
    expect(r.text).toContain('⟦2|energetic⟧');
    expect(validateMarkSequence(r.text, 3)).toBe(true);
    expect(stripMarks(r.text)).toBe(P.replace('tired', 'energetic'));
  });
  it('순서가 어긋나면 실패', () => {
    expect(buildMarkedPassage(P, [{ target: 'long' }, { target: 'slowly' }]).ok).toBe(false);
  });
  it('단어 경계를 지킨다 (he 가 The 안에서 잡히지 않음)', () => {
    const r = buildMarkedPassage(P, [{ target: 'He' }, { target: 'he' }]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.text).toContain('⟦2|he⟧ sat');
  });
});

describe('blankOut / placeCorrect / targetPositions', () => {
  it('빈칸 만들기', () => {
    const r = blankOut(P, 'the road was long');
    expect(r.ok && r.text.includes('____________')).toBe(true);
  });
  it('정답을 원하는 위치로', () => {
    const r = placeCorrect(['c', 'a', 'b', 'd', 'e'], 4);
    expect(r.texts[3]).toBe('c');
    expect(r.correctIndex).toBe(4);
  });
  it('목표 위치는 5개 단위로 모두 다르다', () => {
    expect(new Set(targetPositions(5, 3)).size).toBe(5);
  });
});
