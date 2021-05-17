const clownface = require('clownface')
const rdf = require('rdf-ext')
const { Readable } = require('readable-stream')
const Metadata = require('./rdf/Metadata')
const ns = require('./rdf/namespaces')

class RdfBuilder extends Readable {
  constructor ({ baseIRI, columns = [] }) {
    super({
      objectMode: true,
      read: () => {}
    })

    this.baseIRI = baseIRI
    this.columns = columns
  }

  import (cube) {
    const cubeTerm = rdf.namedNode(this.baseIRI.endsWith('/') ? this.baseIRI.slice(0, -1) : this.baseIRI)
    const shapeTerm = rdf.namedNode(new URL('shape', this.baseIRI))
    const observationSetTerm = rdf.namedNode(new URL('observation/', this.baseIRI))

    const cubePtr = clownface({ dataset: rdf.dataset(), term: cubeTerm, factory: rdf })
    const metadata = new Metadata(cube, this.columns, this.baseIRI, cubePtr)

    cubePtr
      .addOut(ns.rdf.type, ns.cube.Cube)
      .addOut(ns.cube.observationConstraint, shapeTerm, shapePtr => {
        metadata.addProperties(shapePtr)
      })
      .addOut(ns.cube.observationSet, observationSetTerm, observationSetPtr => {
        observationSetPtr.addOut(ns.rdf.type, ns.cube.ObservationSet)
      })

    metadata.addLanguageValues('TITLE', ns.schema.name)
    metadata.addLanguageValues('DESCRIPTION', ns.schema.description)
    metadata.addLanguageValues('CONTACT', ns.schema.contactPoint)
    metadata.addLanguageValues('SOURCE', ns.schema.creator)
    metadata.addLanguageValues('UNITS', ns.schema.unitText)
    metadata.addLanguageValues('NOTE', ns.schema.comment)
    metadata.addLanguageValues('REFPERIOD', ns.schema.temporalCoverage)
    metadata.addValue('SUBJECT-CODE', ns.schema.identifier)
    metadata.addDateValue('CREATION-DATE', ns.schema.dateCreated)
    metadata.addDateValue('LAST-UPDATED', ns.schema.dateModified)

    for (const quad of cubePtr.dataset) {
      this.push(quad)
    }

    for (const observation of cube.observations()) {
      const observationTerm = rdf.namedNode(new URL(`observation/${observation.row}`, this.baseIRI))

      this.push(rdf.quad(observationSetTerm, ns.cube.observation, observationTerm))
      this.push(rdf.quad(observationTerm, ns.rdf.type, ns.cube.Observation))

      observation.dimensions.forEach(dimension => {
        const column = metadata.dimensionColumns[dimension.index]

        this.push(rdf.quad(observationTerm, column.property, column.value(dimension.value)))
      })

      observation.measures.forEach(measure => {
        const column = metadata.measureColumns[measure.index]

        this.push(rdf.quad(observationTerm, column.property, column.value(measure.value)))
      })
    }

    this.push(null)
  }
}

module.exports = RdfBuilder
