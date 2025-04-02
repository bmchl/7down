import 'package:firebase_database/firebase_database.dart';

class MyDisconnectHandler {
  final DatabaseReference _userRef =
      FirebaseDatabase.instance.reference().child('users');

  void monitorDisconnect(String userId) {
    DatabaseReference userStatusRef =
        _userRef.child(userId).child('isLoggedIn');
    userStatusRef.onDisconnect().set(false).then((_) {
      print('Disconnected user $userId');
    }).catchError((error) {
      print('Error while disconnecting user, error: $error');
    });
  }
}
