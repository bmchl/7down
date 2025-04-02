import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutterapp/classes/environment.dart';
import 'package:flutterapp/services/firebase_service.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketClientService {
  IO.Socket? socket;
  String gameRoomId = DateTime.now().millisecondsSinceEpoch.toString();
  bool isConnecting = false;
  String id = '';

  bool isSocketAlive() {
    return socket != null && socket!.connected;
  }

  Future<void> connect() async {
    try {
      if (!isSocketAlive() && !isConnecting) {
        String uid = FirebaseAuth.instance.currentUser!.uid;
        String username = await FirebaseService.fetchUsername(uid);
        String profilePic = await FirebaseService.fetchProfilePic(uid);
        socket = IO.io(Environment.serverUrl, <String, dynamic>{
          'transports': ['websocket'],
          'upgrade': false,
          'autoConnect': false,
          'query': {
            'uid': uid,
            'username': username,
            'profilePic': profilePic,
          },
        });
        print("connecting...");
        isConnecting = true;
        socket?.onConnectError((data) => print("Socket Connect Error $data"));
        socket?.onError((data) => print("Socket Error $data"));
        socket
            ?.onConnectTimeout((data) => print("Socket Connect Timeout $data"));
        socket?.onConnect((_) {
          id = socket!.id!;
          isConnecting = false;
          print("connected with id: $id");
          isConnecting = false;
        });
        socket?.onDisconnect((_) {
          print("disconnected");
        });
        socket?.connect();
      }
    } catch (e) {
      print(e);
      isConnecting = false;
    }
  }

  void disconnect() {
    if (socket != null) {
      socket?.disconnect();
      socket = null;
    }
  }

  void removeAllListeners() {
    if (isSocketAlive()) socket?.clearListeners();
  }

  void on<T>(String event, Function(T) action) {
    socket?.on(event, (data) => action(data as T));
  }

  void off<T>(String event, Function(T) action) {
    socket?.off(event, (data) => action(data as T));
  }

  void send<T>(String event, [T? data]) {
    if (data != null) {
      socket?.emit(event, data);
    } else {
      socket?.emit(event);
    }
  }

  void dispose() {
    socket?.disconnect();
    socket?.clearListeners();
  }

  void emit(String s, Map<String, String> map) {}
}
