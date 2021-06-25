const TermMap = require('@rdfjs/term-map')
const rdf = require('rdf-ext')
const ns = require('./namespaces')

const datatypeParsers = new TermMap([
  [ns.xsd.decimal, value => parseFloat(value)],
  [ns.xsd.double, value => parseFloat(value)]
])

function toNamedNode (value) {
  if (!value) {
    return null
  }

  return rdf.namedNode(value.value || value.toString())
}

class Column {
  constructor ({ baseIRI, datatype, decimals = 0, measure, property, title, values }) {
    this.baseIRI = baseIRI
    this.datatype = datatype
    this.decimals = decimals
    this.decimalFactor = 1.0 / Math.pow(10, decimals)
    this.measure = Boolean(measure)
    this.property = property
    this.title = title
    this.values = values
    this.min = undefined
    this.minValue = undefined
    this.max = undefined
    this.maxValue = undefined
  }

  isNamedNode () {
    return !this.datatype
  }

  value (indexOrRaw, { nullValue } = {}) {
    if (this.values) {
      return this.values[indexOrRaw]
    }

    if (typeof nullValue !== 'undefined' && indexOrRaw === nullValue) {
      return rdf.literal('', ns.cube.Undefined)
    }

    let valueStr = indexOrRaw

    if (this.decimals !== 0) {
      valueStr = (parseInt(indexOrRaw) * this.decimalFactor).toFixed(this.decimals)
    }

    const object = rdf.literal(valueStr, this.datatype)

    // update min/max value
    if (this.datatype && datatypeParsers.has(this.datatype)) {
      const datatypeParser = datatypeParsers.get(this.datatype)

      const value = datatypeParser(valueStr)

      if (typeof this.min === 'undefined') {
        this.min = object
        this.minValue = value
        this.max = object
        this.maxValue = value
      }

      if (value < this.minValue) {
        this.min = object
        this.minValue = value
      }

      if (value > this.maxValue) {
        this.max = object
        this.maxValue = value
      }
    }

    return object
  }

  static forDimension ({ baseIRI, metadata, propertyIndex, title, values }) {
    const valueTerms = values.map((value, valueIndex) => {
      if (metadata.datatype) {
        return rdf.literal(value, toNamedNode(metadata.datatype))
      }

      return rdf.namedNode(new URL(`dimension/${propertyIndex}/${valueIndex}`, baseIRI).toString())
    })

    return new Column({
      baseIRI,
      datatype: toNamedNode(metadata.datatype),
      property: rdf.namedNode(new URL(`dimension/${propertyIndex}`, baseIRI).toString()),
      title,
      values: valueTerms
    })
  }

  static forMeasure ({ baseIRI, decimals = 0, metadata, propertyIndex, title }) {
    let datatype = ns.xsd.decimal

    if (metadata.datatype) {
      datatype = toNamedNode(metadata.datatype)
    }

    return new Column({
      baseIRI,
      datatype,
      decimals,
      measure: true,
      property: rdf.namedNode(new URL(`measure/${propertyIndex}`, baseIRI).toString()),
      title
    })
  }
}

module.exports = Column
