const { DateTime } = require('luxon')
const rdf = require('rdf-ext')
const Column = require('./Column')
const ns = require('./namespaces')

class Metadata {
  constructor ({ baseIRI, columns, cube, observer, pxCube }) {
    this.baseIRI = baseIRI
    this.columns = columns
    this.cube = cube
    this.observer = observer
    this.pxCube = pxCube

    this.defaultLanguage = pxCube.defaultLanguage()
    this.buildColumns()
  }

  buildColumns () {
    this.dimensionColumns = this.pxCube.dimensionProperties().map((property, propertyIndex) => {
      const metadata = this.columns.find(column => column.titles === property.title) || {}

      return Column.forDimension({
        baseIRI: this.baseIRI,
        metadata,
        propertyIndex,
        title: property.title,
        values: property.values[this.defaultLanguage]
      })
    })

    this.measureColumns = this.pxCube.measureProperties().map((property, propertyIndex) => {
      const metadata = this.columns.find(column => column.titles === property.title) || {}

      return Column.forMeasure({
        baseIRI: this.baseIRI,
        metadata,
        propertyIndex,
        title: property.title,
        values: property.values[this.defaultLanguage]
      })
    })
  }

  addValue (key, predicate) {
    const value = this.pxCube.value(key)

    if (value) {
      this.cube.addOut(predicate, rdf.literal(value.values[0]))
    }
  }

  addDateValue (key, predicate) {
    const dateValue = this.pxCube.value(key)

    if (dateValue) {
      const value = DateTime.fromFormat(dateValue.values[0], 'yyyyMMdd mm:ss').toISO()

      this.cube.addOut(predicate, rdf.literal(value, ns.xsd.dateTime))
    }
  }

  addLanguageValues (key, predicate) {
    this.pxCube.values(key).forEach(value => {
      this.cube.addOut(predicate, rdf.literal(value.values[0], value.language || this.defaultLanguage))
    })
  }

  addProperties (shapePtr) {
    const columns = [...this.dimensionColumns, ...this.measureColumns]

    shapePtr
      .addOut(ns.rdf.type, ns.sh.NodeShape)
      .addOut(ns.rdf.type, ns.cube.Constraint)
      .addOut(ns.sh.closed, rdf.literal('true', ns.xsd.boolean))

    this.addProperty({ shapePtr, columns, path: ns.rdf.type, type: ns.sh.IRI, valueKeys: [ns.cube.Observation] })

    if (this.observer) {
      this.addProperty({ shapePtr, columns, path: ns.cube.observedBy, type: ns.sh.IRI, valueKeys: [this.observer] })
    }

    this.pxCube.dimensionProperties().forEach(property => {
      this.addColumnProperty({ shapePtr, columns, ...property })
    })

    this.pxCube.measureProperties().forEach(property => {
      this.addColumnProperty({ shapePtr, columns, ...property })
    })
  }

  addProperty ({ shapePtr, path, type, datatype, measure, valueKeys, values = {}, min, max, labels = {} } = {}) {
    shapePtr.addOut(ns.sh.property, propertyPtr => {
      Object.entries(labels).forEach(([language, label]) => {
        propertyPtr.addOut(ns.schema.name, rdf.literal(label, language))
      })

      propertyPtr
        .addOut(ns.sh.path, path)
        .addOut(ns.sh.nodeKind, type)
        .addOut(ns.sh.minCount, rdf.literal('1', ns.xsd.integer))
        .addOut(ns.sh.maxCount, rdf.literal('1', ns.xsd.integer))

      if (datatype) {
        propertyPtr.addOut(ns.sh.datatype, datatype)
      }

      this.addPropertyValues({ propertyPtr, valueKeys, values })

      if (typeof min !== 'undefined') {
        propertyPtr.addOut(ns.sh.minInclusive, min)
      }

      if (typeof max !== 'undefined') {
        propertyPtr.addOut(ns.sh.maxInclusive, max)
      }

      if (measure === false) {
        propertyPtr.addOut(ns.qudt.scaleType, ns.qudt.NominalScale)
      }

      if (measure === true) {
        propertyPtr.addOut(ns.qudt.scaleType, ns.qudt.RatioScale)
      }
    })
  }

  addColumnProperty ({ shapePtr, columns, title, values = {}, labels = {} } = {}) {
    const column = columns.find(column => column.title === title)

    const path = column.property
    const type = column.isNamedNode() ? ns.sh.IRI : ns.sh.Literal
    const datatype = column.datatype
    const measure = column.measure
    const valueKeys = column.values
    const min = column.min
    const max = column.max

    this.addProperty({ shapePtr, path, type, datatype, measure, valueKeys, min, max, values, labels })
  }

  addPropertyValues ({ propertyPtr, valueKeys, values }) {
    if (!valueKeys) {
      return
    }

    propertyPtr.addList(ns.sh.in, valueKeys)

    // labels for named node property values
    for (const [language, labels] of Object.entries(values)) {
      labels.forEach((label, index) => {
        const term = valueKeys[index]

        if (term.termType === 'NamedNode') {
          propertyPtr.node(term).addOut(ns.schema.name, rdf.literal(label, language))
        }
      })
    }
  }
}

module.exports = Metadata
