import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    injection: "src/injection.ts",
    next: "src/next.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  platform: "neutral",
  target: "es2020",
  clean: true,
  splitting: false,
  sourcemap: true,
});
