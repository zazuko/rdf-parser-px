#!/usr/bin/env node

const program = require('commander')
const fs = require('fs')
const { finished } = require('readable-stream')
const { promisify } = require('util')
const RdfPxParser = require('..')

program
  .option('-i, --input <filename>', 'input file')
  .option('-o, --output <filename>', 'output file')
  .option('-b, --base <iri>', 'base IRI')
  .option('-m, --metadata <filename>', 'column metadata')
  .option('-n, --null-value <value>', 'null value')
  .option('-e, --encoding <encoding>', 'encoding')

program.parse(process.argv)

async function main ({ base, encoding, input, output, metadata, nullValue }) {
  const columns = metadata ? JSON.parse((await promisify(fs.readFile)(metadata)).toString()) : []
  const inputStream = fs.createReadStream(input)
  const outputStream = fs.createWriteStream(output)

  const parser = new RdfPxParser({ baseIRI: base, columns, encoding, nullValue })
  const quadStream = parser.import(inputStream)

  quadStream.on('data', quad => {
    outputStream.write(quad.toString())
    outputStream.write('\n')
  })

  finished(quadStream, () => {
    outputStream.end()
  })

  try {
    await promisify(finished)(quadStream)
    await promisify(finished)(outputStream)
  } catch (err) {
    console.error(err)
  }
}

main(program)
