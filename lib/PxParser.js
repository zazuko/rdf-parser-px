const iconv = require('iconv-lite')
const { Readable } = require('readable-stream')

class PxParser extends Readable {
  constructor ({ encoding } = {}) {
    super({ objectMode: true, read: () => {} })

    this.raw = null
    this.encoding = encoding
    this.content = null
    this.offset = 0

    this.nextPair()
  }

  import (raw) {
    this.raw = raw
    this.content = iconv.decode(this.raw, this.encoding || 'ascii')

    while (this.state !== PxParser.state.END && this.content) {
      this.parse()
    }

    this.push(null)
  }

  readToken (regex) {
    const result = this.content.match(regex)

    if (!result) {
      return null
    }

    const [match, value] = result

    this.content = this.content.slice(match.length)
    this.offset += match.length

    return value
  }

  readKey () {
    const key = this.readToken(PxParser.token.KEY)

    if (!key) {
      return
    }

    const [, keyword, , language, , subkey] = key.match(PxParser.token.KEY_PARTS)

    this.keyword = keyword
    this.language = language || ''
    this.subkey = subkey || ''

    this.state = this.keyword === 'DATA' ? PxParser.state.DATA_VALUE : PxParser.state.VALUES
  }

  readValues () {
    if (this.isEnd()) {
      this.pushPair()

      return
    }

    const isList = this.readToken(PxParser.token.LIST)
    const isQuotedValueStart = this.readToken(PxParser.token.QUOTED_VALUE_START)

    if (isQuotedValueStart) {
      this.state = isList ? PxParser.state.QUOTED_VALUE : PxParser.state.QUOTED_VALUE_CHUNK
    } else {
      this.state = isList ? PxParser.state.UNQUOTED_VALUE : PxParser.state.UNQUOTED_VALUE_CHUNK
    }
  }

  readQuotedValueChunk () {
    const value = this.readToken(PxParser.token.QUOTED_VALUE)

    if (value === null) {
      return
    }

    if (this.values.length === 0) {
      this.values.push('')
    }

    this.values[this.values.length - 1] += value

    this.state = PxParser.state.VALUES
  }

  readUnquotedValueChunk () {
    const value = this.readToken(PxParser.token.UNQUOTED_VALUE)

    if (value === null) {
      return
    }

    if (this.values.length === 0) {
      this.values.push('')
    }

    this.values[this.values.length - 1] += value

    this.state = PxParser.state.VALUES
  }

  readQuotedValueItem () {
    const value = this.readToken(PxParser.token.QUOTED_VALUE)

    if (value === null) {
      return
    }

    this.values.push(value)

    this.state = PxParser.state.VALUES
  }

  readUnquotedValueItem () {
    const value = this.readToken(PxParser.token.UNQUOTED_VALUE)

    if (value === null) {
      return
    }

    this.values.push(value)

    this.state = PxParser.state.VALUES
  }

  readDataValue () {
    const value = this.readToken(PxParser.token.QUOTED_DATA_VALUE) || this.readToken(PxParser.token.UNQUOTED_DATA_VALUE)

    if (value) {
      this.values.push(value)
    }

    if (this.isEnd()) {
      this.pushPair()

      this.state = PxParser.state.END
    }
  }

  isEnd () {
    return Boolean(this.readToken(PxParser.token.END))
  }

  parse () {
    switch (this.state) {
      case PxParser.state.KEY:
        this.readKey()
        break

      case PxParser.state.VALUES:
        this.readValues()
        break

      case PxParser.state.QUOTED_VALUE_CHUNK:
        this.readQuotedValueChunk()
        break

      case PxParser.state.UNQUOTED_VALUE_CHUNK:
        this.readUnquotedValueChunk()
        break

      case PxParser.state.QUOTED_VALUE:
        this.readQuotedValueItem()
        break

      case PxParser.state.UNQUOTED_VALUE:
        this.readUnquotedValueItem()
        break

      case PxParser.state.DATA_VALUE:
        this.readDataValue()
        break
    }
  }

  pushPair () {
    // change the encoding if the current keyword is "CODEPAGE"
    if (this.keyword === 'CODEPAGE') {
      // throw an error if the encoding argument is given and it doesn't match the codepage
      // because a non-default encoding may lead to wrong offsets
      if (this.encoding && this.values[0] !== this.encoding) {
        throw new Error(`The codepage defined in the PX data is different to the given one (px: "${this.values[0]}", arg: "${this.encoding}")`)
      }

      this.content = iconv.decode(this.raw.slice(this.offset), this.values[0])
    }

    this.push({
      keyword: this.keyword,
      language: this.language,
      subkey: this.subkey,
      values: this.values
    })

    this.nextPair()
  }

  nextPair () {
    this.state = PxParser.state.KEY
    this.keyword = null
    this.language = null
    this.subkey = null
    this.values = []
  }
}

PxParser.state = {
  KEY: 1,
  VALUES: 2,
  QUOTED_VALUE_CHUNK: 3,
  UNQUOTED_VALUE_CHUNK: 4,
  QUOTED_VALUE: 5,
  UNQUOTED_VALUE: 6,
  DATA_VALUE: 7,
  END: 10000
}

PxParser.token = {
  KEY: /^([^=]*)=/,
  KEY_PARTS: /([^[;^("]*)(\[([^\]]*)\])?(\("([^"]*)"\))?/,
  LIST: /^[\s]*(,)[\s]*/,
  QUOTED_VALUE_START: /^[\s]*(")/,
  QUOTED_VALUE: /^([^"]*)"/,
  UNQUOTED_VALUE: /^[\s]*([^;]*)/,
  QUOTED_DATA_VALUE: /^"([^\s^"^;]*)"[\s]*/,
  UNQUOTED_DATA_VALUE: /^([^\s^;]*)[\s]*/,
  END: /^(;)[\s]*/
}

module.exports = PxParser
