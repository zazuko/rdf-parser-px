const getStream = require('get-stream')
const PxCube = require('./lib/PxCube')
const PxParser = require('./lib/PxParser')
const RdfBuilder = require('./lib/RdfBuilder')

class RdfPxParser {
  constructor ({ ...options }) {
    this.options = options
  }

  import (stream) {
    const builder = new RdfBuilder({ ...this.options })
    const pxCube = new PxCube()

    Promise.resolve().then(async () => {
      try {
        const content = await getStream.buffer(stream)
        const parser = new PxParser({ ...this.options })

        parser.import(content)

        const pairs = await getStream.array(parser)

        pairs.forEach(pair => pxCube.addPair(pair))
        pxCube.finished()

        builder.import(pxCube)
      } catch (err) {
        builder.emit('error', err)
      }
    })

    return builder
  }
}

module.exports = RdfPxParser
