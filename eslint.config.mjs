import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: ["prisma/seed.js"],
  },
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    rules: {
      "@next/next/no-img-element": "off",
      "import/no-anonymous-default-export": "off",
    },
  },
];

export default config;
