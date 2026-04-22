import 'package:socket_io_client/socket_io_client.dart' as io;
void main() {
  io.Socket socket = io.io('');
  socket.emitWithAck('test', 'data', ack: (data) {});
}
