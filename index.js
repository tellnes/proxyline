
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

  socket.on('readable', onReadable)

  var buffers
    , length = 0
    , state = 1
    , cut = 0

  function read(start, end) {
    var buf

    if (!end || length < end - start) {
      buf = socket.read()

      if (buffers) {
        if (Array.isArray(buffers)) buffers.push(buf)
        else buffers = [ buffers, buf ]
      } else buffers = buf
      length += buf.length

      if (length < end - start) return null
    }

    if (Array.isArray(buffers)) {
      buffers = Buffer.concat(buffers, length)
    }

    return buffers.slice(start, end)
  }

  function onReadable(noRead) {
    var buf

    switch (state) {
    case 1:
      buf = read(0, 6)
      if (!buf) return

      if (!(buf[0] === 0x50 && // P
            buf[1] === 0x52 && // R
            buf[2] === 0x4F && // O
            buf[3] === 0x58 && // X
            buf[4] === 0x59 && // Y
            buf[5] === 0x20 )  // [space]
        ) {
        return finish()
        }
      state = 2
      onReadable(true)
      break

    case 2:
      if (noRead) {
        if (Array.isArray(buffers)) {
          buffers = Buffer.concat(buffers, length)
        }
        buf = buffers
      } else {
        buf = read(0)
      }
      if (!buf) return // wait for more

      var end = indexOf(buf, 0x0A, 5, buf.length)
      if (!~end) return // wait for more

      end -= 1
      if (buf[end] !== 0x0D) return finish()

      var parts = buf.slice(6, end).toString().split(' ')
        , result = {}

      result.protocol = parts[0]
      if (parts[0] === 'TCP4' || parts[0] === 'TCP6') {
        result.source = { address: parts[1], port: parseInt(parts[3], 10) }
        result.dest = { address: parts[2], port: parseInt(parts[4], 10) }
      } else {
        result.data = parts.slice(1).join(' ')
      }

      cut = end + 2
      finish(null, result)
      break
    }
  }

  function finish(err, result) {
    socket.removeListener('readable', onReadable)

    var buf

    if (cut < length) {
      buf = read(cut, length)
      if (buf) socket.unshift(buf)
    }

    buffers = null
    length = 0

    cb(err, result)

    if (buf) {
      if (socket.ondata) {
        buf = socket.read()
        if (buf) {
          socket.ondata(buf, 0, buf.length)
        }
      } else {
        socket.emit('readable')
      }
    }

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
