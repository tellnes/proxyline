var proxyline = require('./')
  , net = require('net')

var server = net.createServer(function (socket) {
  socket.end(JSON.stringify(socket.proxyline))
})
proxyline.inject(server)
server.listen()
