import {
  ContentObject,
  ExampleObject,
  ExternalDocumentationObject,
  HeaderObject,
  InfoObject,
  LinkObject,
  OpenAPIObject,
  ParameterObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
  SecurityRequirementObject,
  SecuritySchemeObject,
  ServerObject,
  ServerVariableObject,
  TagObject
} from './types/OpenApi';

function throwEx(errorMessage?: string): never {
  throw new Error(errorMessage);
}

const httpMethods: ("get" | "put" | "post" | "delete" | "options" | "head" | "patch" | "trace")[]
  = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];

type Path = PathComponent[];
type PathComponent = PathComponentConstant | PathComponentParameter;
type PathComponentConstant = { type: "const", value: string };
type PathComponentParameter = { type: "param", name: string };


interface Response {
  key: string;
  description?: string;
  headers: Header[];
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
  security: SecurityRequirementsAlternatives;
  servers: Server[];
}

interface SecurityRequirement {
  scheme: SecuritySchemeObject;
  scopes: string[];
}
type SecurityRequirements = SecurityRequirement[];
type SecurityRequirementsAlternatives = SecurityRequirements[];

export interface Model {
  info: InfoObject;
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

interface Schema {

}

interface Encoding {
  contentType: string;
  headers: Header[];
  format: Format;
  allowReserved: boolean;
}

interface MediaTypeContent {
  schema?: Schema;
  examples: { [mediatype: string]: ExampleObject };
  encoding: { [property: string]: Encoding };
}

interface Content {
  [mediatype: string]: MediaTypeContent;
}

interface ParameterCommonBase {
  description?: string;
  content: Content;
  required: boolean;
}

interface Format {
  style: "matrix" | "label" | "form" | "simple" | "spaceDelimited" | "pipeDelimited" | "deepObject";
  explode: boolean;
}

interface ParameterBase extends ParameterCommonBase {
  name: string;
  deprecated: boolean;
  format: Format;
}

interface Header extends ParameterBase { }

interface ParameterQuery extends ParameterBase {
  location: "query";
  allowEmptyValue: boolean;
  allowReserved: boolean;
}
interface ParameterHeader extends ParameterBase {
  location: "header";
}
interface ParameterPath extends ParameterBase {
  location: "path";
}
interface ParameterCookie extends ParameterBase {
  location: "cookie";
}
type Parameter = ParameterQuery | ParameterHeader | ParameterPath | ParameterCookie;

interface ParameterBody extends ParameterCommonBase { }

function normalizeExamples(obj: {
  examples?: { [mediatype: string]: ExampleObject | ReferenceObject; };
  example?: ExampleObject | ReferenceObject;
}): { [mediatype: string]: ExampleObject } {
  const examples: { [mediatype: string]: ExampleObject } = obj.examples as any /*no ReferenceObject*/ || {};
  if (obj.example) examples[""] = { value: obj.example };
  return examples;
}

function parseSchema(schema: SchemaObject): Schema {
  return schema; // TODO
}

function normalizeFormat(location: "query" | "header" | "path" | "cookie", obj: {
  style?: "matrix" | "label" | "form" | "simple" | "spaceDelimited" | "pipeDelimited" | "deepObject";
  explode?: boolean;
}): Format {
  const style = obj.style || ((location === "query" || location === "cookie") ? "form" : "simple");
  const explode = obj.explode || (style === "form");
  return {
    style: style,
    explode: explode
  }
}

function parseParameterBase(parameter: ParameterObject): ParameterBase {
  const location = parameter.in;

  // validate
  if (location === "path" && !parameter.required) throw new Error("expected required=true on path parameter");

  // normalize
  const style = parameter.style || ((location === "query" || location === "cookie") ? "form" : "simple");
  const explode = parameter.explode || (style === "form");
  const examples = normalizeExamples(parameter);
  const content: Content = parameter.content ? parseContent(parameter.content) : {};
  content[""] = { schema: parameter.schema ? parseSchema(parameter.schema) : undefined, examples: examples, encoding: {} };

  return {
    name: parameter.name,
    description: parameter.description,
    required: parameter.required || false,
    deprecated: parameter.deprecated || false,
    content: content,
    format: {
      style: style,
      explode: explode
    }
  };
}

function parseHeader(name: string, header: HeaderObject): Header {
  const param = header as ParameterObject;
  param.name = name;
  param.in = "header";
  return parseParameterBase(param);
}

function parseParameter(parameter: ParameterObject): Parameter {
  const location = parameter.in;
  const base: ParameterBase = parseParameterBase(parameter);

  switch (location) {
    case "query":
      return Object.assign(base, {
        location: location,
        allowEmptyValue: parameter.allowEmptyValue || false,
        allowReserved: parameter.allowReserved || false
      });
    case "header": return Object.assign(base, { location: location });
    case "path": return Object.assign(base, { location: location });
    case "cookie": return Object.assign(base, { location: location });
  }
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

function keys(o: any): string[] {
  return Object.keys(o).filter(x => true); // TODO
}

function parseSecurityRequirements(securitySchemes: { [securityScheme: string]: SecuritySchemeObject }, security?: SecurityRequirementObject[]): SecurityRequirementsAlternatives | undefined {
  const securityAlternatives: SecurityRequirementsAlternatives = [];
  if (!security) return undefined;
  for (const sec of security) {
    const security: SecurityRequirements = [];
    for (const name of keys(sec)) {
      const securityScheme = securitySchemes[name];
      if (!securityScheme) throw new Error(`security scheme '${name}' not found`);
      security.push({
        scheme: securityScheme,
        scopes: sec[name]
      });
    }
    securityAlternatives.push(security);
  }
  return securityAlternatives;
}

function parseContent(content: ContentObject): Content {
  const result: Content = {};
  for (const mediaType of keys(content)) {
    const contentObj = content[mediaType];
    result[mediaType] = {
      schema: parseSchema(contentObj.schema || {}),
      encoding: {}, // TODO
      examples: normalizeExamples(content)
    };
  }
  return result;
}

export function run(openapiDefinition: OpenAPIObject): Model {
  if (openapiDefinition.openapi !== "3.0.0") throw new Error("this modeler is for OpenAPI 3.0.0, found " + openapiDefinition.openapi);

  // security schemes
  const securitySchemes = openapiDefinition.components.securitySchemes || {};

  const result: Model = {
    operations: [],
    tags: openapiDefinition.tags || [],
    info: openapiDefinition.info
  };
  const servers = parseServers(openapiDefinition.servers) || [];
  if (servers.length === 0) servers.push({ urlPrefix: parsePath("/"), variables: {} });

  // security
  const security: SecurityRequirementsAlternatives = parseSecurityRequirements(securitySchemes, openapiDefinition.security) || [];

  // externalDocs
  // TODO: openapiDefinition.externalDocs

  // types
  // TODO: openapiDefinition.components

  // operations
  for (const rawPath of keys(openapiDefinition.paths)) {
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

        // request body
        let requestBody: ParameterBody | undefined = undefined;
        if (operationObject.requestBody) {
          requestBody = {
            description: (operationObject.requestBody as RequestBodyObject).description,
            content: parseContent((operationObject.requestBody as RequestBodyObject).content),
            required: (operationObject.requestBody as RequestBodyObject).required || false
          };
        }
        // TODO: operationObject.requestBody?
        // TODO: operationObject.callbacks?

        // security
        const operationSecurity = parseSecurityRequirements(securitySchemes, operationObject.security) || security;

        // responses
        const responses: Response[] = [];
        const responseKeys = keys(operationObject.responses);
        for (let responseKey of responseKeys) {
          const responseObject = operationObject.responses[responseKey] as ResponseObject;

          if (responseKey === "default") responseKey = "XXX";
          if (!responseKey.match(/^[0-9X]{3}$/)) throw new Error(`invalid HTTP status code pattern '${responseKey}'`);

          // headers
          const headers = responseObject.headers || {};
          const headerNames = keys(headers);
          const headersAsParams = headerNames.map(name => parseHeader(name, headers[name] as HeaderObject));

          // TODO:
          // responseObject.content

          // links
          const links = responseObject.links || {};
          const linkNames = keys(links);
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
          requestBody: requestBody,

          responses: responses,

          deprecated: operationObject.deprecated || false,
          security: operationSecurity,
          servers: operationServers
        });
      }
    }
  }


  return result;
}