var net = require('net')
  , proxyline = require('./')

var counter = 0

var server = net.createServer(function (socket) {
  proxyline(socket, function (err, info) {
    console.log('info', info)

    if (--counter) return
    server.close()
  })
})

server.listen(function () {
  var port = server.address().port
    , socket

  counter++
  socket = net.connect(port)
  socket.end('PROXY TCP4 255.255.255.255 255.255.255.255 65535 65535\r\n')

  counter++
  socket = net.connect(port)
  socket.end('PROXY TCP6 ffff:f...f:ffff ffff:f...f:ffff 65535 65535\r\n')

  counter++
  socket = net.connect(port)
  socket.end('PROXY UNKNOWN\r\n')

  counter++
  socket = net.connect(port)
  socket.end('PROXY UNKNOWN 2001:0db8:85a3:0000:0000:8a2e:0370:7334 2001:0db8:85a3:0000:0000:8a2e:0370:7334 65535 65535\r\n')
})
