import { resolve } from "./object-resolver";
import { run } from "./modeler";
import { safeDump, safeLoad } from "js-yaml";
import { Readable } from "stream";
import { OpenAPIObject } from "./types/openapi";
declare const require: any;
const getUri = require("get-uri");
const stripBom = require("strip-bom");
import * as promisify from "pify";

const getUriAsync: (uri: string) => Promise<Readable> = promisify(getUri);

/**
 * Loads a UTF8 string from given URI.
 */
export async function ReadUri(uri: string): Promise<string> {
  try {
    const readable = await getUriAsync(uri);

    const readAll = new Promise<string>(function (resolve, reject) {
      let result = "";
      readable.on("data", data => result += data.toString());
      readable.on("end", () => resolve(result));
      readable.on("error", err => reject(err));
    });

    let result = await readAll;
    // fix up UTF16le files
    if (result.charCodeAt(0) === 65533 && result.charCodeAt(1) === 65533) {
      result = Buffer.from(result.slice(2)).toString("utf16le");
    }
    return stripBom(result);
  } catch (e) {
    throw new Error(`Failed to load '${uri}' (${e})`);
  }
}


async function main() {
  try {
    const rawDef = await ReadUri("https://raw.githubusercontent.com/OAI/OpenAPI-Specification/OpenAPI.next/examples/v3.0/petstore-expanded.yaml");
    const def: OpenAPIObject = safeLoad(rawDef);
    // console.log(safeDump(def, { skipInvalid: true }));
    resolve(def);
    // console.log(safeDump(def, { skipInvalid: true }));
    const model = run(def);
    console.log(safeDump(model, { skipInvalid: true }));
  } catch (e) {
    console.error(e);
  }
}

main();
