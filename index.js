
module.exports = onSocket
module.exports.inject = inject

function read(n, socket, cb) {
  var buf = socket.read(n)
  if (buf) {
    return cb(buf)
  }

  socket.once('readable', read.bind(this, n, socket, cb))
}

function indexOf(buf, needle, index, max) {
  index = index || 0
  max = max || buf.length
  while (buf[index] !== needle) {
    index++
    if (index === max) return -1
  }
  return index
}

function onSocket(socket, cb) {
  var firstBuffer
    , buffers
    , length = 0

  read(6, socket, function (buf) {
    firstBuffer = buf
    if (!(buf[0] === 0x50 && // P
          buf[1] === 0x52 && // R
          buf[2] === 0x4F && // O
          buf[3] === 0x58 && // X
          buf[4] === 0x59 && // Y
          buf[5] === 0x20 )  // [space]
      ) {
      return failed()
    }

    more()
  })

  function more() {
    var buf = socket.read()
    if (!buf) return socket.once('readable', more)

    var end = indexOf(buf, 0x0A, 0, Math.min(buf.length, 102 - length))

    // LF not found
    if (!~end) {
      if (buffers) buffers.push(buf)
      else buffers = [ buf ]
      length += buf.length
      if (length < 102) socket.once('readable', more)
      else failed()
      return
    }

    // Concat if more than one buffer
    if (buffers) {
      buffers.push(buf)
      buf = Buffer.concat(buffers, length + buf.length)
    }

    end += length
    if (buf[end - 1] !== 0x0D) return failed()



    var parts = buf.slice(0, end - 1).toString().split(' ')
      , result = {}

    result.protocol = parts[0]
    if (parts[0] === 'TCP4' || parts[0] === 'TCP6') {
      result.source = { address: parts[1], port: parseInt(parts[3], 10) }
      result.dest = { address: parts[2], port: parseInt(parts[4], 10) }
    } else {
      result.data = parts.slice(1).join(' ')
    }

    socket.unshift(buf.slice(end + 1))
    cb(null, result)
  }

  function failed() {
    socket.unshift(firstBuffer)

    if (buffers) {
      for (var i = 0; i < buffers.length; i++) {
        socket.unshift(buffers[i])
      }
    }

    cb()
  }
}

function inject(server) {
  server.origEmit = server.emit
  server.emit = customEmit
}

function customEmit(type, arg) {
  switch (type) {
  case 'connection':
    onConnection(this, arg)
    return true

  case 'request':
  case 'connect':
  case 'upgrade':
  case 'checkContinue':
    onIncoming(arg)
    break
  }

  return this.origEmit.apply(this, arguments)
}

function onConnection(server, socket) {
  function onerror() {
    socket.destroy()
  }
  socket.on('error', onerror)

  onSocket(socket, function (err, proxyline) {
    if (err) return socket.emit('error', err)
    socket.proxyline = proxyline
    socket.removeListener('error', onerror)

    server.origEmit('connection', socket)
  })
}

function onIncoming(req) {
  if (req.socket.proxyline && req.socket.proxyline.source) {
    if (req.headers['x-forwarded-for']) {
      req.headers['x-forwarded-for'] += ',' + req.socket.proxyline.source.address
    } else {
      req.headers['x-forwarded-for'] = req.socket.proxyline.source.address
    }

    if (req.headers['x-forwarded-port']) {
      req.headers['x-forwarded-port'] += ',' + req.socket.proxyline.source.port
    } else {
      req.headers['x-forwarded-port'] = '' + req.socket.proxyline.source.port
    }

    if (req.headers['x-forwarded-proto']) {
      req.headers['x-forwarded-proto'] += ',' + 'https'
    } else {
      req.headers['x-forwarded-proto'] = 'https'
    }
  }
}
