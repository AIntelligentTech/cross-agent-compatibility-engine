
import { ClaudeParser } from "./src/parsing/claude-parser.ts";
import { GeminiRenderer } from "./src/rendering/gemini-renderer.ts";

const claudeSkill = `---\nname: tool-test\ndescription: Test tool mapping to Gemini\nallowed-tools: ["Read", "Edit", "Bash", "Search"]\n---\n
Body content.
`;

const parser = new ClaudeParser();
const parseResult = parser.parse(claudeSkill);

if (!parseResult.success || !parseResult.spec) {
  console.error("Parse failed", parseResult.errors);
  process.exit(1);
}

const renderer = new GeminiRenderer();
const renderResult = renderer.render(parseResult.spec);

if (!renderResult.success) {
  console.error("Render failed", renderResult.errors);
  process.exit(1);
}

console.log("--- Rendered Gemini Content ---");
console.log(renderResult.content);

console.log("\n--- Conversion Report ---");
console.log(JSON.stringify(renderResult.report, null, 2));
