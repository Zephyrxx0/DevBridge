/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "jsdom",
  testMatch: ["**/?(*.)+(test).[tj]s?(x)"],
  testPathIgnorePatterns: ["/node_modules/", "\\.spec\\.ts$"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
};
