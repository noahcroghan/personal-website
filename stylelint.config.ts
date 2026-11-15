import type { Config } from "stylelint";

export default {
  extends: ["stylelint-config-standard", "stylelint-config-recess-order"],
  ignoreFiles: ["dist/**"],
} satisfies Config;
