// Laat Node de TypeScript-bestanden uit lib/ direct laden voor de tests: zonder extensie, met "@/" en zonder "server-only".
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(process.cwd() + "/").href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    const target = specifier.startsWith("@/") ? root + specifier.slice(2) : specifier;
    try {
      return nextResolve(target, context);
    } catch (error) {
      if (target.startsWith(".") || target.startsWith("file:")) return nextResolve(target + ".ts", context);
      throw error;
    }
  },
});
