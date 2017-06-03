import {
  ExternalDocumentationObject,
  HeaderObject,
  LinkObject,
  OpenAPIObject,
  ParameterObject,
  ResponseObject,
  ServerObject,
  ServerVariableObject,
  TagObject
} from "./types/OpenApi";

function throwEx(errorMessage?: string): never {
  throw new Error(errorMessage);
}

const httpMethods: ("get" | "put" | "post" | "delete" | "options" | "head" | "patch" | "trace")[]
  = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];

type Path = PathComponent[];
type PathComponent = PathComponentConstant | PathComponentParameter;
type PathComponentConstant = { type: "const", value: string };
type PathComponentParameter = { type: "param", name: string };


interface Header {
  name: string;
  description?: string;
  required: boolean;
  deprecated: boolean;
  locationQueryAllowEmptyValue?: boolean;
  content: any; // TODO
}

interface Response {
  key: string;
  description?: string;
  headers: Header[];
}

interface Parameter extends Header {
  location: "query" | "header" | "path" | "cookie";
}

interface Server {
  urlPrefix: Path;
  description?: string;
  variables: { [name: string]: ServerVariableObject };
}

interface Method {
  urlSuffix: Path;
  tags: string[];
  summary?: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
  operationId?: string;
  responses: Response[];
  parameters: Parameter[];

  deprecated: boolean;

  servers: Server[];
}

export interface Model {
  operations: Method[];
  tags: TagObject[];
}

function parsePath(path: string): Path {
  const result: Path = [];
  const parts1 = path.split("{");
  result.push({ type: "const", value: parts1.shift() || "" });
  for (const part of parts1) {
    const parts2 = part.split("}");
    if (parts2.length !== 2) {
      throw new Error("invalid path format");
    }
    result.push({ type: "param", name: parts2.shift() || throwEx("empty parameter names not allowed") });
    result.push({ type: "const", value: parts2.shift() || "" });
  }
  return result.filter(x => x.type !== "const" || x.value !== "");
}

function parseServer(server: ServerObject): Server {
  return {
    urlPrefix: parsePath(server.url),
    description: server.description,
    variables: server.variables || {}
  };
}
function parseServers(servers?: ServerObject[]): Server[] | undefined {
  return servers ? servers.map(parseServer) : undefined;
}

interface MediaTypeObject {
  style: "form"
}

function parseParameter(parameter: ParameterObject): Parameter {
  // validate
  if (parameter.in !== "query" && parameter.allowEmptyValue !== undefined) throw new Error("allowEmptyValue only allowed on query parameters");
  if (parameter.in === "path" && !parameter.required) throw new Error("expected required=true on path parameter");

  // normalize
  const content: { [mediaType: string]: MediaTypeObject } = {};
  // TODO: handle style, explode, allowReserved, schema, example, examples, content

  return {
    name: parameter.name,
    location: parameter.in,
    description: parameter.description,
    required: parameter.required || false,
    deprecated: parameter.deprecated || false,
    locationQueryAllowEmptyValue: parameter.allowEmptyValue,
    content: content
  };
}
function parseParameters(parameters?: ParameterObject[]): Parameter[] | undefined {
  return parameters ? parameters.map(parseParameter) : undefined;
}

function getParameterKey(parameter: Parameter): string {
  return JSON.stringify([parameter.name, parameter.location]);
}

function checkParameters(parameter: Parameter[]): boolean {
  // check for uniqueness
  const keys = parameter.map(getParameterKey).sort();
  const unique = !keys.some((key, index) => index !== 0 && key === keys[index - 1]);

  return unique;
}

export function run(openapiDefinition: OpenAPIObject): Model {
  if (openapiDefinition.openapi !== "3.0.0") throw new Error("this modeler is for OpenAPI 3.0.0, found " + openapiDefinition.openapi);

  const result: Model = {
    operations: [],
    tags: openapiDefinition.tags || []
  };
  const servers = parseServers(openapiDefinition.servers) || [];
  if (servers.length === 0) servers.push({ urlPrefix: parsePath("/"), variables: {} });

  // info
  // TODO: openapiDefinition.info

  // security
  // TODO: openapiDefinition.security

  // externalDocs
  // TODO: openapiDefinition.externalDocs

  // types
  // TODO: openapiDefinition.components

  // operations
  for (const rawPath of Object.keys(openapiDefinition.paths)) {
    const path: Path = parsePath(rawPath);
    const pathObject = openapiDefinition.paths[rawPath];
    const pathSummary = pathObject.summary;
    const pathDescription = pathObject.description;
    const pathServers = parseServers(pathObject.servers) || servers;
    const pathParameters = parseParameters(pathObject.parameters as ParameterObject[]) || [];
    if (!checkParameters(pathParameters)) throw new Error("invalid path parameters");

    for (const httpMethod of httpMethods) {
      const operationObject = pathObject[httpMethod];
      if (operationObject) {
        const operationServers = parseServers(operationObject.servers) || pathServers;
        const operationParameters = parseParameters(operationObject.parameters as ParameterObject[]) || [];
        if (!checkParameters(pathParameters)) throw new Error("invalid operation parameters");

        // merge parameters
        const parameters = pathParameters.slice();
        for (const param of operationParameters) {
          // override?
          let found = false;
          for (let i = 0; i < parameters.length; ++i) {
            const paramTarget = parameters[i];
            if (getParameterKey(param) === getParameterKey(paramTarget)) {
              found = true;
              parameters[i] = param;
            }
          }

          // append
          if (!found) {
            parameters.push(param);
          }
        }

        // validate path parameters against urlSuffix
        const pathParams = parameters.filter(x => x.location === "path").map(x => x.name).sort();
        const pathParamsExpected = path.map(x => x.type === "param" ? x.name : null).filter(x => x !== null).sort();
        if (pathParams.length !== pathParamsExpected.length || !pathParams.every((x, i) => x === pathParamsExpected[i])) {
          throw new Error("path parameters mismatch");
        }

        // TODO: operationObject.requestBody?
        // TODO: operationObject.callbacks?
        // TODO: operationObject.security? (overrides toplevel one)

        // responses
        const responses: Response[] = [];
        const responseKeys = Object.keys(operationObject.responses);
        for (let responseKey of responseKeys) {
          const responseObject = operationObject.responses[responseKey] as ResponseObject;

          if (responseKey === "default") responseKey = "XXX";
          if (!responseKey.match(/^[0-9X]{3}$/)) throw new Error(`invalid HTTP status code pattern '${responseKey}'`);

          // headers
          const headers = responseObject.headers || {};
          const headerNames = Object.keys(headers);
          const headersAsParams = headerNames.map(name => {
            const param = headers[name] as ParameterObject;
            param.name = name;
            param.in = "header";
            const result = parseParameter(param);
            delete result.location; // implicitly "header"
            return result as Header;
          });

          // TODO:
          // responseObject.content

          // links
          const links = responseObject.links || {};
          const linkNames = Object.keys(links);
          // TODO

          responses.push({
            key: responseKey,
            description: responseObject.description,
            headers: headersAsParams
          });
        }
        // sort responses descending by significance
        responses.sort((a, b) => a.key.split("").filter(c => c === "X").length - b.key.split("").filter(c => c === "X").length);

        result.operations.push({
          urlSuffix: path,

          tags: operationObject.tags || [],
          summary: operationObject.summary || pathSummary,
          description: operationObject.description || pathDescription,
          externalDocs: operationObject.externalDocs,
          operationId: operationObject.operationId,
          parameters: parameters,
          responses: responses,
          deprecated: operationObject.deprecated || false,
          servers: operationServers
        });
      }
    }
  }


  return result;
}