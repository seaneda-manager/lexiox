'use client';

type Props = { src: string };

function guessMime(src: string): string | undefined {
  const lower = src.split('?')[0].toLowerCase();
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.ogg') || lower.endsWith('.oga')) return 'audio/ogg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  return undefined;
}

export default function AudioPlayer({ src }: Props) {
  if (!src) {
    return (
      <div className="rounded border p-3 text-sm text-red-600">
        ?ъ깮???ㅻ뵒??二쇱냼媛 ?놁뒿?덈떎.
      </div>
    );
  }

  const mime = guessMime(src);

  return (
    <div className="rounded border p-3">
      <audio controls className="w-full" preload="metadata" aria-label="?ㅻ뵒???뚮젅?댁뼱">
        <source src={src} type={mime} />
        釉뚮씪?곗?媛 ?ㅻ뵒???붿냼瑜?吏?먰븯吏 ?딆뒿?덈떎.
      </audio>
      <p className="mt-2 text-xs text-gray-500">
        ?ㅻ뵒?ㅺ? ?ъ깮?섏? ?딆쑝硫??덈줈怨좎묠 ???ㅼ떆 ?쒕룄??二쇱꽭??釉뚮씪?곗? ?먮룞?ъ깮 ?뺤콉???곹뼢?????덉뼱??.
      </p>
    </div>
  );
}




