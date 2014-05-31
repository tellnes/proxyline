var proxyline = require('../')
  , stream = require('stream')
  , assert = require('assert')
  , test = require('tap').test

test('early readable', function (t) {
  var socket = new stream.PassThrough()

  proxyline(socket, function (err, info) {
    t.ifError(err)
    t.end()
  })

  // I dont know whats cusing this, but I'm seeing this
  socket.emit('readable')

  socket.write('GET / HTTP1.1\r\n')
  socket.end()
})
