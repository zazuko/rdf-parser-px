const fetch = require('node-fetch')
const RdfPxParser = require('..')

async function main () {
  const url = 'https://www.pxweb.bfs.admin.ch/DownloadFile.aspx?file=px-x-0703030000_112'
  const pxStream = (await fetch(url)).body

  const columns = [{
    titles: 'Jahr',
    datatype: 'http://www.w3.org/2001/XMLSchema#gYear'
  }]
  const parser = new RdfPxParser({ baseIRI: 'http://example.org/pflanzungen/', columns })
  const quadStream = parser.import(pxStream)

  quadStream.on('data', quad => {
    console.log(quad.toString())
  })
}

main()
