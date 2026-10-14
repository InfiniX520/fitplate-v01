// Minimal TypeBox-shaped schema builders for this plugin's tool parameters.
//
// AGH validates tool arguments with TypeBox's own `Value` checker, which
// dispatches on the `Symbol.for('TypeBox.Kind')` tag on every schema node. The
// repository's own no-dependency examples hand-tag plain JSON Schema objects;
// this module does the same, so the installed snapshot needs no `@sinclair/typebox`
// dependency while the result is still a real TypeBox schema.
//
// The tags carry no runtime information beyond the kind name - the ordinary
// JSON Schema keywords next to them (`type`, `pattern`, `minimum`, ...) are what
// both TypeBox and Ajv (used for service schemas) read.

export const Kind = Symbol.for('TypeBox.Kind')

const node = (kind, fields) => ({ [Kind]: kind, ...fields })

export const object = (properties, { required = [], description } = {}) =>
  node('Object', {
    type: 'object',
    properties,
    ...(required.length ? { required } : {}),
    additionalProperties: false,
    ...(description ? { description } : {}),
  })

export const str = ({ pattern, minLength, maxLength, description } = {}) =>
  node('String', {
    type: 'string',
    ...(pattern ? { pattern } : {}),
    ...(minLength !== undefined ? { minLength } : {}),
    ...(maxLength !== undefined ? { maxLength } : {}),
    ...(description ? { description } : {}),
  })

export const num = ({ minimum, maximum, description } = {}) =>
  node('Number', {
    type: 'number',
    ...(minimum !== undefined ? { minimum } : {}),
    ...(maximum !== undefined ? { maximum } : {}),
    ...(description ? { description } : {}),
  })

export const int = ({ minimum, maximum, description } = {}) =>
  node('Integer', {
    type: 'integer',
    ...(minimum !== undefined ? { minimum } : {}),
    ...(maximum !== undefined ? { maximum } : {}),
    ...(description ? { description } : {}),
  })

export const bool = ({ description } = {}) =>
  node('Boolean', { type: 'boolean', ...(description ? { description } : {}) })

export const literal = (value, { description } = {}) =>
  node('Literal', { const: value, ...(description ? { description } : {}) })

export const array = (items, { minItems, maxItems, description } = {}) =>
  node('Array', {
    type: 'array',
    items,
    ...(minItems !== undefined ? { minItems } : {}),
    ...(maxItems !== undefined ? { maxItems } : {}),
    ...(description ? { description } : {}),
  })
