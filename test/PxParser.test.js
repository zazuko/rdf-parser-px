const { deepStrictEqual, strictEqual } = require('assert')
const getStream = require('get-stream')
const { describe, it } = require('mocha')
const PxParser = require('../lib/PxParser')

describe('PxParser', () => {
  it('should be a constructor', () => {
    strictEqual(typeof PxParser, 'function')
  })

  describe('import', () => {
    it('should be a method', () => {
      const parser = new PxParser()

      strictEqual(typeof parser.import, 'function')
    })

    it('should parse the key', async () => {
      const parser = new PxParser()

      parser.import(Buffer.from('KEY=VALUE;'))

      const pairs = await getStream.array(parser)

      strictEqual(pairs.length, 1)
      strictEqual(pairs[0].keyword, 'KEY')
      strictEqual(pairs[0].subkey, '')
      strictEqual(pairs[0].language, '')
    })

    it('should parse the subkey', async () => {
      const parser = new PxParser()

      parser.import(Buffer.from('KEY("SUBKEY")=VALUE;'))

      const pairs = await getStream.array(parser)

      strictEqual(pairs.length, 1)
      strictEqual(pairs[0].keyword, 'KEY')
      strictEqual(pairs[0].subkey, 'SUBKEY')
      strictEqual(pairs[0].language, '')
    })

    it('should parse the language', async () => {
      const parser = new PxParser()

      parser.import(Buffer.from('KEY[de]=VALUE;'))

      const pairs = await getStream.array(parser)

      strictEqual(pairs.length, 1)
      strictEqual(pairs[0].keyword, 'KEY')
      strictEqual(pairs[0].subkey, '')
      strictEqual(pairs[0].language, 'de')
    })

    it('should parse the subkey and language', async () => {
      const parser = new PxParser()

      parser.import(Buffer.from('KEY[de]("SUBKEY")=VALUE;'))

      const pairs = await getStream.array(parser)

      strictEqual(pairs.length, 1)
      strictEqual(pairs[0].keyword, 'KEY')
      strictEqual(pairs[0].subkey, 'SUBKEY')
      strictEqual(pairs[0].language, 'de')
    })

    it('should parse a value', async () => {
      const parser = new PxParser()

      parser.import(Buffer.from('KEY=VALUE;'))

      const pairs = await getStream.array(parser)

      strictEqual(pairs.length, 1)
      deepStrictEqual(pairs[0].values, ['VALUE'])
    })

    it('should parse a quoted value', async () => {
      const parser = new PxParser()

      parser.import(Buffer.from('KEY="VALUE";'))

      const pairs = await getStream.array(parser)

      strictEqual(pairs.length, 1)
      deepStrictEqual(pairs[0].values, ['VALUE'])
    })

    it('should parse a quoted value that contains a semicolon', async () => {
      const parser = new PxParser()

      parser.import(Buffer.from('KEY="VALUE;ABC";'))

      const pairs = await getStream.array(parser)

      strictEqual(pairs.length, 1)
      deepStrictEqual(pairs[0].values, ['VALUE;ABC'])
    })

    it('should parse multiple values', async () => {
      const parser = new PxParser()

      parser.import(Buffer.from('KEY="VALUE A","VALUE B";'))

      const pairs = await getStream.array(parser)

      strictEqual(pairs.length, 1)
      deepStrictEqual(pairs[0].values, ['VALUE A', 'VALUE B'])
    })

    it('should parse multi quoted value', async () => {
      const parser = new PxParser()

      parser.import(Buffer.from('KEY="VALUE "\n"A";'))

      const pairs = await getStream.array(parser)

      strictEqual(pairs.length, 1)
      deepStrictEqual(pairs[0].values, ['VALUE A'])
    })

    it('should parse multiple pairs', async () => {
      const parser = new PxParser()

      parser.import(Buffer.from('KEY_A="B "\n"C";\nKEY_D[de]("SUBKEY_E")="F",G;'))

      const pairs = await getStream.array(parser)

      strictEqual(pairs.length, 2)
      strictEqual(pairs[0].keyword, 'KEY_A')
      strictEqual(pairs[0].subkey, '')
      strictEqual(pairs[0].language, '')
      deepStrictEqual(pairs[0].values, ['B C'])

      strictEqual(pairs[1].keyword, 'KEY_D')
      strictEqual(pairs[1].subkey, 'SUBKEY_E')
      strictEqual(pairs[1].language, 'de')
      deepStrictEqual(pairs[1].values, ['F', 'G'])
    })

    it('should split DATA values separated by space', async () => {
      const parser = new PxParser()

      parser.import(Buffer.from('DATA=1 2 3;'))

      const pairs = await getStream.array(parser)

      strictEqual(pairs.length, 1)
      deepStrictEqual(pairs[0].values, ['1', '2', '3'])
    })

    it('should split DATA values separated by line breaks', async () => {
      const parser = new PxParser()

      parser.import(Buffer.from('DATA=1\n2\n3;'))

      const pairs = await getStream.array(parser)

      strictEqual(pairs.length, 1)
      deepStrictEqual(pairs[0].values, ['1', '2', '3'])
    })

    it('should support quoted DATA values', async () => {
      const parser = new PxParser()

      parser.import(Buffer.from('DATA="1" "2" "3";'))

      const pairs = await getStream.array(parser)

      strictEqual(pairs.length, 1)
      deepStrictEqual(pairs[0].values, ['1', '2', '3'])
    })
  })
})
