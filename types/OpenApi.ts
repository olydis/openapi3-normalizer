// Typed interfaces for OpenAPI 3.0.0-RC
// see https://github.com/OAI/OpenAPI-Specification/blob/3.0.0-rc0/versions/3.0.md

import { ISpecificationExtension } from "openapi3-ts";

export interface OpenAPIObject extends ISpecificationExtension {
  openapi: string;
  info: InfoObject;
  servers?: ServerObject[];
  paths: PathObject;
  components: ComponentsObject;
  security?: SecurityRequirementObject[];
  tags?: TagObject[];
  externalDocs?: ExternalDocumentationObject;
}
export interface InfoObject extends ISpecificationExtension {
  title: string;
  description?: string;
  termsOfService?: string;
  contact?: ContactObject;
  license?: LicenseObject;
  version?: string;
}
export interface ContactObject extends ISpecificationExtension {
  name: string;
  url: string;
  email: string;
}
export interface LicenseObject extends ISpecificationExtension {
  name: string;
  url: string;
}
export interface ServerObject extends ISpecificationExtension {
  url: string;
  description?: string;
  variables?: { [v: string]: ServerVariableObject };
}
export interface ServerVariableObject extends ISpecificationExtension {
  enum?: string[];
  default: string;
  description?: string;
}
export interface ComponentsObject extends ISpecificationExtension {
  schemas?: { [schema: string]: ISchemaObject };
  responses?: { [response: string]: ResponseObject };
  parameters?: { [parameter: string]: ParameterObject };
  examples?: { [example: string]: ExampleObject };
  requestBodies?: { [request: string]: RequestBodyObject };
  headers?: { [heaer: string]: HeaderObject };
  securitySchemes?: { [securityScheme: string]: SecuritySchemeObject };
  links?: { [link: string]: LinkObject };
  callbacks?: { [callback: string]: CallbackObject };
}
export interface PathObject extends ISpecificationExtension {
  [path: string]: PathItemObject;
}
export interface PathItemObject extends ISpecificationExtension {
  $ref?: string;
  summary?: string;
  description?: string;
  get?: OperationObject;
  put?: OperationObject;
  post?: OperationObject;
  delete?: OperationObject;
  options?: OperationObject;
  head?: OperationObject;
  patch?: OperationObject;
  trace?: OperationObject;
  servers?: ServerObject[];
  parameters?: (ParameterObject | ReferenceObject)[];
}
export interface OperationObject extends ISpecificationExtension {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
  operationId?: string;
  parameters?: (ParameterObject | ReferenceObject)[];
  requestBody?: (RequestBodyObject | ReferenceObject);
  responses: ResponsesObject;
  callbacks?: CallbacksObject;
  deprecated?: boolean;
  security?: SecurityRequirementObject[];
  servers?: ServerObject[];
}
export interface ExternalDocumentationObject extends ISpecificationExtension {
  url: string;
  description: string;
}
export interface ParameterObject extends ISpecificationExtension {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;

  style?: "matrix" | "label" | "form" | "simple" | "spaceDelimited" | "pipeDelimited" | "deepObject";
  explode?: boolean;
  allowReserved?: boolean;
  schema?: ISchemaObject | ReferenceObject;
  examples?: { [mediatype: string]: ExampleObject | ReferenceObject; };
  example?: any;
  content?: ContentObject;
}
export interface RequestBodyObject extends ISpecificationExtension {
  description?: string;
  content: ContentObject;
  required?: boolean;
}
export interface ContentObject {
  [mediatype: string]: MediaTypeObject;
}
export interface MediaTypeObject extends ISpecificationExtension {
  schema?: ISchemaObject | ReferenceObject;
  examples?: { [mediatype: string]: ExampleObject | ReferenceObject; };
  example?: ExampleObject | ReferenceObject;
  encoding?: EncodingObject;
}
export interface EncodingObject extends ISpecificationExtension {
  [property: string]: EncodingPropertyObject;
}
export interface EncodingPropertyObject {
  contentType?: string;
  headers?: { [name: string]: HeaderObject };
  style?: "matrix" | "label" | "form" | "simple" | "spaceDelimited" | "pipeDelimited" | "deepObject";
  explode?: boolean;
  allowReserved?: boolean;
}
export interface ResponsesObject extends ISpecificationExtension {
  default: ResponseObject | ReferenceObject;

  [statuscode: string]: ResponseObject | ReferenceObject;
}
export interface ResponseObject extends ISpecificationExtension {
  description?: string;
  headers?: HeadersObject;
  content?: ContentObject;
  links?: LinksObject;
}
export interface CallbacksObject extends ISpecificationExtension {
  [name: string]: CallbackObject | ReferenceObject;
}
export interface CallbackObject extends ISpecificationExtension {
  [name: string]: PathItemObject;
}
export interface HeadersObject {
  [name: string]: HeaderObject | ReferenceObject;
}
export interface ExampleObject {
  summary?: string;
  description?: string;
  value: any;
  externalValue?: string;
}
export interface LinksObject {
  [name: string]: LinkObject | ReferenceObject;
}
export interface LinkObject extends ISpecificationExtension {
  href?: string;
  operationId?: string;
  parameters?: LinkParametersObject;
  headers?: HeadersObject;
  description?: string;
}
export interface LinkParametersObject {
  [name: string]: any;
}
export interface HeaderObject extends ParameterObject {
}
export interface TagObject extends ISpecificationExtension {
  name: string;
  description: string;
  externalDocs?: ExternalDocumentationObject;
}
export interface ExamplesObject {
  [name: string]: any;
}
export interface ReferenceObject {
  $ref: string;
}
export interface ISchemaObject extends ISpecificationExtension {
  nullable?: boolean;
  discriminator?: { propertyName: string; mapping?: { [discriminatorValue: string]: string } };
  readOnly?: boolean;
  writeOnly?: boolean;
  xml?: XmlObject;
  externalDocs?: ExternalDocumentationObject;
  example?: any;
  examples?: any[];
  deprecated?: boolean;

  type?: string;
  allOf?: (ISchemaObject | ReferenceObject)[];
  oneOf?: (ISchemaObject | ReferenceObject)[];
  anyOf?: (ISchemaObject | ReferenceObject)[];
  not?: (ISchemaObject | ReferenceObject);
  items?: ISchemaObject | ReferenceObject;
  properties?: { [name: string]: ISchemaObject | ReferenceObject };
  additionalProperties?: boolean | ISchemaObject | ReferenceObject;
  description?: string;
  format?: string;
  default?: any;

  title?: string;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  enum?: any[];
}

export interface XmlObject extends ISpecificationExtension {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
}
export type SecuritySchemeObject = SecuritySchemeObjectApiKey | SecuritySchemeObjectHttp | SecuritySchemeObjectOAuth2 | SecuritySchemeObjectOpenIdConnect;
export interface SecuritySchemeObjectApiKey extends ISpecificationExtension {
  type: "apiKey";
  description?: string;
  name?: string;
  in?: string;
}
export interface SecuritySchemeObjectHttp extends ISpecificationExtension {
  type: "http";
  description?: string;
  scheme?: string;
  bearerFormat?: string;
}
export interface SecuritySchemeObjectOAuth2 extends ISpecificationExtension {
  type: "oauth2";
  description?: string;
  flow?: OAuthFlowObject;
}
export interface SecuritySchemeObjectOpenIdConnect extends ISpecificationExtension {
  type: "openIdConnect";
  description?: string;
  openIdConnectUrl?: string;
}
export interface OAuthFlowsObject extends ISpecificationExtension {
  implicit: OAuthFlowObject;
  password: OAuthFlowObject;
  clientCredentials: OAuthFlowObject;
  authorizationCode: OAuthFlowObject;
}
export interface OAuthFlowObject extends ISpecificationExtension {
  authorizationUrl: string;
  tokenUrl: string;
  refreshUrl: string;
  scopes: ScopesObject;
}
export interface ScopesObject extends ISpecificationExtension {
  [scope: string]: string;
}
export interface SecurityRequirementObject {
  [name: string]: string[];
}
