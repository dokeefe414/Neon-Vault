export default [
  {
    files:['src/**/*.js','tests/**/*.js','playwright.config.js','sw.js'],
    languageOptions:{ecmaVersion:'latest',sourceType:'module'},
    rules:{
      'no-debugger':'error',
      'no-duplicate-imports':'error',
      'no-unused-vars':['warn',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}]
    }
  }
];
