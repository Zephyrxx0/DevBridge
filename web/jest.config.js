/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "jsdom",
  testMatch: ["**/?(*.)+(test).[tj]s?(x)"],
  testPathIgnorePatterns: ["/node_modules/", "\\.spec\\.ts$"],
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
};
