# proxyline

Parse the proxyline added by HAProxy, Stud, Bud and others.

## Usage

```js
var server = net.createServer(function (socket) {
  socket.end(JSON.stringify(socket.proxyline))
})
proxyline.inject(server)
server.listen()
```

## Install

    $ npm install proxyline

## License

MIT
