import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutterapp/screens/Account.dart';
import 'package:flutterapp/screens/login.dart';

class AuthenticationWrapper extends StatelessWidget {
  final Widget child;
  const AuthenticationWrapper({super.key, this.child = const AccountPage()});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(),
            ),
          );
        } else if (snapshot.hasData) {
          // Now specifying exactly which 'Home' we're referring to
          return child;
        } else {
          return const Login();
        }
      },
    );
  }
}
