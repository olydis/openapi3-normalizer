import { OpenAPIObject, ParameterObject, ServerObject, ServerVariableObject } from './types/OpenApi';

function throwEx(errorMessage?: string): never {
  throw new Error(errorMessage);
}

const httpMethods: ("get" | "put" | "post" | "delete" | "options" | "head" | "patch" | "trace")[]
  = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];

type Path = PathComponent[];
type PathComponent = PathComponentConstant | PathComponentParameter;
type PathComponentConstant = { type: "const", value: string };
type PathComponentParameter = { type: "param", name: string };



interface Parameter {
  name: string;
  location: "query" | "header" | "path" | "cookie";
  description?: string;
  required: boolean;
  deprecated: boolean;
  locationQueryAllowEmptyValue?: boolean;
  content: any; // TODO
}

interface Server {
  urlPrefix: Path;
  description?: string;
  variables: { [name: string]: ServerVariableObject };
}

interface Method {
  servers: Server[];
  urlSuffix: Path;
  parameters: Parameter[];
}

export interface Model {
  operations: Method[];
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
    operations: []
  };
  const servers = parseServers(openapiDefinition.servers) || [];
  if (servers.length === 0) servers.push({ urlPrefix: parsePath("/"), variables: {} });

  // security
  // TODO: openapiDefinition.security

  // tags
  // TODO: openapiDefinition.tags

  // externalDocs
  // TODO: openapiDefinition.externalDocs

  // types
  // TODO: openapiDefinition.components

  // operations
  for (const rawPath of Object.keys(openapiDefinition.paths)) {
    const path: Path = parsePath(rawPath);
    const pathObject = openapiDefinition.paths[rawPath];
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

        result.operations.push({
          urlSuffix: path,
          servers: operationServers,
          parameters: parameters
        });
      }
    }
  }


  return result;
}