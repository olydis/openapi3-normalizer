import { nodes, stringify } from "jsonpath";

export function resolve<T>($: T): void {
  for (const hit of nodes($, "$..*[?(@.$ref)]")) {
    const sourceRef: string = hit.value.$ref;
    const targetPath = stringify(hit.path);

    const sourceRefParts = sourceRef.split("/");
    if (!(sourceRefParts.shift() || "").startsWith("#")) {
      throw new Error("invalid syntax of local reference");
    }
    const sourceRefPartsDecoded = sourceRefParts.map(part => part.replace(/~1/g, "/").replace(/~0/g, "~"));
    const sourcePath = "$" + sourceRefPartsDecoded.map(part => `[${JSON.stringify(part)}]`).join("");
    eval(`${sourcePath}.$path = ${JSON.stringify(sourceRefPartsDecoded)}`);
    eval(`${targetPath} = ${sourcePath}`);
  }
}