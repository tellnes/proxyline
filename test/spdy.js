var spdy = require('spdy')
  , net = require('net')
  , proxyline = require('../')
  , test = require('tap').test

test('call socket.ondata - with proxyline', function (t) {
  var server = spdy.createServer({ plain: true, ssl: false }, function (req, res) {
    t.deepEqual(
      req.socket.proxyline
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

    t.equal(req.method, 'GET')
    t.equal(req.url, '/')

    server.close()

    t.end()
  })

  proxyline.inject(server)

  server.listen(function () {
    var port = server.address().port

    var socket = net.connect(port)
    socket.write('PROXY TCP4 127.0.0.1 127.0.0.1 1337 1337\r\nGET / HTTP/1.1\r\n\r\n')
    socket.end()
  })
})

test('call socket.ondata - without proxyline', function (t) {
  var server = spdy.createServer({ plain: true, ssl: false }, function (req, res) {
    t.equal(req.socket.proxyline, undefined)

    t.equal(req.method, 'GET')
    t.equal(req.url, '/')

    server.close()

    t.end()
  })

  proxyline.inject(server)

  server.listen(function () {
    var port = server.address().port

    var socket = net.connect(port)
    socket.write('GET / HTTP/1.1\r\n\r\n')
    socket.end()
  })
})
