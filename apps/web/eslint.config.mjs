/** ESLint v9 Flat Config for apps/web */
import next from "eslint-config-next";

// Next의 다중 preset(flat 배열)을 먼저 펼치고, 우리 커스텀을 뒤에 합친다.
const nextPreset = Array.isArray(next) ? next : [next];

/** @type {import('eslint').Linter.Config[]} */
const config = [
  // 1) Next.js 권장 설정들
  ...nextPreset,

  // 2) 우리 프로젝트 커스텀
  {
    files: ["**/*.{ts,tsx}"],
    settings: {
      next: { rootDir: ["./"] },
      // import alias 해석(선택)
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
      },
    },
    rules: {
      // React Compiler / React Hooks v5 새 규칙 — 기존 코드와 충돌하므로 일괄 off
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react/no-unescaped-entities": "off",
      // SSOT 강제: Reading 타입은 '@/models/reading'만
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/types/types-reading",
                "@/lib/readingSchemas",
                "apps/web/types/types-reading",
              ],
              message: "Reading types must come from @/models/reading (SSOT). Update imports.",
            },
          ],
        },
      ],
    },
  },

  // 3) 이 파일 자체 및 기타 구성 파일들에 대한 품질 설정(선택)
  //   - config 파일에서 불필요 경고 줄이기
  {
    files: ["**/*.config.{js,cjs,mjs,ts}"],
    rules: {
      // 보통 config 파일은 default export 형태가 잦음 → 이미 변수에 담아 해결했지만
      // 혹시 다른 구성 파일에서 같은 경고가 나면 아래 룰 완화가 도움이 됨.
      "import/no-anonymous-default-export": "off",
    },
  },

  // 4) 무시 경로
  {
    ignores: [
      "node_modules/",
      ".next/",
      "dist/",
      "build/",
      "coverage/",
      "**/*.d.ts",
    ],
  },
];

export default config;
