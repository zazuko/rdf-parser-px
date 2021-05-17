const rdf = require('rdf-ext')
const ns = require('./namespaces')

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
  }

  isNamedNode () {
    return !this.datatype
  }

  value (indexOrRaw) {
    if (this.values) {
      return this.values[indexOrRaw]
    }

    if (this.decimals !== 0) {
      const valueStr = (parseInt(indexOrRaw) * this.decimalFactor).toFixed(this.decimals)

      return rdf.literal(valueStr, this.datatype)
    }

    return rdf.literal(indexOrRaw, this.datatype)
  }

  static forDimension ({ baseIRI, metadata, propertyIndex, title, values }) {
    const valueTerms = values.map((value, valueIndex) => {
      if (metadata.datatype) {
        return rdf.literal(value, rdf.namedNode(metadata.datatype))
      }

      return rdf.namedNode(new URL(`dimension/${propertyIndex}/${valueIndex}`, baseIRI))
    })

    return new Column({
      baseIRI,
      datatype: metadata.datatype,
      property: rdf.namedNode(new URL(`dimension/${propertyIndex}`, baseIRI)),
      title,
      values: valueTerms
    })
  }

  static forMeasure ({ baseIRI, decimals = 0, metadata, propertyIndex, title }) {
    let datatype = ns.xsd.decimal.value

    if (metadata.datatype) {
      datatype = metadata.datatype
    }

    return new Column({
      baseIRI,
      datatype,
      decimals,
      measure: true,
      property: rdf.namedNode(new URL(`measure/${propertyIndex}`, baseIRI)),
      title
    })
  }
}

module.exports = Column
