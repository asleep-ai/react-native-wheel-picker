// Exercise the packed package by its public name, outside the source tree and without source aliases.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const tarball = path.resolve(process.argv[2]);
const consumer = fs.mkdtempSync(path.join(root, ".consumer-"));
const unpacked = path.join(consumer, "node_modules/@asleep-ai/react-native-wheel-picker");
fs.mkdirSync(unpacked, { recursive: true });
execFileSync("tar", ["-xzf", tarball, "--strip-components=1", "-C", unpacked]);
fs.writeFileSync(
  path.join(consumer, "consumer.tsx"),
  `import { WheelPicker, TimePicker, alignRowHeight, type WheelPickerHandle, type TimePickerHandle, type Time24 } from "@asleep-ai/react-native-wheel-picker";
import { createRef } from "react";
const time: Time24 = {hour: 7, minute: 0};
export const wheel = <WheelPicker ref={createRef<WheelPickerHandle>()} items={["A", "B"]} selectedIndex={0} onSelect={() => {}} accessibilityLabel="Value" width={90} height={216} rowHeight={alignRowHeight(80)} />;
export const picker = <TimePicker ref={createRef<TimePickerHandle>()} value={time} onChange={() => {}} />;
`,
);
fs.writeFileSync(
  path.join(consumer, "tsconfig.json"),
  JSON.stringify({
    compilerOptions: {
      target: "ES2020",
      module: "Node16",
      moduleResolution: "node16",
      jsx: "react-jsx",
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      skipLibCheck: true,
      noEmit: true,
      esModuleInterop: true,
    },
    include: ["consumer.tsx"],
  }),
);
fs.writeFileSync(
  path.join(consumer, "consumer.test.cjs"),
  `const React = require("react");
const {render} = require("@testing-library/react-native");
const {WheelPicker, TimePicker, alignRowHeight} = require("@asleep-ai/react-native-wheel-picker");
it("imports the actual CommonJS tarball and renders its public API", async () => {
    expect(typeof TimePicker.render).toBe("function");
    expect(alignRowHeight(80, 2.625)).toBeGreaterThan(0);
    const view = await render(React.createElement(WheelPicker, {items:["A","B"], selectedIndex:0, onSelect:jest.fn(), accessibilityLabel:"Packed value", width:90, height:216, rowHeight:80}));
    expect(view.getByRole("adjustable", {name:"Packed value"})).toBeTruthy();
});`,
);
const config = {
  rootDir: consumer,
  preset: "@react-native/jest-preset",
  testMatch: ["**/consumer.test.cjs"],
  transform: {
    "^.+\\.[jt]sx?$": [require.resolve("babel-jest"), { presets: [require.resolve("@react-native/babel-preset")] }],
  },
};
fs.writeFileSync(path.join(consumer, "jest.config.json"), JSON.stringify(config));
execFileSync(path.join(root, "node_modules/.bin/tsc"), ["-p", path.join(consumer, "tsconfig.json")], {
  stdio: "inherit",
});
execFileSync(
  path.join(root, "node_modules/.bin/jest"),
  ["--config", path.join(consumer, "jest.config.json"), "--runInBand"],
  { stdio: "inherit" },
);
console.log(`Consumer evidence retained at ${consumer}`);
