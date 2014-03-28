var proxyline = require('../')
  , stream = require('stream')
  , assert = require('assert')
  , test = require('tap').test

function simple(body, obj) {
  var rest = body.slice(0, 6) === 'PROXY ' ? body.slice(body.indexOf('\r\n') + 2) : body

  test(body.trim().replace(/\r\n/g, '\\r\\n'), function (t) {
    var socket = new stream.PassThrough()

    proxyline(socket, function (err, info) {
      t.ifError(err)
      t.deepEqual(info, obj)

      var body = ''
      socket.on('data', function (chunk) {
        body += chunk.toString()
      })
      socket.on('end', function () {
        t.equal(body, rest)
        t.end()
      })
    })

    var i = 0
    function next() {
      if (i >= body.length) {
        socket.end()
      } else {
        socket.write('' + body[i++], 'utf8')
        process.nextTick(next)
      }
    }

    next()
  })
}

simple('PROXY TCP4 127.0.0.1 127.0.0.1 1337 1337\r\n'
  , { protocol: 'TCP4'
    , source:
      { address: '127.0.0.1'
      , port: 1337
      }
    , dest:
      { address: '127.0.0.1'
      , port: 1337
      }
    }
  )

simple('PROXY TCP4 255.255.255.255 255.255.255.255 65535 65535\r\n'
  , { protocol: 'TCP4'
    , source:
      { address: '255.255.255.255'
      , port: 65535
      }
    , dest:
      { address: '255.255.255.255'
      , port: 65535
      }
    }
  )

simple('PROXY TCP6 ffff:f...f:ffff ffff:f...f:ffff 65535 65535\r\n'
  , { protocol: 'TCP6'
    , source:
      { address: 'ffff:f...f:ffff'
      , port: 65535
      }
    , dest:
      { address: 'ffff:f...f:ffff'
      , port: 65535
      }
    }
  )

simple('PROXY UNKNOWN\r\n'
  , { protocol: 'UNKNOWN'
    , data: ''
    }
  )

simple('PROXY UNKNOWN 2001:0db8:85a3:0000:0000:8a2e:0370:7334 2001:0db8:85a3:0000:0000:8a2e:0370:7334 65535 65535\r\n'
  , { protocol: 'UNKNOWN'
    , data: '2001:0db8:85a3:0000:0000:8a2e:0370:7334 2001:0db8:85a3:0000:0000:8a2e:0370:7334 65535 65535'
    }
  )

simple('GET / HTTP/1.1\r\n'
  , undefined
  )

simple('PROXY TCP4 127.0.0.1 127.0.0.1 1337 1337\r\nGET / HTTP/1.1\r\nUser-Agent: test\r\n\r\nbody'
  , { protocol: 'TCP4'
    , source:
      { address: '127.0.0.1'
      , port: 1337
      }
    , dest:
      { address: '127.0.0.1'
      , port: 1337
      }
    }
  )
