const namespace = require('@rdfjs/namespace')
const rdf = require('rdf-ext')

const ns = {
  cube: namespace('https://cube.link/', { factory: rdf }),
  rdf: namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#', { factory: rdf }),
  qudt: namespace('http://qudt.org/schema/qudt/', { factory: rdf }),
  schema: namespace('http://schema.org/', { factory: rdf }),
  sh: namespace('http://www.w3.org/ns/shacl#', { factory: rdf }),
  xsd: namespace('http://www.w3.org/2001/XMLSchema#', { factory: rdf })
}

module.exports = ns
