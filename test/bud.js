var proxyline = require('../')
  , stream = require('stream')
  , assert = require('assert')
  , test = require('tap').test

  function budSimple(body, obj) {
    var rest = body.slice(0, 4) === 'BUD ' ? body.slice(body.indexOf('BUD ') + 4) : body

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

budSimple('BUD {"family":"TCP4","bud":{"host":"127.0.0.1","port":8000},"peer":{"host":"127.0.0.1","port":49618,"cn":"agent2","dn":false}}\r\n'
  , { protocol: 'BUD', data: ['{"family":"TCP4","bud":{"host":"127.0.0.1","port":8000},"peer":{"host":"127.0.0.1","port":49618,"cn":"agent2","dn":false}}'] }
  )
