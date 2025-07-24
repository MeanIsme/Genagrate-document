const path = require('path');
function extractMatches(content, regexes) {
  const deps = new Set();
  for (const regex of regexes) {
    let match;
    while ((match = regex.exec(content))) {
      for (let i = match.length - 1; i > 0; i--) {
        if (match[i]) {
          deps.add(match[i]);
          break;
        }
      }
    }
  }
  return Array.from(deps);
}
function analyzePhpDependencies(content) {
  const regexes = [
    /require(?:_once)?\s*\(?['"](.+?)['"]\)?/g,
    /include(?:_once)?\s*\(?['"](.+?)['"]\)?/g,
    /use\s+([\w\\]+)/g,
    /new\s+([A-Za-z_][\w\\]*)/g,
    /([A-Za-z_][\w]*)::/g,
  ];
  return extractMatches(content, regexes);
}
function analyzeJsDependencies(content) {
  const regexes = [
    /require\(['"](.+?)['"]\)/g,
    /import\s+.*?from\s+['"](.+?)['"]/g,
    /import\s+['"](.+?)['"]/g,
    /export\s+.*?from\s+['"](.+?)['"]/g,
  ];
  return extractMatches(content, regexes);
}
function analyzePythonDependencies(content) {
  const regexes = [/import\s+([\w\.]+)/g, /from\s+([\w\.]+)\s+import/g];
  return extractMatches(content, regexes);
}
function analyzeJavaDependencies(content) {
  const regexes = [
    /import\s+([\w\.]+);/g,
    /extends\s+([A-Za-z_][\w]*)/g,
    /implements\s+([A-Za-z_][\w, ]*)/g,
  ];
  return extractMatches(content, regexes);
}
function analyzeCsharpDependencies(content) {
  const regexes = [
    /using\s+([\w\.]+);/g,
    /namespace\s+([\w\.]+)/g,
    /:([A-Za-z_][\w]*)/g,
  ];
  return extractMatches(content, regexes);
}
function analyzeRubyDependencies(content) {
  const regexes = [
    /require(_relative)?\s+['"](.+?)['"]/g,
    /include\s+([A-Za-z_][\w]*)/g,
    /<\s*([A-Za-z_][\w]*)/g,
  ];
  return extractMatches(content, regexes);
}
const EXT_LANG_MAP = {
  ".php": "php",
  ".js": "js",
  ".ts": "ts",
  ".py": "python",
  ".java": "java",
  ".cs": "csharp",
  ".rb": "ruby",
  ".sql": "sql",
};
function analyzeDependencies(fileName, content) {
  const ext = path.extname(fileName).toLowerCase();
  const lang = EXT_LANG_MAP[ext] || "unknown";
  switch (lang) {
    case "php":
      return analyzePhpDependencies(content);
    case "js":
    case "ts":
      return analyzeJsDependencies(content);
    case "python":
      return analyzePythonDependencies(content);
    case "java":
      return analyzeJavaDependencies(content);
    case "csharp":
      return analyzeCsharpDependencies(content);
    case "ruby":
      return analyzeRubyDependencies(content);
    default:
      return [];
  }
}
module.exports = { analyzeDependencies }; 